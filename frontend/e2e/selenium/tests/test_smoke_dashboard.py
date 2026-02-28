"""
Smoke tests for dashboard functionality.

These tests validate the golden-path user flows:
1. Authenticated user can load dashboard
2. Unauthenticated user redirects to login
3. Cross-browser compatibility (Chrome + Firefox)
"""

import pytest
import time
from pages.dashboard_page import DashboardPage
from pages.login_page import LoginPage
from utils.test_data import ROUTES


@pytest.mark.smoke
def test_authenticated_user_can_load_dashboard(authenticated_browser, base_url):
    """
    Golden-path smoke test:
    1. Inject auth tokens (no UI login)
    2. Navigate to /dashboard
    3. Verify dashboard loads (sidebar visible, header present)
    4. Verify user nav shows authenticated state
    5. Screenshot on success for visual baseline
    """
    driver = authenticated_browser
    
    # Initialize page object
    dashboard = DashboardPage(driver, base_url)
    
    # Navigate to dashboard
    dashboard.navigate()
    
    # Verify dashboard is fully loaded
    assert dashboard.is_dashboard_loaded(), "Dashboard did not load properly"
    
    # Verify sidebar is visible
    assert dashboard.is_sidebar_visible(), "Sidebar is not visible"
    
    # Verify header is visible
    assert dashboard.is_header_visible(), "Header is not visible"
    
    # Verify user nav is visible (authenticated state)
    assert dashboard.is_user_nav_visible(), "User navigation is not visible"
    
    # Verify main content area is present
    assert dashboard.wait_for_main_content(), "Main content area not visible"
    
    # Capture success screenshot for visual baseline
    screenshot_path = dashboard.capture_screenshot("dashboard_authenticated_success.png")
    print(f"\n✓ Dashboard loaded successfully. Screenshot: {screenshot_path}")


@pytest.mark.smoke
@pytest.mark.parametrize("browser", ["chrome"], indirect=True)
def test_authenticated_user_can_load_dashboard_chrome(browser, base_url, backend_url):
    """
    Golden-path smoke test for Chrome browser.
    
    Tests:
    1. Inject auth tokens (no UI login)
    2. Navigate to /dashboard
    3. Verify dashboard loads (sidebar visible, header present)
    4. Verify user nav shows authenticated state
    """
    # Import here to avoid circular dependency
    from utils.auth_helpers import create_authenticated_session
    
    # Create authenticated session
    create_authenticated_session(browser, backend_url, role='user')
    
    # Initialize page object
    dashboard = DashboardPage(browser, base_url)
    
    # Navigate to dashboard
    dashboard.navigate()
    
    # Verify dashboard is fully loaded
    assert dashboard.is_dashboard_loaded(), "Dashboard did not load properly"
    
    # Verify sidebar is visible
    assert dashboard.is_sidebar_visible(), "Sidebar is not visible"
    
    # Verify header is visible
    assert dashboard.is_header_visible(), "Header is not visible"
    
    # Verify user nav is visible (authenticated state)
    assert dashboard.is_user_nav_visible(), "User navigation is not visible"
    
    print("\n✓ Chrome: Dashboard loaded successfully")


@pytest.mark.smoke
def test_unauthenticated_redirects_to_login(chrome_driver, base_url):
    """
    Validates auth guard:
    1. Navigate to /dashboard without auth
    2. Verify redirect to /login
    """
    driver = chrome_driver
    
    # Initialize page objects
    dashboard = DashboardPage(driver, base_url)
    login_page = LoginPage(driver, base_url)
    
    # Navigate to dashboard without authentication
    dashboard.navigate()
    
    # Wait for redirect to login page
    redirected = login_page.wait_for_redirect('/login', timeout=10)
    
    assert redirected, "Did not redirect to login page"
    
    # Verify we're on the login page
    assert login_page.is_login_page(), "Not on login page after redirect"
    
    print("\n✓ Unauthenticated user correctly redirected to login")


