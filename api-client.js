// api-client.js - API client for invitation maker backend

class APIClient {
  constructor(baseURL = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.token = this.loadToken();
    this.setupInterceptors();
  }

  // Token management
  loadToken() {
    try {
      return localStorage.getItem('auth_token');
    } catch {
      return null;
    }
  }

  saveToken(token) {
    try {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
      this.token = token;
    } catch (error) {
      console.warn('Failed to save token to localStorage:', error);
    }
  }

  clearToken() {
    this.saveToken(null);
  }

  // Setup default request configuration
  setupInterceptors() {
    // Store original fetch for potential restoration
    this._originalFetch = window.fetch;
  }

  // Base request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authorization header if token exists
    if (this.token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          this.clearToken();
          throw new Error(data.error || 'Authentication required');
        }
        
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      // Network or parsing errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection');
      }
      throw error;
    }
  }

  // HTTP method helpers
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

  // Authentication endpoints
  async register(userData) {
    const response = await this.post('/auth/register', userData);
    if (response.token) {
      this.saveToken(response.token);
    }
    return response;
  }

  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.token) {
      this.saveToken(response.token);
    }
    return response;
  }

  async logout() {
    this.clearToken();
    // Could also call a logout endpoint if you implement one
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

  // Image upload
  async uploadImage(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a valid image file.');
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File is too large. Maximum size is 10MB.');
    }

    const formData = new FormData();
    formData.append('image', file);

    return this.request('/images/upload', {
      method: 'POST',
      headers: {
        // Remove Content-Type header to let browser set it with boundary for FormData
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      body: formData
    });
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

  async healthCheck() {
    try {
      return await this.get('/health');
    } catch (error) {
      throw new Error('Backend server is not responding');
    }
  }

  // Error handling helper
  handleError(error) {
    console.error('API Error:', error);
    
    // Common error messages for user display
    if (error.message.includes('Network error')) {
      return 'Connection failed. Please check your internet connection.';
    }
    
    if (error.message.includes('Authentication required')) {
      return 'Please log in to continue.';
    }
    
    if (error.message.includes('Invalid credentials')) {
      return 'Invalid email or password.';
    }
    
    if (error.message.includes('User already exists')) {
      return 'An account with this email already exists.';
    }
    
    if (error.message.includes('File is too large')) {
      return 'File is too large. Maximum size is 10MB.';
    }
    
    if (error.message.includes('Invalid file type')) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP).';
    }
    
    // Return original error message for other cases
    return error.message || 'An unexpected error occurred.';
  }

  // Retry mechanism for failed requests
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry authentication or client errors
        if (error.message.includes('Authentication') || error.message.includes('Invalid')) {
          throw error;
        }
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
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
  }

  getBaseURL() {
    return this.baseURL;
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

// Auto-detect development vs production
if (typeof window !== 'undefined') {
  // Browser environment
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';
  
  if (isDev) {
    apiClient.setBaseURL('http://localhost:3001/api');
  } else {
    // Production - adjust this to your actual API URL
    apiClient.setBaseURL('https://invitation-maker-api.celesia91.workers.dev/api');
  }
}

// Export both the class and the singleton instance
export { APIClient };
export { apiClient };
export default apiClient;