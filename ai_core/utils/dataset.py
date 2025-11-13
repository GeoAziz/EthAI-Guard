from typing import Tuple
import pandas as pd
import numpy as np


def generate_bias_demo(n: int = 200) -> Tuple[pd.DataFrame, pd.Series]:
    """Generate a small synthetic dataset suitable for quick fairness demos.

    Features: age, income, protected (0/1)
    Target: loan_approved (0/1) with slight bias against protected group
    """
    rng = np.random.default_rng(42)
    age = rng.integers(20, 70, size=n)
    income = rng.normal(50_000, 15_000, size=n).astype(int)
    protected = rng.choice([0, 1], size=n, p=[0.8, 0.2])

    # base probability influenced by income and age
    base = (income / 100_000) + (age - 30) * 0.005
    # introduce bias: protected group has slightly lower intercept
    logits = base - protected * 0.2
    probs = 1 / (1 + np.exp(-logits))
    y = (rng.random(n) < probs).astype(int)

    df = pd.DataFrame({"age": age, "income": income, "protected": protected})
    return df, pd.Series(y)
