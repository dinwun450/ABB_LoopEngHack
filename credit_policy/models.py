from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Decision = Literal["approve", "reject", "manual_review"]
Outcome = Literal["repaid", "defaulted"]

POLICY_FIELDS = {
    "credit_score",
    "debt_to_income",
    "employment_years",
    "annual_income",
    "loan_amount",
    "has_credit_history",
    "self_employed",
}


class Applicant(BaseModel):
    model_config = ConfigDict(extra="forbid")

    applicant_id: str
    credit_score: int | None = Field(default=None, ge=300, le=850)
    debt_to_income: float = Field(ge=0, le=2)
    employment_years: float = Field(ge=0, le=60)
    annual_income: float = Field(gt=0)
    loan_amount: float = Field(gt=0)
    has_credit_history: bool = True
    self_employed: bool = False
    outcome: Outcome | None = None


class TestCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    profile: str
    rationale: str
    applicant: Applicant
    expected: Decision
    source: Literal["regression", "generated"] = "generated"


class Condition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    op: Literal["lt", "lte", "gt", "gte", "eq", "neq"]
    value: int | float | bool

    @model_validator(mode="after")
    def validate_field(self) -> Condition:
        if self.field not in POLICY_FIELDS:
            raise ValueError(f"Policy field is not allowed: {self.field}")
        return self


class Rule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    all: list[Condition] = Field(min_length=1)
    decision: Decision


class Policy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1)
    rationale: str
    rules: list[Rule] = Field(min_length=1, max_length=30)
    default_decision: Decision = "manual_review"


class EvaluationMetrics(BaseModel):
    case_pass_rate: float
    cases_passed: int
    cases_total: int
    approval_rate: float
    manual_review_rate: float
    default_rate_among_approved: float
    default_rate_upper_bound: float
    false_reject_rate: float
    approved_count: int
    approved_defaults: int
    policy_complexity: int
    failed_cases: list[dict[str, str]]
    cohort_misses: list[dict[str, Any]]


class IterationRecord(BaseModel):
    iteration: int
    policy_hash: str
    policy: Policy
    metrics: EvaluationMetrics
    feasible: bool
    feedback: dict[str, Any]
