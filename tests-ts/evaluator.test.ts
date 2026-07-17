import { describe, expect, it } from "vitest";

import { STARTING_POLICY, evaluateApplicant, evaluatePolicy } from "../lib/evaluator.js";
import type { Applicant } from "../lib/types.js";

const baseApplicant: Applicant = {
  id: "stable-business",
  monthlyRevenue: 80_000,
  monthlyCashFlow: 18_000,
  businessAgeMonths: 48,
  creditScore: 735,
  debtToIncomeRatio: 0.3,
  loanAmount: 100_000,
  collateralValue: 50_000,
  industryRisk: "low",
  previousDefaults: 0,
  expectedDecision: "approve",
  segment: "established",
  edgeCase: "",
};

describe("deterministic policy evaluator", () => {
  it("approves a borrower that clears every threshold", () => {
    const result = evaluateApplicant(baseApplicant, STARTING_POLICY);

    expect(result.decision).toBe("approve");
    expect(result.passed).toBe(true);
  });

  it("routes a collateral-backed threshold miss to review", () => {
    const result = evaluateApplicant(
      {
        ...baseApplicant,
        id: "collateral-edge",
        creditScore: 650,
        collateralValue: 80_000,
        expectedDecision: "manual_review",
        edgeCase: "collateral-backed lower credit",
      },
      STARTING_POLICY,
    );

    expect(result.decision).toBe("manual_review");
    expect(result.reasons[0]).toContain("collateral");
  });

  it("reports false approvals without asking an agent to judge them", () => {
    const summary = evaluatePolicy(
      [{ ...baseApplicant, expectedDecision: "reject" }],
      STARTING_POLICY,
    );

    expect(summary.falseApprovals).toBe(1);
    expect(summary.passRate).toBe(0);
  });
});
