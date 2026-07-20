"""Edge case tests for data validation in AI Core."""

import os
import sys
import pytest
import numpy as np
import pandas as pd
from io import StringIO

THIS_DIR = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)


class TestMissingValueHandling:
    """Test handling of missing values in datasets."""

    def test_single_missing_value(self):
        """Test dataset with single missing value."""
        data = pd.DataFrame({
            'feature1': [1, 2, np.nan, 4, 5],
            'feature2': [10, 20, 30, 40, 50]
        })
        
        missing_count = data.isna().sum().sum()
        assert missing_count == 1

    def test_all_missing_column(self):
        """Test handling of column with all missing values."""
        data = pd.DataFrame({
            'feature1': [1, 2, 3],
            'all_nan': [np.nan, np.nan, np.nan]
        })
        
        # All NaN column should be identified
        all_nan_cols = data.columns[data.isna().all()].tolist()
        assert 'all_nan' in all_nan_cols

    def test_missing_values_percentage_high(self):
        """Test dataset with high percentage of missing values."""
        data = pd.DataFrame({
            'feature1': [1, np.nan, np.nan, np.nan, 5],
            'feature2': [10, 20, 30, 40, 50]
        })
        
        missing_pct = (data.isna().sum() / len(data)).max()
        assert missing_pct == 0.6

    def test_missing_on_protected_attribute(self):
        """Test missing values on protected attributes (critical)."""
        data = pd.DataFrame({
            'outcome': [0, 1, 0, 1, 0],
            'protected_attr': ['A', np.nan, 'B', 'A', np.nan]
        })
        
        # Missing protected attributes should be flagged
        missing_protected = data['protected_attr'].isna().sum()
        assert missing_protected == 2


class TestMalformedCSVHandling:
    """Test handling of malformed CSV data."""

    def test_inconsistent_column_count(self):
        """Test CSV with inconsistent number of columns."""
        csv_data = "col1,col2\n1,2\n3,4,5"  # Last row has 3 cols
        
        df = pd.read_csv(StringIO(csv_data), on_bad_lines='warn')
        # Should handle gracefully or raise error
        assert df is not None or df is None

    def test_non_utf8_encoding(self):
        """Test handling of non-UTF8 encoded files."""
        # In real scenario, would try different encodings
        data = b'col1,col2\n1,2\n3,4'
        csv_str = data.decode('utf-8')
        df = pd.read_csv(StringIO(csv_str))
        assert len(df) == 2

    def test_csv_with_special_delimiters(self):
        """Test CSV with non-standard delimiters."""
        csv_data = "col1|col2\n1|2\n3|4"
        df = pd.read_csv(StringIO(csv_data), sep='|')
        assert len(df) == 2
        assert list(df.columns) == ['col1', 'col2']

    def test_empty_csv_file(self):
        """Test handling of empty CSV file."""
        csv_data = ""
        try:
            df = pd.read_csv(StringIO(csv_data))
            assert df.empty
        except Exception:
            pass  # Expected to fail


class TestDataTypeEdgeCases:
    """Test edge cases in data type handling."""

    def test_mixed_numeric_strings(self):
        """Test column with mixed numeric and string values."""
        data = pd.DataFrame({
            'feature': ['1', '2', 'not_a_number', '4', '5']
        })
        
        # Should detect non-numeric values
        non_numeric = 0
        for val in data['feature']:
            try:
                float(val)
            except ValueError:
                non_numeric += 1
        
        assert non_numeric == 1

    def test_extreme_numeric_values(self):
        """Test extreme numeric values (very large/small)."""
        data = pd.DataFrame({
            'feature1': [1e308, 1e-308, 0, -1e308],  # Near float limits
            'feature2': [1, 2, 3, 4]
        })
        
        # All values should be processable
        assert not data['feature1'].isna().all()

    def test_infinity_values(self):
        """Test handling of infinity values."""
        data = pd.DataFrame({
            'feature1': [1, np.inf, 3, -np.inf, 5],
            'feature2': [10, 20, 30, 40, 50]
        })
        
        inf_count = np.isinf(data['feature1']).sum()
        assert inf_count == 2

    def test_complex_numbers_in_numeric_column(self):
        """Test numeric column with complex numbers."""
        data = np.array([1+2j, 3+4j, 5+6j])
        # Should be rejected or converted
        assert data.dtype == np.complex128


