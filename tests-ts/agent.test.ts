import { describe, expect, it } from "vitest";

import { generateFinalReport, templateCritique } from "../lib/agent.js";
import { STARTING_POLICY } from "../lib/evaluator.js";
import type { Applicant, CritiqueInput, EvalResult } from "../lib/types.js";

const youngBusiness: Applicant = {
  id: "young-strong-cash-flow",
  monthlyRevenue: 90_000,
  monthlyCashFlow: 20_000,
  businessAgeMonths: 18,
  creditScore: 715,
  debtToIncomeRatio: 0.31,
  loanAmount: 100_000,
  collateralValue: 70_000,
  industryRisk: "medium",
  previousDefaults: 0,
  expectedDecision: "approve",
  segment: "young-business",
  edgeCase: "young business with strong cash flow",
};

describe("advisory agent fallback", () => {
  it("suggests bounded changes but never applies decisions", () => {
    const failedCase: EvalResult = {
      applicant: youngBusiness,
      decision: "manual_review",
      passed: false,
      reasons: ["Business age missed approval threshold"],
    };
    const input: CritiqueInput = {
      policy: STARTING_POLICY,
      iteration: 1,
      maxIterations: 5,
      evaluation: {
        passRate: 0.75,
        approvalRate: 0.4,
        manualReviewRate: 0.4,
        falseApprovals: 0,
        falseRejections: 0,
        defaultRiskEstimate: 0.03,
        edgeCasePassRate: 0.5,
        failedCases: [failedCase],
      },
    };

    const critique = templateCritique(input);
    const ageChange = critique.suggestedChanges.find(
      (change) => change.field === "minBusinessAgeMonths",
    );

    expect(critique.source).toBe("template");
    expect(ageChange?.currentValue).toBe(24);
    expect(ageChange?.proposedValue).toBe(18);
    expect(critique.safeguards.join(" ")).toContain("Evaluator results");
  });

  it("creates a deterministic report when no LLM is configured", async () => {
    const report = await generateFinalReport(
      [
        {
          iteration: 1,
          policy: STARTING_POLICY,
          passRate: 0.7,
          approvalRate: 0.35,
          manualReviewRate: 0.4,
          defaultRiskEstimate: 0.04,
          failedCases: [],
          agentCritique: "Several edge cases failed.",
          policyChanges: [],
        },
        {
          iteration: 2,
          policy: STARTING_POLICY,
          passRate: 0.9,
          approvalRate: 0.42,
          manualReviewRate: 0.25,
          defaultRiskEstimate: 0.035,
          failedCases: [],
          agentCritique: "Targets met.",
          policyChanges: [],
        },
      ],
      { offline: true },
    );

    expect(report).toContain("70.0%");
    expect(report).toContain("90.0%");
    expect(report).toContain("not an autonomous lending decision");
  });
});
