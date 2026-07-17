export type Decision = "approve" | "reject" | "manual_review";

export type Applicant = {
  id: string;
  monthlyRevenue: number;
  monthlyCashFlow: number;
  businessAgeMonths: number;
  creditScore: number;
  debtToIncomeRatio: number;
  loanAmount: number;
  collateralValue: number;
  industryRisk: "low" | "medium" | "high";
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
  collateralReviewEnabled: boolean;
};

export type EvalResult = {
  applicant: Applicant;
  decision: Decision;
  passed: boolean;
  violations: string[];
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

export type NexlaDataStatus = {
  source: string;
  schemaStatus: string;
  recordsProcessed: number;
};

export type RunLoopResponse = {
  iterations: Iteration[];
  finalPolicy: Policy;
  finalReport: string;
  nexlaDataStatus: NexlaDataStatus;
};
