import { z } from "zod";

import type {
  AgentCritique,
  CritiqueInput,
  EvalResult,
  Iteration,
  PolicyChange,
} from "./types.js";

const policyChangeSchema = z.object({
  field: z.enum([
    "minCreditScore",
    "maxDebtToIncomeRatio",
    "minMonthlyCashFlow",
    "minBusinessAgeMonths",
    "minCollateralRatio",
    "manualReviewRule",
  ]),
  currentValue: z.union([z.number(), z.string()]),
  proposedValue: z.union([z.number(), z.string()]),
  reason: z.string().min(1),
});

const critiqueSchema = z.object({
  summary: z.string().min(1),
  patterns: z.array(z.string()),
  suggestedChanges: z.array(policyChangeSchema).max(4),
  safeguards: z.array(z.string()),
});

export type AgentOptions = {
  offline?: boolean;
  model?: string;
};

/**
 * Uses LlamaIndex only for critique. The deterministic evaluator and bounded
 * revision engine remain the authority for scoring and applying changes.
 */
export async function analyzeFailures(
  input: CritiqueInput,
  options: AgentOptions = {},
): Promise<AgentCritique> {
  if (options.offline || !process.env.OPENAI_API_KEY) {
    return templateCritique(input);
  }

  const { agent } = await import("@llamaindex/workflow");
  const { openai } = await import("@llamaindex/openai");
  const critic = agent({
    name: "UnderwritingPolicyCritic",
    description: "Explains deterministic underwriting policy evaluation failures.",
    tools: [],
    llm: openai({
      model: options.model ?? process.env.LLM_MODEL ?? "gpt-4.1-mini",
      temperature: 0,
    }),
    systemPrompt: [
      "You critique a synthetic small-business underwriting policy evaluation.",
      "You do not approve borrowers, score applicants, or apply policy changes.",
      "Use only supplied deterministic results. Never introduce protected attributes or proxies.",
      "Suggest at most four bounded threshold changes.",
      "Return JSON with summary, patterns, suggestedChanges, and safeguards.",
    ].join(" "),
  });

  const response = await critic.run(buildCritiquePrompt(input));
  const parsed = critiqueSchema.parse(parseJson(messageText(response.data.message.content)));
  return { ...parsed, source: "llamaindex" };
}

export async function generateFinalReport(
  iterations: Iteration[],
  options: AgentOptions = {},
): Promise<string> {
  const fallback = templateReport(iterations);
  if (options.offline || !process.env.OPENAI_API_KEY) {
    return fallback;
  }

  const { agent } = await import("@llamaindex/workflow");
  const { openai } = await import("@llamaindex/openai");
  const reporter = agent({
    name: "UnderwritingEvalReporter",
    description: "Summarizes a completed policy QA loop for internal risk reviewers.",
    tools: [],
    llm: openai({
      model: options.model ?? process.env.LLM_MODEL ?? "gpt-4.1-mini",
      temperature: 0,
    }),
    systemPrompt: [
      "Write a concise internal QA report from supplied iteration metrics.",
      "Do not claim the policy is deployed, compliant, or safe for autonomous lending.",
      "State that recommendations require human risk and fair-lending review.",
    ].join(" "),
  });
  const response = await reporter.run(
    `Summarize this synthetic policy eval history:\n${JSON.stringify(iterations)}`,
  );
  return messageText(response.data.message.content).trim() || fallback;
}

