from __future__ import annotations

import hashlib
import json
from collections.abc import Callable

from credit_policy.models import Applicant, Condition, Decision, Policy

OPERATORS: dict[str, Callable[[object, object], bool]] = {
    "lt": lambda left, right: left < right,
    "lte": lambda left, right: left <= right,
    "gt": lambda left, right: left > right,
    "gte": lambda left, right: left >= right,
    "eq": lambda left, right: left == right,
    "neq": lambda left, right: left != right,
}


def condition_matches(condition: Condition, applicant: Applicant) -> bool:
    value = getattr(applicant, condition.field)
    if value is None:
        return False
    return OPERATORS[condition.op](value, condition.value)


def decide(policy: Policy, applicant: Applicant) -> Decision:
    for rule in policy.rules:
        if all(condition_matches(condition, applicant) for condition in rule.all):
            return rule.decision
    return policy.default_decision


def policy_hash(policy: Policy) -> str:
    encoded = json.dumps(policy.model_dump(), sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()[:16]
