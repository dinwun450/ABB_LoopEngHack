export type Decision = "approve" | "reject" | "manual_review";
export type IndustryRisk = "low" | "medium" | "high";

export type Applicant = {
  id: string;
  monthlyRevenue: number;
  monthlyCashFlow: number;
  businessAgeMonths: number;
  creditScore: number;
  debtToIncomeRatio: number;
  loanAmount: number;
  collateralValue: number;
  industryRisk: IndustryRisk;
  previousDefaults: number;
  expectedDecision: Decision;
  segment: string;
  edgeCase: string;
};

export type Policy = {
  minCreditScore: number;
  maxDebtToIncomeRatio: number;
  minMonthlyCashFlow: number;
  minBusinessAgeMonths: number;
  minCollateralRatio: number;
  allowManualReview: boolean;
};

export type EvalResult = {
  applicant: Applicant;
  decision: Decision;
  passed: boolean;
  reasons: string[];
};

export type EvaluationSummary = {
  passRate: number;
  approvalRate: number;
  manualReviewRate: number;
  falseApprovals: number;
  falseRejections: number;
  defaultRiskEstimate: number;
  edgeCasePassRate: number;
  failedCases: EvalResult[];
};

export type PolicyField = Exclude<keyof Policy, "allowManualReview">;

export type PolicyChange = {
  field: PolicyField | "manualReviewRule";
  currentValue: number | string;
  proposedValue: number | string;
  reason: string;
};

export type AgentCritique = {
  summary: string;
  patterns: string[];
  suggestedChanges: PolicyChange[];
  safeguards: string[];
  source: "llamaindex" | "template";
};

export type CritiqueInput = {
  policy: Policy;
  evaluation: EvaluationSummary;
  iteration: number;
  maxIterations: number;
};

export type Iteration = {
  iteration: number;
  policy: Policy;
  passRate: number;
  approvalRate: number;
  manualReviewRate: number;
  defaultRiskEstimate: number;
  failedCases: EvalResult[];
  agentCritique: string;
  policyChanges: string[];
};
