// purchased-design-manager.js - Handles all purchased design functionality

/**
 * Manages purchased design customer experience
 * Handles customer data, customization, RSVP tracking, and auto-save
 */
export class PurchasedDesignManager {
  constructor(token) {
    this.token = token;
    this.customer = null;
    this.customization = null;
    this.autoSaveInterval = null;
    this.isInitialized = false;
    this.unloadHandler = null;
    
    // Auto-save debouncing
    this._saving = false;
    this._saveQueued = false;
    this._savedTimer = null;
    
    // Bind methods to preserve context
    this.handleUnload = this.handleUnload.bind(this);
  }

  /**
   * Initialize purchased design manager
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('PurchasedDesignManager already initialized');
      return;
    }

    try {
      console.log('🎨 Loading customer design data...');
      
      // Load customer and customization data
      const data = await this.loadCustomerDesign();
      this.customer = data.customer;
      this.customization = data.customization;
      
      // Update UI for purchased design mode
      this.updateUIForPurchasedDesign();
      
      // Load the purchased design content
      await this.loadPurchasedDesignContent();
      
      // Setup auto-save system
      this.setupAutoSave();
      
      // Show access status warning if needed
      this.showAccessStatusIfNeeded();

      // Inject purchased design styles
      this.injectPurchasedDesignStyles();

      this.isInitialized = true;
      console.log('✅ Purchased design manager initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize purchased design manager:', error);
      this.showAccessError(this.escapeHtml(error.message || 'Failed to initialize'));
      throw error;
    }
  }

  /**
   * Load customer design data from API
   */
  async loadCustomerDesign() {
    const response = await fetch(`/api/editor/${this.token}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load design');
    }
    
    return data;
  }

  /**
   * Update UI elements for purchased design mode
   */
  updateUIForPurchasedDesign() {
    // Update page title
    const designTitle = this.customer?.designTitle || '';
    document.title = `Customize ${designTitle} - Invitation Editor`;
    
    // Update status text in topbar
    this.updateStatusText();
    
    // Add customer info panel
    this.addCustomerInfoPanel();
    
    // Add RSVP management panel
    this.addRSVPPanel();
  }

  /**
   * Update status text in topbar
   */
  updateStatusText() {
    const statusText = document.getElementById('statusText');
    if (statusText && this.customer) {
      statusText.innerHTML = `
        <span style="color:#10b981;">${this.escapeHtml(this.customer.designTitle)}</span> • 
        <span style="color:#6b7280;">${this.escapeHtml(String(this.customer.daysRemaining))} days left</span>
      `;
    }
  }

  /**
   * Add customer information panel to sidebar
   */
  addCustomerInfoPanel() {
    const sidepanel = document.querySelector('.sidepanel .panel-body');
    if (!sidepanel || !this.customer) return;

    const customerSection = document.createElement('section');
    customerSection.className = 'group';
    customerSection.innerHTML = `
      <div class="group-title">Your Design</div>
      <div class="customer-info-card">
        <div class="design-title">${this.escapeHtml(this.customer.designTitle)}</div>
        <div class="design-meta">
          <div class="meta-item">
            <span class="label">Category:</span>
            <span class="value">${this.escapeHtml(this.customer.designCategory)}</span>
          </div>
          <div class="meta-item">
            <span class="label">Purchased:</span>
            <span class="value">${this.escapeHtml(new Date(this.customer.purchasedAt).toLocaleDateString())}</span>
          </div>
          <div class="meta-item">
            <span class="label">Access expires:</span>
            <span class="value ${this.customer.daysRemaining < 30 ? 'expiring' : ''}">${this.escapeHtml(new Date(this.customer.expiresAt).toLocaleDateString())}</span>
          </div>
          <div class="meta-item">
            <span class="label">Last saved:</span>
            <span class="value">${this.customization?.lastSaved ? this.escapeHtml(new Date(this.customization.lastSaved).toLocaleString()) : 'Never'}</span>
          </div>
        </div>
      </div>
    `;

    sidepanel.insertBefore(customerSection, sidepanel.firstChild);
  }

  /**
   * Add RSVP management panel to sidebar
   */
  addRSVPPanel() {
    const sidepanel = document.querySelector('.sidepanel .panel-body');
    if (!sidepanel) return;

    const rsvpSection = document.createElement('section');
    rsvpSection.className = 'group';
    rsvpSection.innerHTML = `
      <div class="group-title">Event & RSVPs</div>
      <div class="row">
        <label for="eventTitle">Event Title</label>
        <input type="text" id="eventTitle" placeholder="e.g., Sarah &amp; John's Wedding">
      </div>
      <div class="row">
        <label for="eventDate">Event Date</label>
        <input type="date" id="eventDate">
      </div>
      <div class="row">
        <label for="eventLocation">Location</label>
        <input type="text" id="eventLocation" placeholder="e.g., Central Park, NYC">
      </div>
      <div class="row">
        <div class="rsvp-stats" id="rsvpStats">
          <div class="stat-item">
            <div class="stat-number" id="totalRsvps">0</div>
            <div class="stat-label">Total RSVPs</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" id="yesCount">0</div>
            <div class="stat-label">Yes</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" id="totalGuests">0</div>
            <div class="stat-label">Total Guests</div>
          </div>
        </div>
      </div>
      <div class="row">
        <button id="viewRsvpsBtn" class="btn">View All RSVPs</button>
        <button id="shareInvitationBtn" class="btn primary">Share Invitation</button>
      </div>
    `;

    sidepanel.appendChild(rsvpSection);
    
    // Setup event handlers for the new elements
    this.setupEventDetailsHandlers();
    this.setupRSVPHandlers();
  }

  /**
   * Setup event handlers for event details inputs
   */
  setupEventDetailsHandlers() {
    const eventTitle = document.getElementById('eventTitle');
    const eventDate = document.getElementById('eventDate');
    const eventLocation = document.getElementById('eventLocation');

    // Load existing event details
    if (this.customization?.eventDetails) {
      const details = this.customization.eventDetails;
      if (eventTitle) eventTitle.value = details.title || '';
      if (eventDate) eventDate.value = details.date || '';
      if (eventLocation) eventLocation.value = details.location || '';
    }

    // Save event details on change
    [eventTitle, eventDate, eventLocation].forEach(input => {
      if (input) {
        input.addEventListener('change', () => {
          this.saveEventDetails();
        });
      }
    });
  }

  /**
   * Setup RSVP management handlers
   */
  setupRSVPHandlers() {
    const viewRsvpsBtn = document.getElementById('viewRsvpsBtn');
    const shareBtn = document.getElementById('shareInvitationBtn');

    if (viewRsvpsBtn) {
      viewRsvpsBtn.addEventListener('click', () => {
        this.showRSVPModal();
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this.shareInvitation();
      });
    }

    // Load initial RSVP stats
    this.loadRSVPStats();
  }

  /**
   * Load purchased design content into the editor
   */
  async loadPurchasedDesignContent() {
    try {
      const slides = this.customization.slides || [];
      
      // Dynamically import state management functions
      const { applyProject } = await import('./state-manager.js');
      
      // Create project structure
      const project = {
        v: 62,
        slides,
        activeIndex: 0,
        defaults: {
          fontFamily: 'Dancing Script, cursive',
          fontSize: 28,
          fontColor: '#ffffff'
        },
        rsvp: 'none',
        mapQuery: this.customization?.eventDetails?.location || ''
      };

      // Apply the project
      applyProject(project);
      
      // Load first slide if available
      if (slides.length > 0) {
        const { loadSlideIntoDOM } = await import('./slide-manager.js');
        await loadSlideIntoDOM(slides[0]);
      }
      
      // Update slides UI
      const { updateSlidesUI } = await import('./slide-manager.js');
      updateSlidesUI();

    } catch (error) {
      console.error('Failed to load purchased design content:', error);
      this.showError('Failed to load your design');
    }
  }

  /**
   * Setup auto-save system
   */
  setupAutoSave() {
    // Clear any existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveCustomization();
    }, 30000);

    // Save on page unload
    window.addEventListener('beforeunload', this.handleUnload);
    this.unloadHandler = this.handleUnload;
  }

  /**
   * Handle page unload
   */
  handleUnload() {
    this.saveCustomization();
  }

  /**
   * Save customization to backend
   */
  async saveCustomization() {
    if (!this.isInitialized) return;
    if (this._saving) { 
      this._saveQueued = true; 
      return; 
    }
    
    this._saving = true;
    
    try {
      // Get current slides from state manager
      const { getSlides } = await import('./state-manager.js');
      const slides = getSlides();

      // Get event details from form
      const eventDetails = {
        title: document.getElementById('eventTitle')?.value || '',
        date: document.getElementById('eventDate')?.value || '',
        location: document.getElementById('eventLocation')?.value || ''
      };

      // Save to backend
      const response = await fetch(`/api/editor/${this.token}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, eventDetails })
      });

      if (response.ok) {
        this.showSaveSuccess();
      } else {
        const error = await response.json().catch(() => ({}));
        console.error('Save failed:', error);
      }

    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      this._saving = false;
      if (this._saveQueued) { 
        this._saveQueued = false; 
        // Delay next save to avoid rapid successive saves
        setTimeout(() => this.saveCustomization(), 1000);
      }
    }
  }

  /**
   * Show save success indicator
   */
  showSaveSuccess() {
    const statusText = document.getElementById('statusText');
    if (!statusText) return;

    let badge = document.getElementById('savedBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'savedBadge';
      badge.style.cssText = 'margin-left:6px;color:#10b981;';
      statusText.appendChild(badge);
    }
    
    badge.textContent = '• Saved';
    
    // Clear the badge after 1.5 seconds
    clearTimeout(this._savedTimer);
    this._savedTimer = setTimeout(() => badge?.remove(), 1500);
  }

  /**
   * Save event details specifically
   */
  async saveEventDetails() {
    const eventDetails = {
      title: document.getElementById('eventTitle')?.value || '',
      date: document.getElementById('eventDate')?.value || '',
      location: document.getElementById('eventLocation')?.value || ''
    };

    try {
      const { getSlides } = await import('./state-manager.js');
      await fetch(`/api/editor/${this.token}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: getSlides(), eventDetails })
      });
    } catch (error) {
      console.error('Failed to save event details:', error);
    }
  }

  /**
   * Load RSVP statistics
   */
  async loadRSVPStats() {
    try {
      const response = await fetch(`/api/editor/${this.token}/rsvps`);
      const data = await response.json();
      
      if (response.ok) {
        document.getElementById('totalRsvps').textContent = String(data.stats.total);
        document.getElementById('yesCount').textContent = String(data.stats.yes);
        document.getElementById('totalGuests').textContent = String(data.stats.totalGuests);
      }

    } catch (error) {
      console.error('Failed to load RSVP stats:', error);
    }
  }

  /**
   * Show RSVP management modal
   */
  async showRSVPModal() {
    try {
      const response = await fetch(`/api/editor/${this.token}/rsvps`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load RSVPs');
      }
      
      const modal = this.createRSVPModal(data);
      document.body.appendChild(modal);

    } catch (error) {
      this.showError('Failed to load RSVPs: ' + this.escapeHtml(error.message));
    }
  }

  /**
   * Create RSVP modal DOM element
   */
  createRSVPModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h2>RSVP Responses</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="rsvp-summary">
            <div class="response-count yes">Yes: ${this.escapeHtml(data.stats.yes)}</div>
            <div class="response-count no">No: ${this.escapeHtml(data.stats.no)}</div>
            <div class="response-count maybe">Maybe: ${this.escapeHtml(data.stats.maybe)}</div>
            <div class="response-count total">Total Guests: ${this.escapeHtml(data.stats.totalGuests)}</div>
          </div>
          
          <div class="rsvp-list">
            ${data.rsvps.map(rsvp => `
              <div class="rsvp-item">
                <div class="guest-name">
                  ${this.escapeHtml(rsvp.guest_name)}
                  <span class="guest-response ${this.escapeHtml(rsvp.response)}">${this.escapeHtml(rsvp.response)}</span>
                </div>
                ${rsvp.guest_email ? `<div class="guest-email">${this.escapeHtml(rsvp.guest_email)}</div>` : ''}
                ${rsvp.plus_one_count > 0 ? `<div class="plus-ones">+${this.escapeHtml(String(rsvp.plus_one_count))} guest(s)</div>` : ''}
                ${rsvp.dietary_restrictions ? `<div class="dietary">Dietary: ${this.escapeHtml(rsvp.dietary_restrictions)}</div>` : ''}
                ${rsvp.message ? `<div class="message">"${this.escapeHtml(rsvp.message)}"</div>` : ''}
                <div class="submitted-date">${this.escapeHtml(new Date(rsvp.submitted_at).toLocaleDateString())}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Setup modal event handlers
    this.setupModalHandlers(modal);
    return modal;
  }

  /**
   * Setup modal event handlers
   */
  setupModalHandlers(modal) {
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  /**
   * Share invitation functionality
   */
  shareInvitation() {
    const shareUrl = `${window.location.origin}/invitation/${this.customization.id}`;
    const eventTitle = document.getElementById('eventTitle')?.value || 'our event';
    
    if (navigator.share) {
      navigator.share({
        title: `You're invited to ${eventTitle}!`,
        text: 'Please RSVP to our special event',
        url: shareUrl
      }).catch(() => {
        this.fallbackShare(shareUrl);
      });
    } else {
      this.fallbackShare(shareUrl);
    }
  }

  /**
   * Fallback share method
   */
  fallbackShare(shareUrl) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showSuccess('Invitation link copied to clipboard!');
      });
    } else {
      // eslint-disable-next-line no-alert
      prompt('Copy this invitation link to share with your guests:', shareUrl);
    }
  }

  /**
   * Show access status warning if expiring soon
   */
  showAccessStatusIfNeeded() {
    if (!this.customer || this.customer.daysRemaining >= 30) return;

    const warning = document.createElement('div');
    warning.className = 'access-warning';
    warning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      z-index: 1000;
      padding: 12px 16px;
      text-align: center;
      font-size: 14px;
    `;
    
    warning.innerHTML = `
      <strong>Access Expiring Soon!</strong>
      Your access expires in ${this.escapeHtml(String(this.customer.daysRemaining))} days (${this.escapeHtml(new Date(this.customer.expiresAt).toLocaleDateString())}).
      Make sure to complete and share your invitation before then.
      <button id="dismissAccessWarn" style="margin-left:10px; padding:2px 6px; border:none; border-radius:4px; cursor:pointer;">✕</button>
    `;
    
    document.body.appendChild(warning);
    
    const dismissBtn = warning.querySelector('#dismissAccessWarn');
    dismissBtn?.addEventListener('click', () => warning.remove());
  }

  /**
   * Show access error (expired/invalid token)
   */
  showAccessError(message) {
    document.body.innerHTML = `
      <div style="position: fixed; inset: 0; background: linear-gradient(135deg, #0f1a2d, #1a2332); display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div style="background: white; border-radius: 18px; padding: 3rem; max-width: 500px; text-align: center;">
          <h1 style="color: #1f2937; margin-bottom: 1rem;">Access Expired or Invalid</h1>
          <p style="color: #6b7280; margin-bottom: 2rem;">${message}</p>
          <p style="color: #6b7280; font-size: 14px;">
            If you believe this is an error, please contact support with your purchase details.
          </p>
          <a href="mailto:support@yourdomain.com" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 1rem;">Contact Support</a>
        </div>
      </div>
    `;
  }

  /**
   * Inject purchased design styles
   */
  injectPurchasedDesignStyles() {
    const styleId = 'purchased-design-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .customer-info-card {
        background: rgba(37, 99, 235, 0.05);
        border: 1px solid rgba(37, 99, 235, 0.2);
        border-radius: 10px;
        padding: 12px;
      }

      .design-title {
        font-weight: 800;
        font-size: 14px;
        color: #2563eb;
        margin-bottom: 8px;
      }

      .design-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .meta-item {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }

      .meta-item .label {
        color: #6b7280;
      }

      .meta-item .value {
        color: #e5e7eb;
        font-weight: 600;
      }

      .meta-item .value.expiring {
        color: #f59e0b;
      }

      .rsvp-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        background: rgba(16, 185, 129, 0.05);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-radius: 10px;
        padding: 12px;
      }

      .stat-item {
        text-align: center;
      }

      .stat-number {
        font-size: 18px;
        font-weight: 800;
        color: #10b981;
        line-height: 1;
      }

      .stat-label {
        font-size: 10px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 2px;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Utility methods
   */
  showError(message) {
    console.error(message);
    // Could implement toast notifications here
  }

  showSuccess(message) {
    console.log(message);
    // Could implement toast notifications here
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Cleanup method
   */
  cleanup() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = null;
    }
    
    // Clear any pending timers
    if (this._savedTimer) {
      clearTimeout(this._savedTimer);
      this._savedTimer = null;
    }
    
    this.isInitialized = false;
    console.log('🧹 PurchasedDesignManager cleaned up');
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      token: this.token,
      customer: this.customer,
      customization: this.customization,
      saving: this._saving,
      saveQueued: this._saveQueued
    };
  }
}