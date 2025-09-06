// auth-ui-manager.js - Handles all authentication UI functionality

import { apiClient } from './api-client.js';

/**
 * Manages authentication user interface
 * Handles login modal, form validation, and auth state UI updates
 */
export class AuthUIManager {
  constructor() {
    this.isInitialized = false;
    this.modalElement = null;
    this.formElement = null;
    this.isSubmitting = false;
    
    // Bind methods to preserve context
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.handleModalClick = this.handleModalClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  /**
   * Initialize authentication UI
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('AuthUIManager already initialized');
      return;
    }

    try {
      this.setupModalElements();
      this.setupEventListeners();
      this.updateAuthState();
      
      this.isInitialized = true;
      console.log('✅ AuthUIManager initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize AuthUIManager:', error);
      throw error;
    }
  }

  /**
   * Setup modal DOM elements
   */
  setupModalElements() {
    this.modalElement = document.getElementById('authModal');
    this.formElement = document.getElementById('loginForm');
    
    if (!this.modalElement) {
      console.warn('Auth modal element not found');
      return;
    }

    if (!this.formElement) {
      console.warn('Auth form element not found');
      return;
    }
  }

  /**
   * Setup event listeners for auth UI
   */
  setupEventListeners() {
    if (!this.formElement) return;

    // Form submission
    this.formElement.addEventListener('submit', this.handleFormSubmit);
    
    // Modal click handling (close on backdrop click)
    if (this.modalElement) {
      this.modalElement.addEventListener('click', this.handleModalClick);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown);
    
    // Input validation on change
    this.setupInputValidation();
  }

  /**
   * Setup real-time input validation
   */
  setupInputValidation() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        this.validateEmailInput(emailInput);
      });
      
      emailInput.addEventListener('blur', () => {
        this.validateEmailInput(emailInput, true);
      });
    }
    
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        this.validatePasswordInput(passwordInput);
      });
    }
  }

  /**
   * Validate email input
   */
  validateEmailInput(emailInput, showErrors = false) {
    const email = emailInput.value.trim();
    const isValid = this.isValidEmail(email);
    
    // Update input styling
    emailInput.classList.toggle('invalid', showErrors && !isValid && email.length > 0);
    emailInput.classList.toggle('valid', isValid);
    
    return isValid;
  }

  /**
   * Validate password input
   */
  validatePasswordInput(passwordInput) {
    const password = passwordInput.value;
    const isValid = password.length >= 1; // Basic check for login form
    
    // Update input styling  
    passwordInput.classList.toggle('valid', isValid);
    
    return isValid;
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    event.preventDefault();
    
    if (this.isSubmitting) return;
    
    const formData = new FormData(event.target);
    const email = formData.get('loginEmail')?.trim();
    const password = formData.get('loginPassword');
    
    // Validate inputs
    if (!email || !password) {
      this.showError('Please fill in all fields');
      return;
    }
    
    if (!this.isValidEmail(email)) {
      this.showError('Please enter a valid email address');
      return;
    }
    
    await this.performLogin(email, password);
  }

  /**
   * Perform login with loading state
   */
  async performLogin(email, password) {
    const submitBtn = this.formElement.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    // Set loading state
    this.setLoadingState(true, submitBtn);
    
    try {
      // Attempt login
      const response = await apiClient.login({ email, password });
      
      // Success
      this.handleLoginSuccess(response);
      
    } catch (error) {
      console.error('Login failed:', error);
      this.handleLoginError(error);
      
    } finally {
      this.setLoadingState(false, submitBtn);
    }
  }

  /**
   * Handle successful login
   */
  handleLoginSuccess(response) {
    // Hide modal
    this.hideModal();
    
    // Update UI state
    this.updateAuthState();
    
    // Show success message
    this.showSuccess('Logged in successfully');
    
    // Clear form
    if (this.formElement) {
      this.formElement.reset();
    }
    
    console.log('✅ Login successful:', response.user);
  }

  /**
   * Handle login error
   */
  handleLoginError(error) {
    const message = apiClient.handleError(error);
    this.showError(message);
    
    // Focus back to email input for retry
    const emailInput = document.getElementById('loginEmail');
    if (emailInput) {
      emailInput.focus();
    }
  }

  /**
   * Set loading state for submit button
   */
  setLoadingState(loading, submitBtn) {
    this.isSubmitting = loading;
    
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
      submitBtn.classList.add('loading');
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      submitBtn.classList.remove('loading');
    }
  }

  /**
   * Show modal if user needs to authenticate
   */
  showModalIfNeeded() {
    if (!apiClient.isAuthenticated()) {
      setTimeout(() => {
        this.showModal();
      }, 500); // Small delay to let app initialize first
    }
  }

  /**
   * Show authentication modal
   */
  showModal() {
    if (!this.modalElement) return;
    
    this.modalElement.style.display = 'flex';
    
    // Focus first input
    setTimeout(() => {
      const firstInput = this.modalElement.querySelector('#loginEmail');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
    
    console.log('👤 Auth modal shown');
  }

  /**
   * Hide authentication modal
   */
  hideModal() {
    if (!this.modalElement) return;
    
    this.modalElement.style.display = 'none';
    console.log('👤 Auth modal hidden');
  }

  /**
   * Handle modal backdrop clicks
   */
  handleModalClick(event) {
    if (event.target === this.modalElement) {
      // Don't close modal on backdrop click for auth - user needs to login
      // this.hideModal();
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeydown(event) {
    // ESC to close modal (if user is already authenticated)
    if (event.key === 'Escape' && apiClient.isAuthenticated()) {
      this.hideModal();
    }
  }

  /**
   * Update UI based on authentication state
   */
  updateAuthState() {
    const isAuthenticated = apiClient.isAuthenticated();
    const user = apiClient.getUser();
    
    // Update status text or other UI elements based on auth state
    const statusText = document.getElementById('statusText');
    if (statusText && isAuthenticated && user) {
      // Could show user info in status text
      // statusText.textContent = `Welcome, ${user.name || user.email}`;
    }

    console.log('👤 Auth state updated:', { isAuthenticated, user: user?.email });
  }

  /**
   * Logout functionality
   */
  async logout() {
    try {
      await apiClient.logout();
      this.updateAuthState();
      this.showSuccess('Logged out successfully');
      
      // Show modal again for re-authentication
      this.showModal();
      
    } catch (error) {
      console.error('Logout failed:', error);
      this.showError('Logout failed');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    // Could implement a proper toast/notification system
    // For now, use simple alert or status text
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = message;
      statusText.style.color = '#ef4444';
      
      // Clear after 5 seconds
      setTimeout(() => {
        statusText.textContent = '';
        statusText.style.color = '';
      }, 5000);
    } else {
      // Fallback to alert
      alert(message);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = message;
      statusText.style.color = '#10b981';
      
      // Clear after 3 seconds
      setTimeout(() => {
        statusText.textContent = '';
        statusText.style.color = '';
      }, 3000);
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Get current authentication status
   */
  getAuthStatus() {
    return {
      isAuthenticated: apiClient.isAuthenticated(),
      user: apiClient.getUser(),
      isModalVisible: this.modalElement?.style.display === 'flex',
      isSubmitting: this.isSubmitting
    };
  }

  /**
   * Programmatically trigger login (for testing/admin)
   */
  async programmaticLogin(email, password) {
    return this.performLogin(email, password);
  }

  /**
   * Check if user session is still valid
   */
  async checkSession() {
    try {
      if (!apiClient.isAuthenticated()) {
        return false;
      }
      
      // Try to get current user to validate session
      await apiClient.getCurrentUser();
      return true;
      
    } catch (error) {
      console.warn('Session validation failed:', error);
      // Session invalid, show modal
      this.showModal();
      return false;
    }
  }

  /**
   * Cleanup method
   */
  cleanup() {
    // Remove event listeners
    if (this.formElement) {
      this.formElement.removeEventListener('submit', this.handleFormSubmit);
    }
    
    if (this.modalElement) {
      this.modalElement.removeEventListener('click', this.handleModalClick);
    }
    
    document.removeEventListener('keydown', this.handleKeydown);
    
    // Reset state
    this.isInitialized = false;
    this.isSubmitting = false;
    
    console.log('🧹 AuthUIManager cleaned up');
  }
}