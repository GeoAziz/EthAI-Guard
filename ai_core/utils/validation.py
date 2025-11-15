from typing import Dict, Any

MAX_ROWS = 100000  # safety cap to avoid huge payload processing


def validate_dataset_mapping(data: Dict[str, Any]):
    """Validate the incoming data mapping (column -> list-like).

    Returns (ok: bool, message: str). Does not raise; caller may raise HTTPException.
    """
    if not isinstance(data, dict):
        return False, "data must be a mapping of column -> array-like"
    lengths = set()
    for k, v in data.items():
        if not isinstance(k, str) or k.strip() == "":
            return False, f"invalid column name: {k!r}"
        # Accept list-like objects (list/tuple); allow pandas Series as well.
        if hasattr(v, "tolist"):
            try:
                vals = v.tolist()
            except Exception:
                return False, f"column {k} is not list-like"
        elif isinstance(v, (list, tuple)):
            vals = list(v)
        else:
            return False, f"column {k} is not list-like"
        lengths.add(len(vals))
        if len(vals) > MAX_ROWS:
            return False, f"column {k} exceeds max allowed rows ({MAX_ROWS})"
    if len(lengths) > 1:
        return False, "all columns must have the same number of rows"
    # If no columns provided, reject
    if len(lengths) == 0:
        return False, "no columns provided"
    # Check zero-variance columns: allowed but warn — caller can decide
    # We'll not fail on zero variance here, but upstream can handle stable behavior.
    return True, "ok"


def evaluate_data_quality(df, *, max_missing_ratio=0.2, max_constant_ratio=0.5):
    """Run lightweight data quality checks on a pandas DataFrame.

    Returns a dict with keys: missing, constant, outliers.
    """
    import numpy as np

    issues = {"missing": {}, "constant": [], "outliers": {}}
    n = len(df)
    for col in df.columns:
        series = df[col]
        # missing
        miss = int(series.isna().sum())
        if n > 0 and (miss / n) > max_missing_ratio:
            issues["missing"][col] = float(miss) / float(n)
        # constant
        try:
            nunique = series.nunique(dropna=True)
            if nunique == 1:
                issues["constant"].append(col)
            elif nunique / max(1, n) > max_constant_ratio:
                # many unique values; not a constant
                pass
        except Exception:
            pass
        # simple outlier detection via z-score
        try:
            arr = series.dropna().astype(float).to_numpy()
            if arr.size > 3:
                m = arr.mean()
                s = arr.std()
                if s > 0:
                    z = np.abs((arr - m) / s)
                    outlier_ratio = float((z > 5).sum()) / float(max(1, arr.size))
                    if outlier_ratio > 0.01:
                        issues["outliers"][col] = outlier_ratio
        except Exception:
            # non-numeric columns skipped for z-score
            pass

    return issues
