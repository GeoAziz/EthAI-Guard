"""
Login Page Object for E2E tests.

Provides methods to interact with the login page including:
- Login form submission
- Error message extraction
- Page validation
"""

from selenium.webdriver.common.by import By
from .base_page import BasePage


class LoginPage(BasePage):
    """Page Object for login page."""
    
    # Locators based on frontend/src/app/login/page.tsx
    EMAIL_INPUT = (By.CSS_SELECTOR, 'input[placeholder="name@example.com"]')
    PASSWORD_INPUT = (By.CSS_SELECTOR, 'input[type="password"]')
    SUBMIT_BUTTON = (By.CSS_SELECTOR, 'button[type="submit"]')
    
    # Alternative locators using labels
    EMAIL_LABEL = (By.XPATH, '//label[text()="Email"]')
    PASSWORD_LABEL = (By.XPATH, '//label[text()="Password"]')
    
    # Error/success messages (Radix toast)
    TOAST_MESSAGE = (By.CSS_SELECTOR, '[data-radix-collection-item]')
    ERROR_TOAST = (By.CSS_SELECTOR, '[data-radix-collection-item][data-state="open"]')
    
    # Page title/heading
    PAGE_TITLE = (By.XPATH, '//h1 | //h2[contains(text(), "Welcome")]')
    
    # Register link
    REGISTER_LINK = (By.XPATH, '//a[@href="/register"]')
    
    def __init__(self, driver, base_url='http://localhost:3000'):
        """
        Initialize Login Page.
        
        Args:
            driver: Selenium WebDriver instance
            base_url: Base URL of the application
        """
        super().__init__(driver)
        self.base_url = base_url
        self.url = f"{base_url}/login"
    
    def navigate(self):
        """Navigate to login page."""
        self.driver.get(self.url)
        self.wait_for_page_load()
    
    def is_login_page(self) -> bool:
        """
        Validate that we're on the login page.
        
        Returns:
            True if on login page, False otherwise
        """
        try:
            # Check for email input and submit button
            return (self.is_visible(self.EMAIL_INPUT, timeout=5) and 
                    self.is_visible(self.SUBMIT_BUTTON, timeout=5))
        except Exception:
            return False
    
    def login(self, email: str, password: str):
        """
        Perform login with given credentials.
        
        Args:
            email: User email
            password: User password
        """
        # Wait for form to be ready
        self.wait_for_element(self.EMAIL_INPUT)
        
        # Fill in credentials
        self.type_text(self.EMAIL_INPUT, email, clear_first=True)
        self.type_text(self.PASSWORD_INPUT, password, clear_first=True)
        
        # Submit form
        self.click(self.SUBMIT_BUTTON)
    
    def get_email_input_value(self) -> str:
        """
        Get current value of email input.
        
        Returns:
            Email input value
        """
        return self.get_attribute(self.EMAIL_INPUT, 'value')
    
    def is_submit_button_disabled(self) -> bool:
        """
        Check if submit button is disabled.
        
        Returns:
            True if button is disabled
        """
        button = self.wait_for_element(self.SUBMIT_BUTTON)
        return button.get_attribute('disabled') is not None
    
    def get_error_message(self, timeout: int = 5) -> str:
        """
        Get error message from toast notification.
        
        Args:
            timeout: Time to wait for error message
            
        Returns:
            Error message text or empty string if no error
        """
        try:
            # Wait for toast to appear
            toast = self.wait_for_element(self.ERROR_TOAST, timeout=timeout)
            return toast.text
        except Exception:
            return ""
    
    def has_error_message(self, timeout: int = 5) -> bool:
        """
        Check if error message is displayed.
        
        Args:
            timeout: Time to wait for error message
            
        Returns:
            True if error message visible
        """
        return self.is_visible(self.ERROR_TOAST, timeout=timeout)
    
    def wait_for_redirect(self, expected_url_part: str, timeout: int = 10) -> bool:
        """
        Wait for redirect after login.
        
        Args:
            expected_url_part: String expected in redirected URL
            timeout: Time to wait for redirect
            
        Returns:
            True if redirected to expected URL
        """
        return self.wait_for_url_contains(expected_url_part, timeout=timeout)
    
    def click_register_link(self):
        """Click the 'Sign up' link to go to registration page."""
        self.click(self.REGISTER_LINK)