export function templateCritique(input: CritiqueInput): AgentCritique {
  const { evaluation, policy } = input;
  const patterns: string[] = [];
  const changes: PolicyChange[] = [];

  const youngSafe = evaluation.failedCases.filter(
    (failure) =>
      failure.applicant.expectedDecision === "approve" &&
      failure.decision !== "approve" &&
      failure.applicant.businessAgeMonths < policy.minBusinessAgeMonths &&
      failure.applicant.monthlyCashFlow >= policy.minMonthlyCashFlow,
  );
  if (youngSafe.length > 0) {
    patterns.push(`${youngSafe.length} cash-flow-positive young businesses missed approval.`);
    changes.push({
      field: "minBusinessAgeMonths",
      currentValue: policy.minBusinessAgeMonths,
      proposedValue: Math.max(6, policy.minBusinessAgeMonths - 6),
      reason: "Test a six-month relaxation for otherwise strong young businesses.",
    });
  }

  const collateralBacked = evaluation.failedCases.filter(isCollateralBackedMiss);
  if (collateralBacked.length > 0) {
    patterns.push(`${collateralBacked.length} strongly collateralized cases were misclassified.`);
    changes.push({
      field: "manualReviewRule",
      currentValue: "none",
      proposedValue: "collateralRatio >= 0.6",
      reason: "Route strong-collateral threshold misses to review instead of auto-rejection.",
    });
  }

  if (evaluation.falseApprovals > 0 || evaluation.defaultRiskEstimate > 0.05) {
    patterns.push(
      `${evaluation.falseApprovals} false approvals; estimated risk is ${percent(
        evaluation.defaultRiskEstimate,
      )}.`,
    );
    changes.push({
      field: "maxDebtToIncomeRatio",
      currentValue: policy.maxDebtToIncomeRatio,
      proposedValue: round(Math.max(0.25, policy.maxDebtToIncomeRatio - 0.03)),
      reason: "Test a bounded debt-ratio tightening against risky approvals.",
    });
    changes.push({
      field: "minCreditScore",
      currentValue: policy.minCreditScore,
      proposedValue: Math.min(760, policy.minCreditScore + 10),
      reason: "Test a ten-point credit floor increase; retain manual review for offsets.",
    });
  }

  if (evaluation.manualReviewRate > 0.35) {
    patterns.push(
      `Manual review is ${percent(evaluation.manualReviewRate)}, above the 35% diagnostic level.`,
    );
  }

  if (patterns.length === 0) {
    patterns.push("No dominant failure pattern was found; preserve thresholds and validate holdout.");
  }

  return {
    summary: `Iteration ${input.iteration}/${input.maxIterations}: ${evaluation.failedCases.length} failed cases at ${percent(evaluation.passRate)} pass rate.`,
    patterns,
    suggestedChanges: changes.slice(0, 4),
    safeguards: [
      "Evaluator results, not agent prose, determine whether a policy passes.",
      "Apply only allowlisted bounded changes, then rerun every case.",
      "Do not use protected attributes or deploy without human risk review.",
    ],
    source: "template",
  };
}

function buildCritiquePrompt(input: CritiqueInput): string {
  return JSON.stringify({
    objective: {
      minimumPassRate: 0.85,
      maximumEstimatedDefaultRisk: 0.05,
      maximumIterations: 5,
    },
    iteration: input.iteration,
    policy: input.policy,
    metrics: {
      ...input.evaluation,
      failedCases: undefined,
    },
    failedCases: input.evaluation.failedCases.map((failure) => ({
      applicantId: failure.applicant.id,
      expected: failure.applicant.expectedDecision,
      actual: failure.decision,
      edgeCase: failure.applicant.edgeCase,
      segment: failure.applicant.segment,
      reasons: failure.reasons,
      signals: {
        monthlyCashFlow: failure.applicant.monthlyCashFlow,
        businessAgeMonths: failure.applicant.businessAgeMonths,
        creditScore: failure.applicant.creditScore,
        debtToIncomeRatio: failure.applicant.debtToIncomeRatio,
        collateralRatio:
          failure.applicant.collateralValue / failure.applicant.loanAmount,
      },
    })),
  });
}

function templateReport(iterations: Iteration[]): string {
  if (iterations.length === 0) {
    return "No policy iterations were evaluated.";
  }
  const first = iterations[0];
  const final = iterations.at(-1) ?? first;
  return [
    `UnderwriteLoop evaluated ${iterations.length} bounded policy iterations.`,
    `Pass rate moved from ${percent(first.passRate)} to ${percent(final.passRate)};`,
    `estimated default risk ended at ${percent(final.defaultRiskEstimate)}.`,
    "The final policy is a recommendation for internal review, not an autonomous lending decision.",
  ].join(" ");
}

function isCollateralBackedMiss(failure: EvalResult): boolean {
  return (
    failure.decision !== failure.applicant.expectedDecision &&
    failure.applicant.collateralValue / failure.applicant.loanAmount >= 0.6
  );
}

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        typeof item === "object" && item !== null && "text" in item
          ? String(item.text)
          : "",
      )
      .join("");
  }
  return String(content ?? "");
}

function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced?.[1] ?? text);
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