@pytest.mark.smoke
def test_admin_user_sees_admin_dashboard(admin_browser, base_url):
    """
    Test that admin user sees admin-specific menu items.
    
    1. Inject admin auth tokens
    2. Navigate to /dashboard
    3. Verify admin-specific menu items are present
    """
    driver = admin_browser
    
    # Initialize page object
    dashboard = DashboardPage(driver, base_url)
    
    # Navigate to dashboard
    dashboard.navigate()
    
    # Verify dashboard loads
    assert dashboard.is_dashboard_loaded(), "Dashboard did not load"
    
    # Verify admin dashboard is shown
    assert dashboard.is_admin_dashboard(), "Admin menu items not present"
    
    # Get sidebar items
    menu_items = dashboard.get_sidebar_items()
    print(f"\n✓ Admin menu items: {menu_items}")
    
    # Verify some expected admin items
    assert any('Admin' in item for item in menu_items), "No 'Admin' item in menu"


@pytest.mark.smoke
def test_analyst_user_sees_analyst_dashboard(analyst_browser, base_url):
    """
    Test that analyst user sees analyst-specific menu items.
    
    1. Inject analyst auth tokens
    2. Navigate to /dashboard
    3. Verify analyst-specific menu items are present
    """
    driver = analyst_browser
    
    # Initialize page object
    dashboard = DashboardPage(driver, base_url)
    
    # Navigate to dashboard
    dashboard.navigate()
    
    # Verify dashboard loads
    assert dashboard.is_dashboard_loaded(), "Dashboard did not load"
    
    # Verify analyst dashboard is shown
    assert dashboard.is_analyst_dashboard(), "Analyst menu items not present"
    
    # Get sidebar items
    menu_items = dashboard.get_sidebar_items()
    print(f"\n✓ Analyst menu items: {menu_items}")
    
    # Verify some expected analyst items
    assert any('Analyst' in item for item in menu_items), "No 'Analyst' item in menu"


@pytest.mark.smoke
def test_dashboard_sidebar_items_visible(authenticated_browser, base_url):
    """
    Test that sidebar menu items are visible and accessible.
    
    1. Load authenticated dashboard
    2. Verify sidebar menu items are present
    3. Verify menu items contain expected text
    """
    driver = authenticated_browser
    
    # Initialize page object
    dashboard = DashboardPage(driver, base_url)
    
    # Navigate to dashboard
    dashboard.navigate()
    
    # Verify dashboard loads
    assert dashboard.is_dashboard_loaded(), "Dashboard did not load"
    
    # Get sidebar items
    menu_items = dashboard.get_sidebar_items()
    
    # Verify we have menu items
    assert len(menu_items) > 0, "No sidebar menu items found"
    
    print(f"\n✓ Found {len(menu_items)} sidebar items: {menu_items}")
    
    # For user role, expect base menu items
    # (Upload Dataset, FairLens, ExplainBoard, Compliance)
    # Note: The exact items depend on the role
    assert len(menu_items) >= 3, f"Expected at least 3 menu items, got {len(menu_items)}"


@pytest.mark.smoke
def test_dashboard_page_title_displayed(authenticated_browser, base_url):
    """
    Test that dashboard page title is displayed in header.
    
    1. Load authenticated dashboard
    2. Verify page title is visible in header
    3. Verify title text is not empty
    """
    driver = authenticated_browser
    
    # Initialize page object
    dashboard = DashboardPage(driver, base_url)
    
    # Navigate to dashboard
    dashboard.navigate()
    
    # Verify dashboard loads
    assert dashboard.is_dashboard_loaded(), "Dashboard did not load"
    
    # Get page title
    title = dashboard.get_current_page_title()
    
    # Verify title is not empty
    assert title and len(title) > 0, "Page title is empty"
    
    print(f"\n✓ Page title: '{title}'")


@pytest.mark.regression
def test_dashboard_responsive_on_mobile_size(authenticated_browser, base_url):
    """
    Test that dashboard is responsive on mobile viewport.
    
    1. Set mobile viewport size
    2. Load dashboard
    3. Verify sidebar and header adapt
    """
    driver = authenticated_browser
    
    # Set mobile viewport
    driver.set_window_size(375, 812)  # iPhone X size
    
    # Initialize page object
    dashboard = DashboardPage(driver, base_url)
    
    # Navigate to dashboard
    dashboard.navigate()
    
    # Verify dashboard loads
    assert dashboard.is_dashboard_loaded(), "Dashboard did not load on mobile"
    
    # Verify header is still visible
    assert dashboard.is_header_visible(), "Header not visible on mobile"
    
    # Capture screenshot
    screenshot_path = dashboard.capture_screenshot("dashboard_mobile_responsive.png")
    print(f"\n✓ Mobile responsive test passed. Screenshot: {screenshot_path}")
    
    # Restore desktop size
    driver.set_window_size(1920, 1080)
