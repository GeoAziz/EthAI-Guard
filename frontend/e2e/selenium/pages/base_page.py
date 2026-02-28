"""
Base Page Object class providing common functionality for all page objects.

This class provides:
- WebDriverWait wrapper with configurable timeout
- Common element interaction methods
- Screenshot capture on failure
- JavaScript executor helpers
- Explicit wait helpers
"""

import os
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, ElementClickInterceptedException
from selenium.webdriver.remote.webdriver import WebDriver


class BasePage:
    """Base page object with common element interaction methods."""
    
    DEFAULT_TIMEOUT = 10
    
    def __init__(self, driver: WebDriver, timeout: int = DEFAULT_TIMEOUT):
        """
        Initialize base page.
        
        Args:
            driver: Selenium WebDriver instance
            timeout: Default timeout for waits in seconds
        """
        self.driver = driver
        self.timeout = timeout
        self.wait = WebDriverWait(driver, timeout)
    
    def wait_for_element(self, locator: tuple, timeout: int = None) -> object:
        """
        Wait for element to be present and visible.
        
        Args:
            locator: Tuple of (By.*, 'value')
            timeout: Optional custom timeout
            
        Returns:
            WebElement when found
            
        Raises:
            TimeoutException: If element not found within timeout
        """
        wait_time = timeout or self.timeout
        wait = WebDriverWait(self.driver, wait_time)
        return wait.until(EC.visibility_of_element_located(locator))
    
    def wait_for_element_clickable(self, locator: tuple, timeout: int = None) -> object:
        """
        Wait for element to be clickable.
        
        Args:
            locator: Tuple of (By.*, 'value')
            timeout: Optional custom timeout
            
        Returns:
            WebElement when clickable
        """
        wait_time = timeout or self.timeout
        wait = WebDriverWait(self.driver, wait_time)
        return wait.until(EC.element_to_be_clickable(locator))
    
    def wait_for_elements(self, locator: tuple, timeout: int = None) -> list:
        """
        Wait for multiple elements to be present.
        
        Args:
            locator: Tuple of (By.*, 'value')
            timeout: Optional custom timeout
            
        Returns:
            List of WebElements
        """
        wait_time = timeout or self.timeout
        wait = WebDriverWait(self.driver, wait_time)
        return wait.until(EC.presence_of_all_elements_located(locator))
    
    def click(self, locator: tuple, timeout: int = None):
        """
        Click an element with fallback to JavaScript click.
        
        Args:
            locator: Tuple of (By.*, 'value')
            timeout: Optional custom timeout
        """
        element = self.wait_for_element_clickable(locator, timeout)
        try:
            element.click()
        except ElementClickInterceptedException:
            # Fallback to JavaScript click if element is obscured
            self.js_click(element)
    
    def type_text(self, locator: tuple, text: str, timeout: int = None, clear_first: bool = True):
        """
        Type text into an input field.
        
        Args:
            locator: Tuple of (By.*, 'value')
            text: Text to type
            timeout: Optional custom timeout
            clear_first: Whether to clear field before typing
        """
        element = self.wait_for_element(locator, timeout)
        if clear_first:
            element.clear()
        element.send_keys(text)
    
    def get_text(self, locator: tuple, timeout: int = None) -> str:
        """
        Get text content of an element.
        
        Args:
            locator: Tuple of (By.*, 'value')
            timeout: Optional custom timeout
            
        Returns:
            Text content of the element
        """
        element = self.wait_for_element(locator, timeout)
        return element.text
    
    def is_visible(self, locator: tuple, timeout: int = 3) -> bool:
        """
        Check if element is visible.
        
        Args:
            locator: Tuple of (By.*, 'value')
            timeout: Timeout in seconds (shorter default for checks)
            
        Returns:
            True if visible, False otherwise
        """
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.visibility_of_element_located(locator))
            return True
        except TimeoutException:
            return False
    
    def is_present(self, locator: tuple, timeout: int = 3) -> bool:
        """
        Check if element is present in DOM.
        
        Args:
            locator: Tuple of (By.*, 'value')
            timeout: Timeout in seconds
            
        Returns:
            True if present, False otherwise
        """
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.presence_of_element_located(locator))
            return True
        except TimeoutException:
            return False
    
    def js_click(self, element):
        """
        Click element using JavaScript executor.
        
        Args:
            element: WebElement to click
        """
        self.driver.execute_script("arguments[0].click();", element)
    
    def scroll_to_element(self, element):
        """
        Scroll to bring element into view.
        
        Args:
            element: WebElement to scroll to
        """
        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
    
    def scroll_to_locator(self, locator: tuple, timeout: int = None):
        """
        Scroll to element specified by locator.
        
        Args:
            locator: Tuple of (By.*, 'value')
            timeout: Optional custom timeout
        """
        element = self.wait_for_element(locator, timeout)
        self.scroll_to_element(element)
    
    def wait_for_url_contains(self, url_part: str, timeout: int = None) -> bool:
        """
        Wait for URL to contain specified string.
        
        Args:
            url_part: String that should be in URL
            timeout: Optional custom timeout
            
        Returns:
            True if URL contains string within timeout
        """
        wait_time = timeout or self.timeout
        wait = WebDriverWait(self.driver, wait_time)
        try:
            wait.until(EC.url_contains(url_part))
            return True
        except TimeoutException:
            return False
    
    def wait_for_page_load(self, timeout: int = 30):
        """
        Wait for page to finish loading.
        
        Args:
            timeout: Maximum time to wait
        """
        wait = WebDriverWait(self.driver, timeout)
        wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")
    
    def capture_screenshot(self, filename: str) -> str:
        """
        Capture screenshot and save to file.
        
        Args:
            filename: Name of screenshot file
            
        Returns:
            Full path to saved screenshot
        """
        screenshot_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'reports', 'screenshots')
        os.makedirs(screenshot_dir, exist_ok=True)
        
        filepath = os.path.join(screenshot_dir, filename)
        self.driver.save_screenshot(filepath)
        return filepath
    
    def get_attribute(self, locator: tuple, attribute: str, timeout: int = None) -> str:
        """
        Get attribute value from element.
        
        Args:
            locator: Tuple of (By.*, 'value')
            attribute: Name of attribute
            timeout: Optional custom timeout
            
        Returns:
            Attribute value
        """
        element = self.wait_for_element(locator, timeout)
        return element.get_attribute(attribute)
