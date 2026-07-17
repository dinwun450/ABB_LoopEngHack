import type { Policy } from "./types";

export type PolicyThreshold = {
  key: keyof Policy;
  label: string;
  value: string;
};

export function describePolicy(policy: Policy): PolicyThreshold[] {
  return [
    {
      key: "minCreditScore",
      label: "Credit score",
      value: `≥ ${policy.minCreditScore}`,
    },
    {
      key: "maxDebtToIncomeRatio",
      label: "Debt-to-income",
      value: `≤ ${policy.maxDebtToIncomeRatio.toFixed(2)}`,
    },
    {
      key: "minMonthlyCashFlow",
      label: "Monthly cash flow",
      value: `≥ $${policy.minMonthlyCashFlow.toLocaleString()}`,
    },
    {
      key: "minBusinessAgeMonths",
      label: "Business age",
      value: `≥ ${policy.minBusinessAgeMonths} months`,
    },
    {
      key: "minCollateralRatio",
      label: "Collateral ratio",
      value: `≥ ${policy.minCollateralRatio.toFixed(2)}`,
    },
    {
      key: "allowManualReview",
      label: "Manual review",
      value: policy.allowManualReview ? "Enabled" : "Disabled",
    },
    {
      key: "collateralReviewEnabled",
      label: "Collateral review path",
      value: policy.collateralReviewEnabled ? "Enabled" : "Disabled",
    },
  ];
}

export function changedPolicyKeys(
  from: Policy,
  to: Policy
): Set<keyof Policy> {
  const keys = Object.keys(to) as (keyof Policy)[];
  return new Set(keys.filter((key) => from[key] !== to[key]));
}
