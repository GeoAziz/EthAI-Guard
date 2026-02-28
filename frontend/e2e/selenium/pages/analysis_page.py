"""

Encapsulates upload and analysis trigger interactions from the dashboard upload form.
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage
import os


class AnalysisPage(BasePage):
    """Page object that wraps dataset upload and analysis trigger."""

    FILE_INPUT = (By.ID, 'file-upload')
    RUN_ANALYSIS_BUTTON = (By.XPATH, "//button[contains(., 'Run Fairness Analysis') or contains(., 'Run Analysis')]")
    READY_STATUS = (By.XPATH, "//*[contains(normalize-space(.), 'Ready to analyze') or contains(normalize-space(.), 'Upload Complete') or contains(normalize-space(.), 'File Ready')]")

    def __init__(self, driver, base_url='http://localhost:3000'):
        super().__init__(driver)
        self.base_url = base_url
        self.url = f"{base_url}/dashboard"

    def navigate(self):
        """Navigate to dashboard (upload form lives on dashboard) and wait for upload control."""
        self.driver.get(self.url)
        self.wait_for_page_load()
        # Wait for file input to be present
        self.wait_for_element(self.FILE_INPUT, timeout=15)

    def wait_for_upload_ready(self, timeout: int = 30) -> bool:
        """Wait until the UI shows the upload is ready for analysis."""
        return self.is_visible(self.READY_STATUS, timeout=timeout)

    def upload_file(self, csv_path: str):
        """Upload CSV file using native file input.

        Args:
            csv_path: Absolute path to CSV file
        """
        assert os.path.isabs(csv_path), "csv_path must be absolute"
        input_el = self.wait_for_element(self.FILE_INPUT, timeout=15)
        # send_keys works even when input is visually hidden
        input_el.send_keys(csv_path)

        # Wait for upload to finish and Run button to be available
        self.wait_for_element(self.RUN_ANALYSIS_BUTTON, timeout=30)

    def run_analysis_and_wait_for_report(self, timeout: int = 120) -> str:
        """Click the Run Analysis button and wait for navigation to /report/{id}.

        Returns:
            report_id (str): extracted id from resulting URL
        """
        run_btn = self.wait_for_element(self.RUN_ANALYSIS_BUTTON, timeout=30)
        # Click using BasePage helper to handle obscured elements
        self.click(self.RUN_ANALYSIS_BUTTON, timeout=30)

        # Wait for URL to change to /report/
        if not self.wait_for_url_contains('/report/', timeout=timeout):
            raise Exception('Timed out waiting for report page to load')

        # Parse report id from URL
        current = self.driver.current_url
        report_id = current.rstrip('/').split('/')[-1]
        return report_id
