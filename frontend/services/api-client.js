// api-client.js - API client with configurable storage

import { logError, logWarning } from '../error-handler.js';

class APIClient {
  constructor(baseURL, fetchImpl) {
    // Resolve base URL from env override first, then auto-detect
    const envBase = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL)
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : null;

    if (!baseURL) {
      if (envBase) {
        baseURL = envBase; // supports absolute (http://...) or relative (/api)
      } else if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const isDev = host === 'localhost' || host === '127.0.0.1';
        if (isDev) {
          // Local dev default backend port
          baseURL = 'http://localhost:3001';
        } else {
          baseURL = 'https://invitation-maker-api.celesia91.workers.dev/api';
        }
      } else {
        baseURL = 'http://localhost:3001';
      }
    }

    // Determine fetch implementation based on environment
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      this.fetch = window.fetch.bind(window);
    } else {
      this.fetch = fetchImpl || (typeof globalThis !== 'undefined' &&
        typeof globalThis.fetch === 'function'
          ? globalThis.fetch.bind(globalThis)
          : undefined);
    }

    this.baseURL = baseURL;

    this._storageKey = 'app_auth_session';
    this._sessionDuration = 24 * 60 * 60 * 1000; // 24h default
    this._persistentDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    this._storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
    this._currentDuration = this._sessionDuration;

    this.token = this.loadToken();
    this.setupInterceptors();
    this.isRetrying = false;
    this._debug = false;
  }

  setupInterceptors() {
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      // Store original fetch for potential restoration in browsers
      this._originalFetch = window.fetch;

      // Could add request/response interceptors here if needed
      this._log('API Client initialized with base URL:', this.baseURL);
    } else {
      // Fallback for non-browser environments (e.g., Node.js)
      this._originalFetch = this.fetch;
      this._log('API Client initialized without browser environment:', this.baseURL);
    }
  }

  // Internal: safely parse JSON with context
  _safeParse(json, context, fallback = null) {
    if (typeof json !== 'string') {
      logWarning(`${context}: expected string but received ${typeof json}`);
      return fallback;
    }
    try {
      return JSON.parse(json);
    } catch (err) {
      const snippet = json.slice(0, 100);
      logWarning(err, `Failed to parse ${context}`, { snippet });
      return fallback;
    }
  }

  // Internal: get parsed session object
  _getSession(storage = this._storage) {
    try {
      if (!storage || typeof storage.getItem !== 'function') return null;
      const raw = storage.getItem(this._storageKey);
      if (!raw) return null;
      if (typeof raw !== 'string' || !raw.trim().startsWith('{')) {
        logWarning('Malformed session storage data');
        return null;
      }
      const parsed = this._safeParse(raw, 'session storage');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
      logWarning(err, 'Failed to access session storage');
      return null;
    }
  }

  // Load token from storage
  loadToken() {
    try {
      const persistent = this._loadFromStorage(typeof localStorage !== 'undefined' ? localStorage : null, this._persistentDuration);
      if (persistent) {
        this._storage = localStorage;
        this._currentDuration = this._persistentDuration;
        this.token = persistent.token;
        this._log('Token restored from localStorage');
        return persistent.token;
      }

      const session = this._loadFromStorage(typeof sessionStorage !== 'undefined' ? sessionStorage : null, this._sessionDuration);
      if (session) {
        this._storage = sessionStorage;
        this._currentDuration = this._sessionDuration;
        this.token = session.token;
        this._log('Token restored from sessionStorage');
        return session.token;
      }

      this.token = null;
      this._storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
      this._currentDuration = this._sessionDuration;
      return null;
    } catch (error) {
      logWarning(error, 'Failed to load token from storage');
      return null;
    }
  }

  _loadFromStorage(storage, duration) {
    if (!storage) return null;
    const parsed = this._getSession(storage);
    if (parsed && typeof parsed.token === 'string' && typeof parsed.lastActivity === 'number') {
      if ((Date.now() - parsed.lastActivity) < duration) {
        return parsed;
      }
      try { storage.removeItem(this._storageKey); } catch (_) { }
    }
    return null;
  }

  _selectStorage(remember) {
    if (remember && typeof localStorage !== 'undefined') {
      this._storage = localStorage;
      this._currentDuration = this._persistentDuration;
    } else {
      this._storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
      this._currentDuration = this._sessionDuration;
    }
  }

  // Save token to active storage
  saveToken(token) {
    try {
      if (token && typeof token === 'string' && this._storage) {
        const sessionData = { token, lastActivity: Date.now() };
        this._storage.setItem(this._storageKey, JSON.stringify(sessionData));
        const other = this._storage === localStorage ? sessionStorage : localStorage;
        try { other && other.removeItem(this._storageKey); } catch (_) {}
        this.token = token;
        this._log('Token saved to storage successfully');
      } else {
        this.clearToken();
      }
    } catch (error) {
      logWarning(error, 'Failed to save token to storage');
      this.token = token;
    }
  }

  // Clear token from both storages
  clearToken() {
    try { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(this._storageKey); } catch (error) {
      logWarning(error, 'Failed to clear token from sessionStorage');
    }
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(this._storageKey); } catch (error) {
      logWarning(error, 'Failed to clear token from localStorage');
    }
    this.token = null;
    this._storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
    this._currentDuration = this._sessionDuration;
  }

  // Save user data to active storage
  saveUser(user) {
    try {
      if (user && typeof user === 'object' && this._storage) {
        const sessionData = this._getSession() || {};
        sessionData.user = user;
        sessionData.lastActivity = Date.now();
        this._storage.setItem(this._storageKey, JSON.stringify(sessionData));
      }
    } catch (error) {
      logWarning(error, 'Failed to save user to storage');
    }
  }

  // Get user data from active storage
  getUser() {
    try {
      const parsed = this._getSession();
      if (parsed && typeof parsed.user === 'object') {
        return parsed.user;
      }
      if (parsed) {
        logWarning('Session user missing or invalid');
      }
      return null;
    } catch (error) {
      logWarning(error, 'Failed to get user from storage');
      return null;
    }
  }

  // ENHANCED: Session management methods
  isSessionValid() {
    try {
      const parsed = this._getSession();
      if (!parsed || typeof parsed.token !== 'string' || typeof parsed.lastActivity !== 'number') {
        if (parsed) logWarning('Session missing required fields');
        return false;
      }
      const sessionAge = Date.now() - parsed.lastActivity;
      return sessionAge < this._currentDuration;
    } catch (error) {
      return false;
    }
  }

  refreshSession() {
    try {
      if (!this.token || !this.isSessionValid() || !this._storage) {
        return;
      }
      const parsed = this._getSession();
      if (parsed) {
        parsed.lastActivity = Date.now();
        this._storage.setItem(this._storageKey, JSON.stringify(parsed));
      } else {
        logWarning('No valid session to refresh');
      }
    } catch (error) {
      logWarning(error, 'Failed to refresh session');
    }
  }

  // Enhanced request method with session refresh and retry
  async request(endpoint, options = {}) {
    return this.retryRequest(async () => {
      const url = `${this.baseURL}${endpoint}`;

      // Refresh session activity on each request
      this.refreshSession();

      const headers = { ...(options.headers || {}) };

      // Apply default Content-Type only when not sending FormData and no header provided
      const hasContentType = Object.keys(headers).some(
        h => h.toLowerCase() === 'content-type'
      );
      const isFormData =
        typeof FormData !== 'undefined' && options.body instanceof FormData;
      if (!hasContentType && !isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const config = {
        headers,
        ...options
      };

      // Add authorization header if token exists and session is valid
      if (
        this.token &&
        this.isSessionValid() &&
        !Object.keys(headers).some(h => h.toLowerCase() === 'authorization')
      ) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      this._log('Making request:', config.method || 'GET', url);

      try {
        const response = await this.fetch(url, config);

        // Handle different response types
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (parseError) {
            logWarning(parseError, 'Failed to parse JSON response');
            data = { error: 'Invalid server response' };
          }
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          this._log('Request failed:', response.status, data);

          // Handle authentication errors
          if (response.status === 401 && !this.isRetrying) {
            this.clearToken();
            // Don't auto-retry for login/register endpoints
            if (!endpoint.includes('/auth/')) {
              throw new Error('Authentication required - please log in again');
            }
          }

          // Handle specific error cases
          if (response.status === 429) {
            throw new Error('Too many requests - please wait a moment');
          }

          if (response.status >= 500) {
            throw new Error('Server error - please try again later');
          }

          const errorMessage = typeof data === 'object' ? data.error : data;
          throw new Error(errorMessage || `HTTP ${response.status}: ${response.statusText}`);
        }

        this._log('Request successful:', data);
        return data;
      } catch (error) {
        // Network or other errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('Network error - please check your connection');
        }

        // Re-throw our custom errors
        throw error;
      }
    });
  }

  // HTTP method helpers (unchanged)
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Token management
  async getUserTokens() {
    return this.get('/user/tokens');
  }

  async updateTokens(amount) {
    return this.post('/purchase', { tokens: amount });
  }

  // Enhanced authentication methods with session management
  async register(userData) {
    this.isRetrying = true;
    try {
      const response = await this.post('/auth/register', userData);
      if (response.token) {
        this.saveToken(response.token);
      }
      if (response.user) {
        this.saveUser(response.user);
      }
      return response;
    } finally {
      this.isRetrying = false;
    }
  }

  async login(credentials) {
    const { remember = false, ...loginData } = credentials;
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
      });

      if (response.access_token || response.token) {
        const token = response.access_token || response.token;
        this._selectStorage(remember);
        this.saveToken(token);

        if (response.user) {
          this.saveUser(response.user);
        }

        return response;
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      logError(error, 'Login failed');
      throw error;
    }
  }

  async logout() {
  try {
    // Call logout endpoint if authenticated
    if (this.isAuthenticated()) {
      try {
        await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
          logWarning(error, 'Logout endpoint failed');
          // Continue with local logout even if server call fails
        }
    }
  } finally {
    // Always clear local session
    this.clearToken();
  }
}

  async getCurrentUser() {
    // Try session first, then API
    const sessionUser = this.getUser();
    if (sessionUser && this.isSessionValid()) {
      return { user: sessionUser };
    }
    
    // Fallback to API call
    const response = await this.get('/auth/me');
    if (response.user) {
      this.saveUser(response.user);
    }
    return response;
  }

  // Project management endpoints (unchanged)
  async getUserDesigns() {
    return this.get('/designs');
  }

  async getProjects() {
    return this.get('/projects');
  }

  async getProject(projectId) {
    return this.get(`/projects/${projectId}`);
  }

  async saveProject(projectData) {
    return this.post('/projects', projectData);
  }

  async updateProject(projectId, projectData) {
    return this.put(`/projects/${projectId}`, projectData);
  }

  async deleteProject(projectId) {
    return this.delete(`/projects/${projectId}`);
  }

  // Enhanced image upload with better error handling (unchanged)
  async uploadImage(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.');
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File is too large. Maximum size is 10MB.');
    }

    // Check if user is authenticated
    if (!this.token || !this.isSessionValid()) {
      throw new Error('Authentication required for image upload');
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      // Authorization handled automatically in request(); browser sets multipart boundary
      return await this.request('/images/upload', {
        method: 'POST',
        body: formData
      });
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Purchased design editor endpoints (unchanged)
  async loadCustomerDesign(token) {
    return this.get(`/editor/${token}`);
  }

  async saveCustomerDesign(token, data) {
    return this.post(`/editor/${token}/save`, data);
  }

  async getCustomerRSVPs(token) {
    return this.get(`/editor/${token}/rsvps`);
  }

  // RSVP endpoints (unchanged)
  async submitRSVP(rsvpData) {
    return this.post('/rsvp/submit', rsvpData);
  }

  // Utility methods
  isAuthenticated() {
    return !!(this.token && this.isSessionValid());
  }

  // Enhanced error handling helper (unchanged)
    handleError(error) {
      logError(error, 'API Error');
    
    // Common error messages for user display
    const errorMessage = error.message || 'An unexpected error occurred.';
    
    if (errorMessage.includes('Network error')) {
      return 'Connection failed. Please check your internet connection.';
    }
    
    if (errorMessage.includes('Authentication required')) {
      return 'Please log in to continue.';
    }
    
    if (errorMessage.includes('Invalid credentials')) {
      return 'Invalid email or password.';
    }
    
    if (errorMessage.includes('User already exists')) {
      return 'An account with this email already exists.';
    }
    
    if (errorMessage.includes('Too many requests')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    
    if (errorMessage.includes('File is too large')) {
      return 'File is too large. Maximum size is 10MB.';
    }
    
    if (errorMessage.includes('Invalid file type')) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP).';
    }
    
    if (errorMessage.includes('Server error')) {
      return 'Server temporarily unavailable. Please try again later.';
    }
    
    // Return the original error message if no specific handling
    return errorMessage;
  }

  // Enhanced retry mechanism (unchanged)
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry authentication or client errors (4xx)
        const errorMessage = error.message || '';
        if (errorMessage.includes('Authentication') || 
            errorMessage.includes('Invalid') ||
            errorMessage.includes('Too many requests') ||
            errorMessage.includes('unauthorized')) {
          throw error;
        }
        
        if (i < maxRetries - 1) {
          const backoffDelay = delay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    
    throw lastError;
  }

  // Batch upload for multiple images (unchanged)
  async uploadImages(files) {
    const uploads = Array.from(files).map(file => this.uploadImage(file));
    
    try {
      return await Promise.all(uploads);
    } catch (error) {
      throw new Error(`Failed to upload images: ${error.message}`);
    }
  }

  // Configuration methods (unchanged)
  setBaseURL(url) {
    this.baseURL = url;
    this._log('Base URL updated to:', url);
  }

  getBaseURL() {
    return this.baseURL;
  }

  // Health check with timeout (unchanged)
  async healthCheck() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    try {
      const response = await this.request('/health', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Health check timed out');
      }
      throw new Error('Backend server is not responding');
    }
  }

  // Debug helper (unchanged)
  debug(enabled = true) {
    this._debug = enabled;
    if (enabled) {
      console.log('API Client Debug Mode Enabled');
      console.log('Base URL:', this.baseURL);
      console.log('Token:', this.token ? 'Present' : 'Not set');
      console.log('Session Valid:', this.isSessionValid());
    }
  }

  _log(...args) {
    if (this._debug) {
      console.log('[API Client]', ...args);
    }
  }
}

// Create singleton instance
const apiClient = new APIClient();

// Export both the class and the singleton instance
export { APIClient };
export { apiClient };
export default apiClient;
