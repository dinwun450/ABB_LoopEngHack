from __future__ import annotations

import json
import os
import re
from typing import Any

from credit_policy.models import Policy, TestCase


def _extract_json(text: str) -> Any:
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else text
    starts = [position for token in ("[", "{") if (position := candidate.find(token)) >= 0]
    if not starts:
        raise ValueError("Agent response did not contain JSON")
    return json.loads(candidate[min(starts) :])


class TestCaseAgent:
    def __init__(self, offline: bool = False, model: str | None = None) -> None:
        self.offline = offline or not os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("LLM_MODEL", "gpt-4o-mini")

    async def generate(self, regression_cases: list[TestCase]) -> list[TestCase]:
        if self.offline:
            return _offline_generated_cases()

        from llama_index.core.agent.workflow import FunctionAgent
        from llama_index.llms.openai import OpenAI

        agent = FunctionAgent(
            name="TestCaseAgent",
            description="Generates credit-policy edge and adversarial test cases.",
            system_prompt=(
                "Generate synthetic tests for a credit policy. Never use protected attributes. "
                "Return only a JSON array matching the supplied schema. Expected outcomes must be "
                "approve, reject, or manual_review. Favor boundary and conflicting-signal cases."
            ),
            llm=OpenAI(model=self.model, temperature=0.2),
        )
        prompt = (
            "Generate 6 new cases that do not duplicate these immutable regressions:\n"
            f"{json.dumps([case.model_dump() for case in regression_cases])}\n"
            "Each item requires case_id, profile, rationale, applicant, expected, and "
            'source="generated". Applicant outcome must be null.'
        )
        response = await agent.run(user_msg=prompt)
        return [TestCase.model_validate(item) for item in _extract_json(str(response))]


class PolicyAgent:
    def __init__(self, offline: bool = False, model: str | None = None) -> None:
        self.offline = offline or not os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("LLM_MODEL", "gpt-4o-mini")

    async def generate(
        self,
        iteration: int,
        feedback: dict[str, Any],
        previous_policy: Policy | None,
    ) -> Policy:
        if self.offline:
            return _offline_policy(iteration)

        from llama_index.core.agent.workflow import FunctionAgent
        from llama_index.llms.openai import OpenAI

        agent = FunctionAgent(
            name="PolicyAgent",
            description="Produces auditable credit-policy candidates from evaluation feedback.",
            system_prompt=(
                "Return only a Policy JSON object. Policies are ordered rules in a restricted DSL. "
                "Allowed fields: credit_score, debt_to_income, employment_years, annual_income, "
                "loan_amount, has_credit_history, self_employed. Allowed operators: lt, lte, gt, "
                "gte, eq, neq. Never add demographic or proxy attributes. Optimize "
                "lexicographically: "
                "pass tests, satisfy risk and manual-review caps, then maximize safe approvals."
            ),
            llm=OpenAI(model=self.model, temperature=0.1),
        )
        prompt = {
            "iteration": iteration,
            "previous_policy": previous_policy.model_dump() if previous_policy else None,
            "evaluation_feedback": feedback,
            "schema_example": _offline_policy(0).model_dump(),
        }
        response = await agent.run(user_msg=json.dumps(prompt))
        return Policy.model_validate(_extract_json(str(response)))


def _offline_generated_cases() -> list[TestCase]:
    raw = [
        {
            "case_id": "generated-borderline-stable",
            "profile": "Borderline score with strong stability",
            "rationale": "Stable employment offsets a borderline score without forcing rejection.",
            "applicant": {
                "applicant_id": "case-generated-1",
                "credit_score": 665,
                "debt_to_income": 0.31,
                "employment_years": 8,
                "annual_income": 92000,
                "loan_amount": 18000,
                "has_credit_history": True,
                "self_employed": False,
                "outcome": None,
            },
            "expected": "approve",
            "source": "generated",
        },
        {
            "case_id": "generated-conflicting-signals",
            "profile": "Good score, new employment",
            "rationale": "Conflicting signals should be reviewed rather than auto-decided.",
            "applicant": {
                "applicant_id": "case-generated-2",
                "credit_score": 705,
                "debt_to_income": 0.34,
                "employment_years": 0.3,
                "annual_income": 88000,
                "loan_amount": 22000,
                "has_credit_history": True,
                "self_employed": False,
                "outcome": None,
            },
            "expected": "manual_review",
            "source": "generated",
        },
        {
            "case_id": "generated-high-risk",
            "profile": "Weak score and high leverage",
            "rationale": "Multiple strong risk indicators support rejection.",
            "applicant": {
                "applicant_id": "case-generated-3",
                "credit_score": 610,
                "debt_to_income": 0.63,
                "employment_years": 0.5,
                "annual_income": 43000,
                "loan_amount": 21000,
                "has_credit_history": True,
                "self_employed": False,
                "outcome": None,
            },
            "expected": "reject",
            "source": "generated",
        },
    ]
    return [TestCase.model_validate(case) for case in raw]


