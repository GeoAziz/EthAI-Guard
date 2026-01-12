"""Page Object Model package for Selenium E2E tests."""

from .base_page import BasePage
from .login_page import LoginPage
from .dashboard_page import DashboardPage

__all__ = ['BasePage', 'LoginPage', 'DashboardPage']
