// Authentication utilities for frontend
class AuthManager {
    constructor() {
        this.tokenKey = 'auth_token';
        this.userKey = 'user_data';
        this.tokenExpirationKey = 'token_expiration';
    }

    // Store token and user data
    setAuthData(token, userData) {
        try {
            // Decode token to get expiration
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiration = payload.exp * 1000; // Convert to milliseconds

            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.userKey, JSON.stringify(userData));
            localStorage.setItem(this.tokenExpirationKey, expiration.toString());

            // Set global variables for backward compatibility
            window.userToken = token;
            window.userData = userData;
        } catch (error) {
            console.error('Error storing auth data:', error);
        }
    }

    // Get stored token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Get stored user data
    getUserData() {
        const userData = localStorage.getItem(this.userKey);
        return userData ? JSON.parse(userData) : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = this.getToken();
        const expiration = localStorage.getItem(this.tokenExpirationKey);

        if (!token || !expiration) {
            return false;
        }

        // Check if token is expired
        const now = Date.now();
        const expTime = parseInt(expiration);

        return now < expTime;
    }

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.tokenExpirationKey);

        // Clear global variables
        window.userToken = null;
        window.userData = null;
    }

    // Check authentication and redirect if needed
    checkAuthAndRedirect() {
        if (!this.isAuthenticated()) {
            this.clearAuthData();
            window.location.href = '/login';
            return false;
        }
        return true;
    }

    // Make authenticated API request
    async authenticatedFetch(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('No authentication token available');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, { ...options, ...defaultOptions });

        // If unauthorized, clear auth and redirect
        if (response.status === 401 || response.status === 403) {
            this.clearAuthData();
            window.location.href = '/login';
            throw new Error('Authentication failed');
        }

        return response;
    }
}

// Create global instance
window.authManager = new AuthManager();

// Function to check authentication on page load
function checkAuthentication() {
    if (!window.authManager.checkAuthAndRedirect()) {
        return false;
    }
    return true;
}

// Auto-check authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only check auth if not on login page
    if (!window.location.pathname.includes('login')) {
        checkAuthentication();
    }
});