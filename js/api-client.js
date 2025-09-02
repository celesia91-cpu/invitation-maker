// api-client.js - Complete API client for invitation maker backend

class APIClient {
  constructor(baseURL) {
    // Auto-detect environment if no baseURL provided
    if (!baseURL) {
      if (typeof window !== 'undefined') {
        const isDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
        
        if (isDev) {
          baseURL = 'http://localhost:3001/api';
        } else {
          baseURL = 'https://invitation-maker-api.celesia91.workers.dev/api';
        }
      } else {
        baseURL = 'http://localhost:3001/api';
      }
    }
    
    this.baseURL = baseURL;
    this.token = this.loadToken();
    this.setupInterceptors();
    this.isRetrying = false;
    this._debug = false;
  }

  // Setup method (was called but not defined)
  setupInterceptors() {
    // Store original fetch for potential restoration
    this._originalFetch = window.fetch;
    
    // Could add request/response interceptors here if needed
    this._log('API Client initialized with base URL:', this.baseURL);
  }

  // Enhanced token management
  loadToken() {
    try {
      const token = localStorage.getItem('auth_token');
      // Validate token format
      if (token && typeof token === 'string' && token.length > 10) {
        return token;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load token from localStorage:', error);
      return null;
    }
  }

  saveToken(token) {
    try {
      if (token && typeof token === 'string') {
        localStorage.setItem('auth_token', token);
        this.token = token;
        this._log('Token saved successfully');
      } else {
        this.clearToken();
      }
    } catch (error) {
      console.warn('Failed to save token to localStorage:', error);
      // Continue without localStorage if it fails
      this.token = token;
    }
  }

  clearToken() {
    try {
      localStorage.removeItem('auth_token');
      this._log('Token cleared from localStorage');
    } catch (error) {
      console.warn('Failed to clear token from localStorage:', error);
    }
    this.token = null;
  }

  // Enhanced request method with better error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authorization header if token exists and not already set
    if (this.token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    this._log('Making request:', config.method || 'GET', url);

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type') || '';
      let data;
      
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseError) {
          console.warn('Failed to parse JSON response:', parseError);
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
  }

  // HTTP method helpers (these were missing!)
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

  // Enhanced authentication methods
  async register(userData) {
    this.isRetrying = true;
    try {
      const response = await this.post('/auth/register', userData);
      if (response.token) {
        this.saveToken(response.token);
      }
      return response;
    } finally {
      this.isRetrying = false;
    }
  }

  async login(credentials) {
    this.isRetrying = true;
    try {
      const response = await this.post('/auth/login', credentials);
      if (response.token) {
        this.saveToken(response.token);
      }
      return response;
    } finally {
      this.isRetrying = false;
    }
  }

  async logout() {
    this.clearToken();
    // Could call a logout endpoint if implemented
    return Promise.resolve();
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  // Project management endpoints
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

  // Enhanced image upload with better error handling
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
    if (!this.token) {
      throw new Error('Authentication required for image upload');
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      return await this.request('/images/upload', {
        method: 'POST',
        headers: {
          // Remove Content-Type header to let browser set boundary for FormData
          Authorization: `Bearer ${this.token}`
        },
        body: formData
      });
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Purchased design editor endpoints
  async loadCustomerDesign(token) {
    return this.get(`/editor/${token}`);
  }

  async saveCustomerDesign(token, data) {
    return this.post(`/editor/${token}/save`, data);
  }

  async getCustomerRSVPs(token) {
    return this.get(`/editor/${token}/rsvps`);
  }

  // RSVP endpoints
  async submitRSVP(rsvpData) {
    return this.post('/rsvp/submit', rsvpData);
  }

  // Utility methods
  isAuthenticated() {
    return !!this.token;
  }

  // Enhanced error handling helper
  handleError(error) {
    console.error('API Error:', error);
    
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

  // Enhanced retry mechanism
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

  // Batch upload for multiple images
  async uploadImages(files) {
    const uploads = Array.from(files).map(file => this.uploadImage(file));
    
    try {
      return await Promise.all(uploads);
    } catch (error) {
      throw new Error(`Failed to upload images: ${error.message}`);
    }
  }

  // Configuration methods
  setBaseURL(url) {
    this.baseURL = url;
    this._log('Base URL updated to:', url);
  }

  getBaseURL() {
    return this.baseURL;
  }

  // Health check with timeout
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

  // Debug helper
  debug(enabled = true) {
    this._debug = enabled;
    if (enabled) {
      console.log('API Client Debug Mode Enabled');
      console.log('Base URL:', this.baseURL);
      console.log('Token:', this.token ? 'Present' : 'Not set');
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