def _offline_policy(iteration: int) -> Policy:
    candidates = [
        {
            "version": 1,
            "rationale": "Conservative first pass matching the supplied baseline.",
            "rules": [
                {
                    "name": "reject-very-low-score",
                    "all": [{"field": "credit_score", "op": "lt", "value": 580}],
                    "decision": "reject",
                },
                {
                    "name": "reject-high-dti-new-job",
                    "all": [
                        {"field": "debt_to_income", "op": "gt", "value": 0.5},
                        {"field": "employment_years", "op": "lt", "value": 1},
                    ],
                    "decision": "reject",
                },
                {
                    "name": "approve-prime",
                    "all": [
                        {"field": "credit_score", "op": "gt", "value": 720},
                        {"field": "debt_to_income", "op": "lt", "value": 0.4},
                    ],
                    "decision": "approve",
                },
            ],
            "default_decision": "manual_review",
        },
        {
            "version": 2,
            "rationale": "Adds an exception for excellent credit and raises the low-score floor.",
            "rules": [
                {
                    "name": "reject-low-score",
                    "all": [{"field": "credit_score", "op": "lt", "value": 620}],
                    "decision": "reject",
                },
                {
                    "name": "reject-high-dti-new-job",
                    "all": [
                        {"field": "debt_to_income", "op": "gt", "value": 0.55},
                        {"field": "employment_years", "op": "lt", "value": 1},
                    ],
                    "decision": "reject",
                },
                {
                    "name": "approve-excellent-credit-exception",
                    "all": [
                        {"field": "credit_score", "op": "gte", "value": 740},
                        {"field": "debt_to_income", "op": "lte", "value": 0.55},
                        {"field": "employment_years", "op": "gte", "value": 2},
                    ],
                    "decision": "approve",
                },
                {
                    "name": "approve-low-risk",
                    "all": [
                        {"field": "credit_score", "op": "gte", "value": 700},
                        {"field": "debt_to_income", "op": "lte", "value": 0.45},
                        {"field": "employment_years", "op": "gte", "value": 1},
                    ],
                    "decision": "approve",
                },
            ],
            "default_decision": "manual_review",
        },
        {
            "version": 3,
            "rationale": (
                "Expands safe approvals while reserving thin and unstable files for review."
            ),
            "rules": [
                {
                    "name": "reject-low-score",
                    "all": [{"field": "credit_score", "op": "lt", "value": 660}],
                    "decision": "reject",
                },
                {
                    "name": "reject-high-leverage",
                    "all": [
                        {"field": "debt_to_income", "op": "gt", "value": 0.52},
                        {"field": "credit_score", "op": "lt", "value": 700},
                    ],
                    "decision": "reject",
                },
                {
                    "name": "reject-borderline-new-employment",
                    "all": [
                        {"field": "employment_years", "op": "lt", "value": 1},
                        {"field": "credit_score", "op": "lt", "value": 680},
                    ],
                    "decision": "reject",
                },
                {
                    "name": "approve-excellent-credit-exception",
                    "all": [
                        {"field": "credit_score", "op": "gte", "value": 740},
                        {"field": "debt_to_income", "op": "lte", "value": 0.55},
                        {"field": "employment_years", "op": "gte", "value": 2},
                    ],
                    "decision": "approve",
                },
                {
                    "name": "approve-stable",
                    "all": [
                        {"field": "credit_score", "op": "gte", "value": 700},
                        {"field": "debt_to_income", "op": "lte", "value": 0.52},
                        {"field": "employment_years", "op": "gte", "value": 1},
                    ],
                    "decision": "approve",
                },
                {
                    "name": "approve-creditworthy",
                    "all": [
                        {"field": "credit_score", "op": "gte", "value": 660},
                        {"field": "debt_to_income", "op": "lte", "value": 0.52},
                        {"field": "employment_years", "op": "gte", "value": 1},
                    ],
                    "decision": "approve",
                },
            ],
            "default_decision": "manual_review",
        },
    ]
    return Policy.model_validate(candidates[min(iteration, len(candidates) - 1)])
