import pandas as pd
import numpy as np

from ai_core.utils.validation import evaluate_data_quality


def test_no_issues():
    rng = np.random.RandomState(0)
    df = pd.DataFrame({
        "a": rng.normal(loc=0, scale=1, size=200),
        "b": rng.normal(loc=5, scale=2, size=200),
    })
    issues = evaluate_data_quality(df)
    assert issues["missing"] == {}
    assert issues["constant"] == []
    assert issues["outliers"] == {}


def test_missingness_flagged():
    df = pd.DataFrame({
        "good": list(range(100)),
        "bad": [None] * 30 + list(range(70)),
    })
    issues = evaluate_data_quality(df, max_missing_ratio=0.2)
    assert "bad" in issues["missing"]
    assert issues["missing"]["bad"] >= 0.3


def test_constant_column():
    df = pd.DataFrame({
        "id": range(50),
        "const": [42] * 50,
    })
    issues = evaluate_data_quality(df)
    assert "const" in issues["constant"]


def test_outliers_flagged():
    # create a numeric column with a small number of extreme values
    values = [0.0] * 200 + [10000.0] * 5
    df = pd.DataFrame({"vals": values})
    issues = evaluate_data_quality(df)
    assert "vals" in issues["outliers"]
    assert issues["outliers"]["vals"] > 0.01
