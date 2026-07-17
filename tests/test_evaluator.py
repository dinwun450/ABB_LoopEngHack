from pathlib import Path

from credit_policy.agents import _offline_policy
from credit_policy.data import generate_dataset, load_cases
from credit_policy.evaluator import evaluate, wilson_upper_bound


def test_wilson_bound_is_conservative() -> None:
    assert wilson_upper_bound(4, 100) > 0.04
    assert wilson_upper_bound(0, 100) > 0
    assert wilson_upper_bound(0, 0) == 1


def test_final_offline_policy_handles_regressions() -> None:
    cases = load_cases(Path("data/regression_cases.json"))
    metrics = evaluate(_offline_policy(2), cases, generate_dataset(500, seed=3))

    assert metrics.case_pass_rate == 1
    assert metrics.approved_count > 0
    assert metrics.policy_complexity == 11