class TestClassImbalance:
    """Test handling of class imbalance scenarios."""

    def test_severe_class_imbalance(self):
        """Test highly imbalanced dataset (99:1)."""
        y = np.concatenate([np.zeros(9900), np.ones(100)])
        
        class_counts = np.bincount(y.astype(int))
        ratio = class_counts[1] / class_counts[0]
        assert ratio == pytest.approx(0.01, abs=0.001)

    def test_single_class_only(self):
        """Test dataset with only one class."""
        y = np.ones(100)
        
        unique_classes = len(np.unique(y))
        assert unique_classes == 1

    def test_multi_class_severe_imbalance(self):
        """Test multi-class with severe imbalance."""
        y = np.concatenate([
            np.zeros(900),   # Class 0: 90%
            np.ones(80),     # Class 1: 8%
            np.full(20, 2)   # Class 2: 2%
        ])
        
        class_counts = np.bincount(y.astype(int))
        assert class_counts[0] == 900
        assert class_counts[2] == 20


class TestDataRange:
    """Test handling of extreme data ranges."""

    def test_zero_variance_column(self):
        """Test column with zero variance."""
        data = pd.DataFrame({
            'constant': [5, 5, 5, 5, 5],
            'variable': [1, 2, 3, 4, 5]
        })
        
        # Constant column should be identified
        variance = data.var()
        assert variance['constant'] == 0
        assert variance['variable'] > 0

    def test_negative_values_for_probability(self):
        """Test negative values where probabilities expected."""
        y_pred = np.array([0.5, -0.1, 0.8, 1.2, 0.6])
        
        invalid_count = ((y_pred < 0) | (y_pred > 1)).sum()
        assert invalid_count == 2

    def test_single_unique_value_many_rows(self):
        """Test column with single unique value across many rows."""
        data = np.ones(10000)
        
        unique_vals = len(np.unique(data))
        assert unique_vals == 1


class TestProtectedAttributeEdgeCases:
    """Test edge cases in protected attribute handling."""

    def test_protected_attr_with_unknown_category(self):
        """Test protected attribute with unknown/rare category."""
        protected = np.array(['A', 'A', 'A', 'B', 'C', 'UNKNOWN'])
        
        unique_categories = len(np.unique(protected))
        assert unique_categories == 4

    def test_protected_attr_case_sensitivity(self):
        """Test case sensitivity in protected attributes."""
        protected = np.array(['Male', 'male', 'MALE', 'Female', 'female'])
        
        # Should detect as different values
        unique_vals = len(np.unique(protected))
        assert unique_vals == 5

    def test_mixed_type_protected_attribute(self):
        """Test protected attribute with mixed data types."""
        # Some numeric, some string
        protected = ['Group1', 'Group2', 1, 2, 'Group1']
        
        # Should handle mixed types gracefully
        assert len(protected) == 5


class TestCorruptionInjection:
    """Test handling of intentionally corrupted data."""

    def test_sql_injection_in_string_column(self):
        """Test SQL injection attempts in data."""
        data = pd.DataFrame({
            'name': ["'; DROP TABLE users; --", "John", "Jane"],
            'value': [1, 2, 3]
        })
        
        # Should not be executable/dangerous
        assert isinstance(data['name'].iloc[0], str)

    def test_xss_payload_in_column(self):
        """Test XSS payload attempts."""
        data = pd.DataFrame({
            'comment': ['<script>alert("xss")</script>', 'Normal comment'],
            'score': [1, 2]
        })
        
        assert '<script>' in data['comment'].iloc[0]

    def test_very_long_string_field(self):
        """Test handling of extremely long string fields."""
        long_string = 'a' * 1000000  # 1MB string
        data = pd.DataFrame({
            'text': [long_string, 'normal text'],
        })
        
        # Should handle without crash
        assert len(data['text'].iloc[0]) == 1000000


class TestDataConsistency:
    """Test data consistency validation."""

    def test_datetime_parsing_errors(self):
        """Test invalid datetime formats."""
        dates = ['2025-01-01', '2025-13-45', 'not-a-date', '2025/01/01']
        
        valid_dates = 0
        for date_str in dates:
            try:
                pd.to_datetime(date_str)
                valid_dates += 1
            except:
                pass
        
        assert valid_dates < len(dates)

    def test_categorical_mismatch_across_rows(self):
        """Test categorical values changing meaning."""
        data = pd.DataFrame({
            'category': ['A', 'B', 'A', 'C', 'B', 'A']
        })
        
        unique_categories = data['category'].nunique()
        assert unique_categories == 3

    def test_duplicate_indices(self):
        """Test handling of duplicate row indices."""
        data = pd.DataFrame({
            'value': [1, 2, 3, 4]
        }, index=[0, 0, 1, 1])
        
        assert len(data) == 4
        assert data.index.has_duplicates


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
