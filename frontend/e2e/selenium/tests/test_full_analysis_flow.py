import os
import pytest

from pages.dashboard_page import DashboardPage
from pages.analysis_page import AnalysisPage
from pages.report_page import ReportPage


@pytest.mark.critical
def test_full_analysis_flow(analyst_browser, base_url, backend_url):
    """Golden-path end-to-end analysis flow for an authenticated analyst.

    Steps:
      - Use auth-bypass analyst_browser fixture
      - Open dashboard and navigate to Upload Dataset
      - Upload a valid CSV file (demo dataset)
      - Trigger analysis and wait for redirect to report
      - Assert report page loads, fairness metrics present, and SHAP/explainability visible
    """
    driver = analyst_browser

    # Navigate to dashboard and open upload form
    dashboard = DashboardPage(driver, base_url)
    dashboard.navigate()
    dashboard.click_menu_item('Upload Dataset')

    # Interact with upload/analysis UI
    analysis = AnalysisPage(driver, base_url)

    # Locate demo CSV in repo
    csv_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', '..', '..', 'docs', 'example_data', 'demo_loan_dataset.csv'
    ))
    if not os.path.exists(csv_path):
        # fallback to repo-level docs path (safety)
        csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'docs', 'example_data', 'demo_loan_dataset.csv'))

    assert os.path.exists(csv_path), f"Sample CSV not found at {csv_path}"

    # Upload and run analysis (no hard sleeps; explicit waits used inside page objects)
    analysis.upload_file(csv_path)
    report_id = analysis.run_analysis_and_wait_for_report(timeout=180)

    # Validate report page
    report_page = ReportPage(driver, base_url)
    assert report_page.wait_for_report_load(timeout=60), "Report page did not load"

    assert report_page.fairness_metrics_present(), "Fairness metrics (DI/EOD/SP) not rendered"
    assert report_page.shap_present(), "No SHAP / explainability component visible"

    print(f"✓ Full analysis flow passed. Report ID: {report_id}")
