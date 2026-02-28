"""
Report Page Object for E2E tests.

Provides assertions for report load, fairness metrics rendering (DI, EOD, SP)
and presence of explainability (SHAP) outputs.
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage


class ReportPage(BasePage):
    """Page object to interact with the /report/{id} view."""

    FAIRNESS_TITLE = (By.XPATH, "//*[contains(normalize-space(.), 'Fairness Metrics')]")
    EXPLAIN_TITLE = (By.XPATH, "//*[contains(normalize-space(.), 'Explainability (SHAP)')]")

    STATISTICAL_PARITY = (By.XPATH, "//*[contains(text(), 'Statistical Parity')]")
    EQUAL_OPPORTUNITY = (By.XPATH, "//*[contains(text(), 'Equal Opportunity')]")
    DISPARATE_IMPACT = (By.XPATH, "//*[contains(text(), 'Disparate Impact')]")

    SHAP_IMG = (By.XPATH, "//img[contains(translate(@alt, 'SHAP', 'shap'), 'shap')]")
    PERCENT_TEXT = (By.XPATH, "//*[contains(text(), '%')]")

    def __init__(self, driver, base_url='http://localhost:3000'):
        super().__init__(driver)
        self.base_url = base_url

    def wait_for_report_load(self, timeout: int = 30) -> bool:
        """Wait for report page main sections to render."""
        # Wait for fairness title and explainability title
        self.wait_for_element(self.FAIRNESS_TITLE, timeout=timeout)
        self.wait_for_element(self.EXPLAIN_TITLE, timeout=timeout)
        return True

    def fairness_metrics_present(self) -> bool:
        """Assert the three core fairness metric labels are present."""
        return (
            self.is_present(self.STATISTICAL_PARITY, timeout=5) and
            self.is_present(self.EQUAL_OPPORTUNITY, timeout=5) and
            self.is_present(self.DISPARATE_IMPACT, timeout=5)
        )

    def shap_present(self) -> bool:
        """Return True when at least one SHAP/explainability component is visible.

        We consider either an image with alt text containing "SHAP" or
        presence of any percent value in the explainability area as evidence.
        """
        # Check for explicit SHAP image
        if self.is_present(self.SHAP_IMG, timeout=3):
            return True

        # As a fallback, check for any percentage text on the page (feature importances)
        return self.is_present(self.PERCENT_TEXT, timeout=3)
