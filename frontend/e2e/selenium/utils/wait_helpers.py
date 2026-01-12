"""
Wait helper utilities for Selenium E2E tests.

Provides explicit wait functions using Expected Conditions.
"""

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.common.exceptions import TimeoutException


def wait_for_element(driver: WebDriver, locator: tuple, timeout: int = 10):
    """
    Wait for element to be visible.
    
    Args:
        driver: Selenium WebDriver instance
        locator: Tuple of (By.*, 'value')
        timeout: Maximum time to wait in seconds
        
    Returns:
        WebElement when found
        
    Raises:
        TimeoutException: If element not found within timeout
    """
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.visibility_of_element_located(locator))


def wait_for_element_clickable(driver: WebDriver, locator: tuple, timeout: int = 10):
    """
    Wait for element to be clickable.
    
    Args:
        driver: Selenium WebDriver instance
        locator: Tuple of (By.*, 'value')
        timeout: Maximum time to wait in seconds
        
    Returns:
        WebElement when clickable
        
    Raises:
        TimeoutException: If element not clickable within timeout
    """
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.element_to_be_clickable(locator))


def wait_for_elements(driver: WebDriver, locator: tuple, timeout: int = 10):
    """
    Wait for multiple elements to be present.
    
    Args:
        driver: Selenium WebDriver instance
        locator: Tuple of (By.*, 'value')
        timeout: Maximum time to wait in seconds
        
    Returns:
        List of WebElements
        
    Raises:
        TimeoutException: If elements not found within timeout
    """
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.presence_of_all_elements_located(locator))


def wait_for_url_contains(driver: WebDriver, url_part: str, timeout: int = 10) -> bool:
    """
    Wait for URL to contain specified string.
    
    Args:
        driver: Selenium WebDriver instance
        url_part: String that should be in URL
        timeout: Maximum time to wait in seconds
        
    Returns:
        True if URL contains string within timeout, False otherwise
    """
    wait = WebDriverWait(driver, timeout)
    try:
        wait.until(EC.url_contains(url_part))
        return True
    except TimeoutException:
        return False


def wait_for_url_to_be(driver: WebDriver, url: str, timeout: int = 10) -> bool:
    """
    Wait for URL to be exactly as specified.
    
    Args:
        driver: Selenium WebDriver instance
        url: Expected URL
        timeout: Maximum time to wait in seconds
        
    Returns:
        True if URL matches within timeout, False otherwise
    """
    wait = WebDriverWait(driver, timeout)
    try:
        wait.until(EC.url_to_be(url))
        return True
    except TimeoutException:
        return False


def wait_for_page_load(driver: WebDriver, timeout: int = 30):
    """
    Wait for page to finish loading (document.readyState == 'complete').
    
    Args:
        driver: Selenium WebDriver instance
        timeout: Maximum time to wait in seconds
        
    Raises:
        TimeoutException: If page doesn't load within timeout
    """
    wait = WebDriverWait(driver, timeout)
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")


def wait_for_element_to_disappear(driver: WebDriver, locator: tuple, timeout: int = 10) -> bool:
    """
    Wait for element to become invisible or removed from DOM.
    
    Args:
        driver: Selenium WebDriver instance
        locator: Tuple of (By.*, 'value')
        timeout: Maximum time to wait in seconds
        
    Returns:
        True if element disappeared within timeout, False otherwise
    """
    wait = WebDriverWait(driver, timeout)
    try:
        wait.until(EC.invisibility_of_element_located(locator))
        return True
    except TimeoutException:
        return False


def wait_for_text_in_element(driver: WebDriver, locator: tuple, text: str, timeout: int = 10) -> bool:
    """
    Wait for specific text to appear in element.
    
    Args:
        driver: Selenium WebDriver instance
        locator: Tuple of (By.*, 'value')
        text: Expected text in element
        timeout: Maximum time to wait in seconds
        
    Returns:
        True if text appears within timeout, False otherwise
    """
    wait = WebDriverWait(driver, timeout)
    try:
        wait.until(EC.text_to_be_present_in_element(locator, text))
        return True
    except TimeoutException:
        return False
