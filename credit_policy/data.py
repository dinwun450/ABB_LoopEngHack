from __future__ import annotations

import json
import math
import random
from pathlib import Path

from credit_policy.models import Applicant, TestCase


def _default_probability(
    credit_score: int | None,
    debt_to_income: float,
    employment_years: float,
    loan_to_income: float,
    has_credit_history: bool,
) -> float:
    score = -4.5
    score += ((680 - (credit_score or 650)) / 55) * 0.9
    score += (debt_to_income - 0.35) * 4.0
    score += max(0, 1 - employment_years) * 0.6
    score += max(0, loan_to_income - 0.25) * 1.5
    score += 0.45 if not has_credit_history else 0
    return 1 / (1 + math.exp(-score))


def generate_dataset(size: int, seed: int) -> list[Applicant]:
    """Generate fully observed synthetic outcomes for a safe, repeatable demo."""
    rng = random.Random(seed)
    applicants: list[Applicant] = []
    for index in range(size):
        has_history = rng.random() > 0.07
        credit_score = (
            max(300, min(850, round(rng.gauss(680, 75)))) if has_history else None
        )
        income = max(20_000, round(rng.lognormvariate(11.0, 0.42), -2))
        loan_amount = round(income * rng.uniform(0.08, 0.55), -2)
        dti = min(0.9, max(0.05, rng.betavariate(2.7, 5.0)))
        employment_years = round(min(25, rng.expovariate(1 / 4.5)), 1)
        probability = _default_probability(
            credit_score,
            dti,
            employment_years,
            loan_amount / income,
            has_history,
        )
        applicants.append(
            Applicant(
                applicant_id=f"synthetic-{seed}-{index:05}",
                credit_score=credit_score,
                debt_to_income=round(dti, 3),
                employment_years=employment_years,
                annual_income=income,
                loan_amount=loan_amount,
                has_credit_history=has_history,
                self_employed=rng.random() < 0.14,
                outcome="defaulted" if rng.random() < probability else "repaid",
            )
        )
    return applicants


def load_applicants(path: Path) -> list[Applicant]:
    return [Applicant.model_validate(row) for row in json.loads(path.read_text())]


def save_applicants(path: Path, applicants: list[Applicant]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps([applicant.model_dump() for applicant in applicants], indent=2) + "\n"
    )


def load_cases(path: Path) -> list[TestCase]:
    return [TestCase.model_validate(row) for row in json.loads(path.read_text())]


def save_cases(path: Path, cases: list[TestCase]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps([case.model_dump() for case in cases], indent=2) + "\n")
