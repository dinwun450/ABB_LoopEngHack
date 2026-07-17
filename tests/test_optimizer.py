import asyncio
from pathlib import Path

from credit_policy.agents import PolicyAgent, _offline_generated_cases
from credit_policy.data import generate_dataset, load_cases
from credit_policy.evaluator import evaluate
from credit_policy.optimizer import optimize


def test_offline_loop_selects_a_feasible_policy(tmp_path: Path) -> None:
    cases = load_cases(Path("data/regression_cases.json")) + _offline_generated_cases()
    applicants = generate_dataset(4000, seed=17)
    policy, records = asyncio.run(
        optimize(
            agent=PolicyAgent(offline=True),
            cases=cases,
            applicants=applicants,
            output_dir=tmp_path,
            max_iterations=8,
            max_default_rate=0.04,
            min_case_pass_rate=0.98,
            max_manual_review_rate=0.20,
        )
    )

    metrics = evaluate(policy, cases, applicants)
    assert len(records) >= 2
    assert metrics.case_pass_rate == 1
    assert metrics.default_rate_upper_bound <= 0.04
    assert metrics.manual_review_rate <= 0.20
