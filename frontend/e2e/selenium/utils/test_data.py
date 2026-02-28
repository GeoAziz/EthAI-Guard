"""
Test data constants for Selenium E2E tests.

Provides:
- Test user credentials
- API endpoints
- Expected element locators
- Timeout constants
"""

import os


# Base URLs from environment
BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')


# Test user credentials
# These should match users created in backend or Firebase
TEST_USERS = {
    'user': {
        'email': 'test-user@ethixai.com',
        'password': 'TestUser123!',
        'role': 'user',
    },
    'analyst': {
        'email': 'test-analyst@ethixai.com',
        'password': 'TestAnalyst123!',
        'role': 'analyst',
    },
    'admin': {
        'email': 'test-admin@ethixai.com',
        'password': 'TestAdmin123!',
        'role': 'admin',
    },
    'reviewer': {
        'email': 'test-reviewer@ethixai.com',
        'password': 'TestReviewer123!',
        'role': 'reviewer',
    },
}


# API endpoints
API_ENDPOINTS = {
    'login': f'{BACKEND_URL}/auth/login',
    'user_me': f'{BACKEND_URL}/v1/users/me',
    'refresh': f'{BACKEND_URL}/auth/refresh',
    'logout': f'{BACKEND_URL}/auth/logout',
}


# Frontend routes
ROUTES = {
    'login': f'{BASE_URL}/login',
    'register': f'{BASE_URL}/register',
    'dashboard': f'{BASE_URL}/dashboard',
    'admin_dashboard': f'{BASE_URL}/dashboard/admin',
    'analyst_dashboard': f'{BASE_URL}/dashboard/analyst',
    'reviewer_dashboard': f'{BASE_URL}/dashboard/reviewer',
}


# Timeout constants (in seconds)
TIMEOUTS = {
    'short': 3,
    'default': 10,
    'long': 30,
    'page_load': 30,
}


# Expected element texts by role
EXPECTED_MENU_ITEMS = {
    'user': [
        'Upload Dataset',
        'FairLens',
        'ExplainBoard',
        'Compliance',
    ],
    'admin': [
        'Admin Dashboard',
        'User Management',
        'Access Requests',
        'Org Settings',
        'Fairness Thresholds',
        'Billing',
        'Datasets',
        'Models',
        'Audit Logs',
    ],
    'analyst': [
        'Analyst Dashboard',
        'Run Analysis',
        'Reports',
    ],
    'reviewer': [
        'Reviewer Dashboard',
        'Compliance Reports',
        'Review Queue',
        'Fairness Thresholds',
        'Audit Logs',
    ],
}


# Browser dimensions
BROWSER_SIZE = {
    'width': 1920,
    'height': 1080,
}


# Local storage keys for auth tokens
STORAGE_KEYS = {
    'access_token': 'backend_access_token',
    'refresh_token': 'backend_refresh_token',
}


# Cookie names for auth tokens
COOKIE_NAMES = {
    'access_token': 'accessToken',
    'refresh_token': 'refreshToken',
}
