"""
Authentication helper utilities for E2E tests.

Provides functions to:
- Inject JWT tokens as cookies or localStorage
- Get test tokens from backend API
- Create authenticated browser sessions without UI login
"""

import requests
from selenium.webdriver.remote.webdriver import WebDriver
from .test_data import TEST_USERS, API_ENDPOINTS, BASE_URL, STORAGE_KEYS, COOKIE_NAMES


def get_test_tokens(role: str = 'user', backend_url: str = None) -> dict:
    """
    Get valid access and refresh tokens for a test user.
    
    Calls the backend /auth/login endpoint to obtain real tokens.
    
    Args:
        role: Role of test user ('user', 'admin', 'analyst', 'reviewer')
        backend_url: Optional backend URL override
        
    Returns:
        Dict with 'accessToken' and 'refreshToken' keys
        
    Raises:
        Exception: If login fails or user not found
    """
    if role not in TEST_USERS:
        raise ValueError(f"Unknown role: {role}. Must be one of {list(TEST_USERS.keys())}")
    
    user = TEST_USERS[role]
    endpoint = API_ENDPOINTS['login']
    
    if backend_url:
        endpoint = f"{backend_url}/auth/login"
    
    # Prepare login payload
    payload = {
        'email': user['email'],
        'password': user['password'],
        'deviceName': f'selenium-test-{role}',
    }
    
    try:
        # Call backend login API
        response = requests.post(endpoint, json=payload, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract tokens
        access_token = data.get('accessToken')
        refresh_token = data.get('refreshToken')
        
        if not access_token:
            raise Exception(f"No access token in response: {data}")
        
        return {
            'accessToken': access_token,
            'refreshToken': refresh_token,
        }
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to get test tokens for {role}: {str(e)}")


def inject_auth_cookies(driver: WebDriver, access_token: str, refresh_token: str = None):
    """
    Inject JWT tokens as cookies into browser session.
    
    Args:
        driver: Selenium WebDriver instance
        access_token: JWT access token
        refresh_token: Optional JWT refresh token
    """
    # First navigate to the domain to set cookies
    driver.get(BASE_URL)
    
    # Add access token cookie
    driver.add_cookie({
        'name': COOKIE_NAMES['access_token'],
        'value': access_token,
        'path': '/',
        'secure': False,
        'httpOnly': False,
    })
    
    # Add refresh token cookie if provided
    if refresh_token:
        driver.add_cookie({
            'name': COOKIE_NAMES['refresh_token'],
            'value': refresh_token,
            'path': '/',
            'secure': False,
            'httpOnly': False,
        })


def inject_auth_localStorage(driver: WebDriver, access_token: str, refresh_token: str = None):
    """
    Inject JWT tokens into localStorage.
    
    According to the frontend code, the app reads from localStorage first,
    then checks cookies.
    
    Args:
        driver: Selenium WebDriver instance
        access_token: JWT access token
        refresh_token: Optional JWT refresh token
    """
    # First navigate to the domain
    driver.get(BASE_URL)
    
    # Set tokens in localStorage using JavaScript
    driver.execute_script(
        f"localStorage.setItem('{STORAGE_KEYS['access_token']}', '{access_token}');"
    )
    
    if refresh_token:
        driver.execute_script(
            f"localStorage.setItem('{STORAGE_KEYS['refresh_token']}', '{refresh_token}');"
        )


def create_authenticated_session(driver: WebDriver, backend_url: str = None, role: str = 'user'):
    """
    Create an authenticated browser session without UI login.
    
    This is a one-liner to:
    1. Get valid tokens from backend
    2. Inject them into browser
    3. Ready to navigate to protected pages
    
    Args:
        driver: Selenium WebDriver instance
        backend_url: Optional backend URL override
        role: Role of test user ('user', 'admin', 'analyst', 'reviewer')
        
    Returns:
        Dict with tokens (for debugging)
    """
    # Get valid tokens
    tokens = get_test_tokens(role=role, backend_url=backend_url)
    
    # Inject into both localStorage and cookies for maximum compatibility
    inject_auth_localStorage(
        driver, 
        tokens['accessToken'], 
        tokens.get('refreshToken')
    )
    
    inject_auth_cookies(
        driver,
        tokens['accessToken'],
        tokens.get('refreshToken')
    )
    
    return tokens
