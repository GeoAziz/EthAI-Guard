"""
Dashboard Page Object for E2E tests.

Provides methods to interact with the dashboard including:
- Role-based dashboard validation
- Sidebar menu validation
- Header and user nav checks
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage


class DashboardPage(BasePage):
    """Page Object for dashboard page."""
    
    # Locators based on frontend/src/app/dashboard/layout.tsx
    # Sidebar elements (using data-sidebar attribute from sidebar.tsx)
    SIDEBAR = (By.CSS_SELECTOR, '[data-sidebar="sidebar"]')
    SIDEBAR_HEADER = (By.CSS_SELECTOR, '[data-sidebar="header"]')
    SIDEBAR_CONTENT = (By.CSS_SELECTOR, '[data-sidebar="content"]')
    SIDEBAR_FOOTER = (By.CSS_SELECTOR, '[data-sidebar="footer"]')
    
    # Header elements
    HEADER = (By.TAG_NAME, 'header')
    PAGE_TITLE = (By.CSS_SELECTOR, 'header h1')
    
    # User navigation (UserNav component)
    USER_NAV = (By.CSS_SELECTOR, 'header button')  # UserNav renders as a button
    
    # Theme toggle
    THEME_TOGGLE = (By.CSS_SELECTOR, '[aria-label*="theme" i], [aria-label*="Toggle theme" i]')
    
    # Main content area
    MAIN_CONTENT = (By.TAG_NAME, 'main')
    
    # Sidebar menu items (generic)
    SIDEBAR_MENU_ITEMS = (By.CSS_SELECTOR, '[data-sidebar="content"] a')
    
    # Role-specific menu items
    ADMIN_DASHBOARD_LINK = (By.XPATH, '//a[@href="/dashboard/admin"]')
    ANALYST_DASHBOARD_LINK = (By.XPATH, '//a[@href="/dashboard/analyst"]')
    REVIEWER_DASHBOARD_LINK = (By.XPATH, '//a[@href="/dashboard/reviewer"]')
    
    # Common menu items
    UPLOAD_DATASET_LINK = (By.XPATH, '//a[@href="/dashboard"]')
    FAIRLENS_LINK = (By.XPATH, '//a[@href="/dashboard/fairlens"]')
    EXPLAINBOARD_LINK = (By.XPATH, '//a[@href="/dashboard/explainboard"]')
    COMPLIANCE_LINK = (By.XPATH, '//a[@href="/dashboard/compliance"]')
    
    # Settings and support
    SETTINGS_LINK = (By.XPATH, '//a[@href="/dashboard/settings"]')
    SUPPORT_BUTTON = (By.XPATH, '//*[contains(text(), "Support")]')
    
    def __init__(self, driver, base_url='http://localhost:3000'):
        """
        Initialize Dashboard Page.
        
        Args:
            driver: Selenium WebDriver instance
            base_url: Base URL of the application
        """
        super().__init__(driver)
        self.base_url = base_url
        self.url = f"{base_url}/dashboard"
    
    def navigate(self):
        """Navigate to dashboard page."""
        self.driver.get(self.url)
        self.wait_for_page_load()
    
    def is_dashboard_loaded(self, timeout: int = 10) -> bool:
        """
        Check if dashboard is fully loaded.
        
        Validates that both sidebar and header are present,
        indicating the dashboard layout has rendered.
        
        Args:
            timeout: Time to wait for dashboard to load
            
        Returns:
            True if dashboard is loaded
        """
        try:
            # Wait for sidebar and header to be visible
            self.wait_for_element(self.SIDEBAR, timeout=timeout)
            self.wait_for_element(self.HEADER, timeout=timeout)
            return True
        except Exception:
            return False
    
    def get_current_page_title(self) -> str:
        """
        Get current page title from header.
        
        Returns:
            Page title text
        """
        return self.get_text(self.PAGE_TITLE)
    
    def get_sidebar_items(self) -> list:
        """
        Get list of sidebar menu items.
        
        Returns:
            List of sidebar menu item texts
        """
        elements = self.wait_for_elements(self.SIDEBAR_MENU_ITEMS)
        return [elem.text for elem in elements if elem.text.strip()]
    
    def is_sidebar_visible(self) -> bool:
        """
        Check if sidebar is visible.
        
        Returns:
            True if sidebar is visible
        """
        return self.is_visible(self.SIDEBAR, timeout=5)
    
    def is_header_visible(self) -> bool:
        """
        Check if header is visible.
        
        Returns:
            True if header is visible
        """
        return self.is_visible(self.HEADER, timeout=5)
    
    def is_user_nav_visible(self) -> bool:
        """
        Check if user navigation is visible (indicates authenticated state).
        
        Returns:
            True if user nav is visible
        """
        return self.is_visible(self.USER_NAV, timeout=5)
    
    def is_admin_dashboard(self) -> bool:
        """
        Check if current dashboard is admin dashboard.
        
        Returns:
            True if admin-specific menu items are present
        """
        return self.is_present(self.ADMIN_DASHBOARD_LINK, timeout=3)
    
    def is_analyst_dashboard(self) -> bool:
        """
        Check if current dashboard is analyst dashboard.
        
        Returns:
            True if analyst-specific menu items are present
        """
        return self.is_present(self.ANALYST_DASHBOARD_LINK, timeout=3)
    
    def is_reviewer_dashboard(self) -> bool:
        """
        Check if current dashboard is reviewer dashboard.
        
        Returns:
            True if reviewer-specific menu items are present
        """
        return self.is_present(self.REVIEWER_DASHBOARD_LINK, timeout=3)
    
    def is_user_dashboard(self) -> bool:
        """
        Check if current dashboard is standard user dashboard.
        
        Returns:
            True if user-specific menu items are present (not admin/analyst/reviewer)
        """
        # User dashboard has base menu items but not role-specific items
        has_base_items = (self.is_present(self.FAIRLENS_LINK, timeout=3) or 
                         self.is_present(self.EXPLAINBOARD_LINK, timeout=3))
        has_admin = self.is_present(self.ADMIN_DASHBOARD_LINK, timeout=2)
        has_analyst = self.is_present(self.ANALYST_DASHBOARD_LINK, timeout=2)
        has_reviewer = self.is_present(self.REVIEWER_DASHBOARD_LINK, timeout=2)
        
        return has_base_items and not (has_admin or has_analyst or has_reviewer)
    
    def click_menu_item(self, item_text: str):
        """
        Click sidebar menu item by text.
        
        Args:
            item_text: Text of menu item to click
        """
        locator = (By.XPATH, f'//a[contains(text(), "{item_text}")]')
        self.click(locator)
    
    def wait_for_main_content(self, timeout: int = 10) -> bool:
        """
        Wait for main content area to be visible.
        
        Args:
            timeout: Time to wait
            
        Returns:
            True if main content is visible
        """
        return self.is_visible(self.MAIN_CONTENT, timeout=timeout)
