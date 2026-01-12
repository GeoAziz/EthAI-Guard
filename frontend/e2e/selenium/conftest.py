"""
Pytest configuration and fixtures for Selenium E2E tests.

This module provides:
- Browser setup fixtures (Chrome, Firefox)
- Screenshot on failure functionality
- Auth bypass fixtures
- Shared test configuration
"""

import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from utils.auth_helpers import create_authenticated_session


# Configuration from environment variables
BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
HEADLESS = os.getenv('HEADLESS', 'true').lower() == 'true'
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), 'reports', 'screenshots')


def pytest_configure(config):
    """Create necessary directories for test artifacts."""
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'reports'), exist_ok=True)


@pytest.fixture(scope='session')
def base_url():
    """Provide base URL for the application."""
    return BASE_URL


@pytest.fixture(scope='session')
def backend_url():
    """Provide backend API URL."""
    return BACKEND_URL


@pytest.fixture
def chrome_options():
    """Configure Chrome browser options."""
    options = ChromeOptions()
    
    if HEADLESS:
        options.add_argument('--headless=new')
    
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--disable-extensions')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option('excludeSwitches', ['enable-logging'])
    options.add_experimental_option('useAutomationExtension', False)
    
    return options


@pytest.fixture
def firefox_options():
    """Configure Firefox browser options."""
    options = FirefoxOptions()
    
    if HEADLESS:
        options.add_argument('--headless')
    
    options.add_argument('--width=1920')
    options.add_argument('--height=1080')
    
    return options


@pytest.fixture
def chrome_driver(chrome_options):
    """Create and configure Chrome WebDriver instance."""
    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.implicitly_wait(5)
    
    yield driver
    
    driver.quit()


@pytest.fixture
def firefox_driver(firefox_options):
    """Create and configure Firefox WebDriver instance."""
    service = FirefoxService(GeckoDriverManager().install())
    driver = webdriver.Firefox(service=service, options=firefox_options)
    driver.implicitly_wait(5)
    
    yield driver
    
    driver.quit()


@pytest.fixture(params=['chrome', 'firefox'])
def driver(request, chrome_driver, firefox_driver):
    """Parametrized fixture for cross-browser testing."""
    if request.param == 'chrome':
        return chrome_driver
    elif request.param == 'firefox':
        return firefox_driver
    else:
        raise ValueError(f"Unknown browser: {request.param}")


@pytest.fixture
def browser(request, chrome_driver):
    """Single browser fixture (Chrome by default)."""
    browser_name = request.param if hasattr(request, 'param') else 'chrome'
    
    if browser_name == 'chrome':
        return chrome_driver
    elif browser_name == 'firefox':
        # This requires firefox_driver to be available
        pytest.skip("Firefox driver not available in this fixture")
    
    return chrome_driver


@pytest.fixture
def authenticated_browser(browser, base_url, backend_url):
    """
    Provide an authenticated browser session.
    
    This fixture injects auth tokens to bypass UI login,
    avoiding flaky form interactions.
    """
    create_authenticated_session(browser, backend_url, role='user')
    
    yield browser


@pytest.fixture
def admin_browser(browser, base_url, backend_url):
    """Provide an authenticated browser session with admin role."""
    create_authenticated_session(browser, backend_url, role='admin')
    
    yield browser


@pytest.fixture
def analyst_browser(browser, base_url, backend_url):
    """Provide an authenticated browser session with analyst role."""
    create_authenticated_session(browser, backend_url, role='analyst')
    
    yield browser


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Capture screenshots on test failure.
    
    This hook runs after each test and captures a screenshot
    if the test failed and a browser instance is available.
    """
    outcome = yield
    report = outcome.get_result()
    
    if report.when == 'call' and report.failed:
        # Try to get the driver from the test fixtures
        driver = None
        for fixture_name in ['browser', 'chrome_driver', 'firefox_driver', 
                            'authenticated_browser', 'admin_browser', 'analyst_browser']:
            if fixture_name in item.funcargs:
                driver = item.funcargs[fixture_name]
                break
        
        if driver:
            try:
                screenshot_name = f"{item.nodeid.replace('::', '_').replace('/', '_')}.png"
                screenshot_path = os.path.join(SCREENSHOT_DIR, screenshot_name)
                driver.save_screenshot(screenshot_path)
                print(f"\nScreenshot saved: {screenshot_path}")
                
                # Attach to HTML report if pytest-html is available
                if hasattr(report, 'extras'):
                    report.extras.append(pytest.html.extras.image(screenshot_path))
            except Exception as e:
                print(f"\nFailed to capture screenshot: {e}")
