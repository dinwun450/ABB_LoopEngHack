from credit_policy.agents import _offline_policy
from credit_policy.models import Applicant
from credit_policy.policy import decide, policy_hash


def applicant(**overrides: object) -> Applicant:
    values = {
        "applicant_id": "test",
        "credit_score": 750,
        "debt_to_income": 0.3,
        "employment_years": 5,
        "annual_income": 100_000,
        "loan_amount": 20_000,
        "has_credit_history": True,
        "self_employed": False,
        "outcome": "repaid",
    }
    values.update(overrides)
    return Applicant.model_validate(values)


def test_policy_uses_ordered_rules_and_manual_fallback() -> None:
    policy = _offline_policy(2)

    assert decide(policy, applicant(credit_score=610)) == "reject"
    assert decide(policy, applicant(credit_score=770, debt_to_income=0.51)) == "approve"
    assert decide(policy, applicant(credit_score=None, has_credit_history=False)) == "manual_review"


def test_policy_hash_is_stable() -> None:
    policy = _offline_policy(2)

    assert policy_hash(policy) == policy_hash(policy.model_copy(deep=True))
