import type {
  Applicant,
  Decision,
  EvalResult,
  EvaluationSummary,
  Policy,
} from "./types.js";

export const STARTING_POLICY: Policy = {
  minCreditScore: 680,
  maxDebtToIncomeRatio: 0.42,
  minMonthlyCashFlow: 12_000,
  minBusinessAgeMonths: 24,
  minCollateralRatio: 0.25,
  allowManualReview: true,
};

export function evaluateApplicant(applicant: Applicant, policy: Policy): EvalResult {
  const collateralRatio = applicant.collateralValue / applicant.loanAmount;
  const reasons: string[] = [];

  if (applicant.previousDefaults > 0) {
    reasons.push("Previous default requires rejection");
    return result(applicant, "reject", reasons);
  }
  if (applicant.monthlyCashFlow <= 0) {
    reasons.push("Monthly cash flow is non-positive");
    return result(applicant, "reject", reasons);
  }
  if (applicant.debtToIncomeRatio > policy.maxDebtToIncomeRatio + 0.15) {
    reasons.push("Debt-to-income ratio exceeds the hard risk boundary");
    return result(applicant, "reject", reasons);
  }

  const approvalChecks = [
    applicant.creditScore >= policy.minCreditScore,
    applicant.debtToIncomeRatio <= policy.maxDebtToIncomeRatio,
    applicant.monthlyCashFlow >= policy.minMonthlyCashFlow,
    applicant.businessAgeMonths >= policy.minBusinessAgeMonths,
    collateralRatio >= policy.minCollateralRatio,
  ];
  if (approvalChecks.every(Boolean)) {
    reasons.push("All clear-approval thresholds pass");
    return result(applicant, "approve", reasons);
  }

  if (applicant.creditScore < policy.minCreditScore - 60) {
    reasons.push("Credit score is below the hard rejection boundary");
    return result(applicant, "reject", reasons);
  }
  if (applicant.debtToIncomeRatio > policy.maxDebtToIncomeRatio + 0.08) {
    reasons.push("Debt-to-income ratio exceeds the review boundary");
    return result(applicant, "reject", reasons);
  }

  if (policy.allowManualReview) {
    reasons.push(
      collateralRatio >= 0.6
        ? "Strong collateral offsets a missed approval threshold"
        : "Signals are mixed and require manual review",
    );
    return result(applicant, "manual_review", reasons);
  }

  reasons.push("Applicant missed an approval threshold and review is disabled");
  return result(applicant, "reject", reasons);
}

export function evaluatePolicy(
  applicants: Applicant[],
  policy: Policy,
): EvaluationSummary {
  const results = applicants.map((applicant) => evaluateApplicant(applicant, policy));
  const count = Math.max(results.length, 1);
  const edgeCases = results.filter((item) => item.applicant.edgeCase.length > 0);
  const approved = results.filter((item) => item.decision === "approve");

  return {
    passRate: ratio(results.filter((item) => item.passed).length, count),
    approvalRate: ratio(approved.length, count),
    manualReviewRate: ratio(
      results.filter((item) => item.decision === "manual_review").length,
      count,
    ),
    falseApprovals: results.filter(
      (item) =>
        item.decision === "approve" && item.applicant.expectedDecision === "reject",
    ).length,
    falseRejections: results.filter(
      (item) =>
        item.decision === "reject" && item.applicant.expectedDecision === "approve",
    ).length,
    defaultRiskEstimate:
      approved.length === 0
        ? 1
        : approved.reduce(
            (sum, item) => sum + estimateDefaultRisk(item.applicant),
            0,
          ) / approved.length,
    edgeCasePassRate:
      edgeCases.length === 0
        ? 1
        : ratio(edgeCases.filter((item) => item.passed).length, edgeCases.length),
    failedCases: results.filter((item) => !item.passed),
  };
}

function result(
  applicant: Applicant,
  decision: Decision,
  reasons: string[],
): EvalResult {
  return {
    applicant,
    decision,
    passed: decision === applicant.expectedDecision,
    reasons,
  };
}

function estimateDefaultRisk(applicant: Applicant): number {
  let risk = 0.015;
  risk += Math.max(0, applicant.debtToIncomeRatio - 0.3) * 0.12;
  risk += Math.max(0, 680 - applicant.creditScore) * 0.00015;
  risk += applicant.industryRisk === "high" ? 0.02 : 0;
  risk += applicant.businessAgeMonths < 24 ? 0.01 : 0;
  return Math.min(1, risk);
}

function ratio(numerator: number, denominator: number): number {
  return numerator / denominator;
}
