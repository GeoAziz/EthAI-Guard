import pandas as pd
import numpy as np
from typing import Tuple, List

def validate_input_data(data: dict) -> Tuple[bool, str]:
    """Validate input data dict comprehensively before processing.

    Returns (is_valid, error_message).
    """
    if not data:
        return False, "Data dictionary is empty"

    col_lengths = {}
    for col, values in data.items():
        if not isinstance(values, (list, tuple)):
            return False, f"Column '{col}' values must be a list or tuple"

        if len(values) == 0:
            return False, f"Column '{col}' is empty"

        col_lengths[col] = len(values)

    lengths = set(col_lengths.values())
    if len(lengths) > 1:
        return False, f"Mismatched column lengths: {col_lengths}"

    max_rows = max(col_lengths.values()) if col_lengths else 0
    if max_rows > 100000:
        return False, f"Dataset exceeds maximum rows (100000): {max_rows} rows provided"

    if max_rows == 0:
        return False, "No data rows provided"

    return True, ""


def validate_dataframe(df: pd.DataFrame, allow_target_only: bool = False) -> Tuple[bool, str]:
    """Validate a DataFrame for model training.

    Returns (is_valid, error_message).
    """
    if df is None or len(df) == 0:
        return False, "DataFrame is empty"

    if df.shape[0] < 2:
        return False, f"DataFrame must have at least 2 rows, got {df.shape[0]}"

    if not allow_target_only and df.shape[1] < 2:
        return False, f"DataFrame must have at least 2 columns (feature + target), got {df.shape[1]}"

    for col in df.columns:
        col_data = df[col]

        if col_data.isna().sum() > 0:
            na_pct = 100.0 * col_data.isna().sum() / len(col_data)
            return False, f"Column '{col}' has {na_pct:.1f}% NaN values. Please remove or impute."

        if col_data.dtype == 'object':
            non_numeric = col_data[pd.notna(col_data)].apply(lambda x: not isinstance(x, (int, float, np.number)))
            if non_numeric.any():
                return False, f"Column '{col}' contains non-numeric string values. All columns must be numeric."

        nunique = col_data.nunique()
        if nunique <= 1:
            return False, f"Column '{col}' is constant (only 1 unique value). Remove constant columns before training."

    return True, ""


def validate_target_column(y: pd.Series) -> Tuple[bool, str]:
    """Validate the target column for binary classification.

    Returns (is_valid, error_message).
    """
    if y is None or len(y) == 0:
        return False, "Target column is empty"

    if y.isna().sum() > 0:
        return False, f"Target column has {y.isna().sum()} NaN values"

    nunique = y.nunique()
    if nunique < 2:
        return False, f"Target must have at least 2 unique values (binary classification), got {nunique}"

    if nunique > 2:
        return False, f"Target has {nunique} unique values, but only binary classification is supported"

    return True, ""


def validate_protected_attribute(protected_attr: pd.Series, min_group_size: int = 5) -> Tuple[bool, str]:
    """Validate a protected attribute column for fairness metrics.

    Returns (is_valid, error_message).
    """
    if protected_attr is None or len(protected_attr) == 0:
        return False, "Protected attribute is empty"

    if protected_attr.isna().sum() > 0:
        return False, f"Protected attribute has {protected_attr.isna().sum()} NaN values"

    nunique = protected_attr.nunique()
    if nunique < 2:
        return False, f"Protected attribute must have at least 2 groups, got {nunique}"

    for group in protected_attr.unique():
        group_size = (protected_attr == group).sum()
        if group_size < min_group_size:
            return False, f"Group '{group}' has only {group_size} samples (minimum {min_group_size} required for fair evaluation)"

    return True, ""


def get_validation_errors(df: pd.DataFrame, y: pd.Series = None) -> List[str]:
    """Get all validation errors for a dataset.

    Returns list of error messages.
    """
    errors = []

    is_valid, msg = validate_dataframe(df, allow_target_only=True)
    if not is_valid:
        errors.append(f"DataFrame validation: {msg}")

    if y is not None:
        is_valid, msg = validate_target_column(y)
        if not is_valid:
            errors.append(f"Target validation: {msg}")

    return errors
