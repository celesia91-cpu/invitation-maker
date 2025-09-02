// app.js - Main application entry point with purchased design integration (bug-fixed)

// Import all managers and utilities
import { workSize } from './utils.js';
import { initializeRsvpSystem } from './fixed-rsvp-system.js';
import { 
  loadProject, 
  saveProjectDebounced, 
  initializeHistory, 
  doUndo, 
  doRedo 
} from './state-manager.js';
import { 
  handleImageUpload, 
  deleteImage, 
  handleImageScale, 
  handleImageRotate, 
  handleImageFlip, 
  applyPreset, 
  handleImageFadeIn, 
  handleImageFadeOut, 
  handleImageFadeInRange, 
  handleImageFadeOutRange, 
  imgState, 
  setTransforms,
  preloadSlideImageAt 
} from './image-manager.js';
import { 
  addTextLayer, 
  handleTextDrag, 
  endTextDrag, 
  handleFontSize, 
  handleFontColor, 
  handleFontFamily, 
  handleBold, 
  handleItalic, 
  handleUnderline, 
  deleteActiveText, 
  handleTextFadeIn, 
  handleTextFadeOut, 
  handleTextFadeInRange, 
  handleTextFadeOutRange, 
  syncToolbarFromActive 
} from './text-manager.js';
import { 
  addSlide, 
  duplicateSlide, 
  deleteSlide, 
  setActiveSlide, 
  previousSlide, 
  nextSlide, 
  togglePlay, 
  handleSlideDurationChange, 
  loadSlideIntoDOM, 
  updateSlidesUI 
} from './slide-manager.js';
import { 
  initializeResponsive, 
  setupUIEventHandlers, 
  setupRsvpHandlers, 
  setupMapHandlers, 
  initializeForMode, 
  initializeViewerFullscreen 
} from './ui-manager.js';
import { 
  applyViewerFromUrl, 
  setupShareHandler 
} from './share-manager.js';
import { apiClient } from './api-client.js';

// -----------------------
// Utilities
// -----------------------
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// -----------------------
// Purchased design token parsing
// -----------------------
const urlPath = window.location.pathname;
const urlParams = new URLSearchParams(window.location.search);
const pathLast = urlPath.replace(/\/+$/,'').split('/').pop() || '';
const token = urlParams.get('token') || pathLast;
const isPurchasedDesign = /^acc_[A-Za-z0-9_-]+$/.test(token);

// Instance placeholder (instantiate AFTER class definition)
let purchasedDesignEditor = null;

// -----------------------
// Purchased Design Editor Class
// -----------------------
class PurchasedDesignEditor {
  constructor(token) {
    this.token = token;
    this.customer = null;
    this.customization = null;
    this.autoSaveInterval = null;
    this.isInitialized = false;
    this.unloadHandler = null;
    // save de-dupe
    this._saving = false;
    this._saveQueued = false;
    this._savedTimer = null;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      const data = await this.loadCustomerDesign();
      this.customer = data.customer;
      this.customization = data.customization;
      
      this.updateUIForPurchasedDesign();
      await this.loadPurchasedDesign();
      this.setupAutoSave();
      // Removed duplicate setupRSVPHandlers call here; it is invoked in addRSVPPanel()
      this.showAccessStatus();

      this.isInitialized = true;
      
    } catch (error) {
      console.error('Failed to initialize purchased design editor:', error);
      this.showAccessError(esc(error.message || 'Failed to initialize'));
    }
  }

  async loadCustomerDesign() {
    const response = await fetch(`/api/editor/${this.token}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load design');
    }
    
    return data;
  }

  updateUIForPurchasedDesign() {
    // Update page title
    document.title = `Customize ${this.customer?.designTitle || ''} - Invitation Editor`;
    
    // Update status text (escaped)
    const statusText = document.getElementById('statusText');
    if (statusText && this.customer) {
      statusText.innerHTML = `
        <span style="color:#10b981;">${esc(this.customer.designTitle)}</span> • 
        <span style="color:#6b7280;">${esc(String(this.customer.daysRemaining))} days left</span>
      `;
    }
    
    // Add customer info & RSVP panel
    this.addCustomerInfoPanel();
    this.addRSVPPanel();
  }

  addCustomerInfoPanel() {
    const sidepanel = document.querySelector('.sidepanel .panel-body');
    if (!sidepanel || !this.customer) return;

    const customerSection = document.createElement('section');
    customerSection.className = 'group';
    customerSection.innerHTML = `
      <div class="group-title">Your Design</div>
      <div class="customer-info-card">
        <div class="design-title">${esc(this.customer.designTitle)}</div>
        <div class="design-meta">
          <div class="meta-item">
            <span class="label">Category:</span>
            <span class="value">${esc(this.customer.designCategory)}</span>
          </div>
          <div class="meta-item">
            <span class="label">Purchased:</span>
            <span class="value">${esc(new Date(this.customer.purchasedAt).toLocaleDateString())}</span>
          </div>
          <div class="meta-item">
            <span class="label">Access expires:</span>
            <span class="value ${this.customer.daysRemaining < 30 ? 'expiring' : ''}">${esc(new Date(this.customer.expiresAt).toLocaleDateString())}</span>
          </div>
          <div class="meta-item">
            <span class="label">Last saved:</span>
            <span class="value">${this.customization?.lastSaved ? esc(new Date(this.customization.lastSaved).toLocaleString()) : 'Never'}</span>
          </div>
        </div>
      </div>
    `;

    sidepanel.insertBefore(customerSection, sidepanel.firstChild);
  }

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
    this.setupEventDetailsHandlers();
    this.setupRSVPHandlers();
  }

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

    this.loadRSVPStats();
  }

  async loadPurchasedDesign() {
    try {
      const slides = this.customization.slides || [];
      
      // Dynamically import state management functions
      const { applyProject } = await import('./state-manager.js');
      
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

      applyProject(project);
      
      // Load first slide if available
      if (slides.length > 0) {
        const { loadSlideIntoDOM } = await import('./slide-manager.js');
        await loadSlideIntoDOM(slides[0]);
      }
      
      const { updateSlidesUI } = await import('./slide-manager.js');
      updateSlidesUI();

    } catch (error) {
      console.error('Failed to load purchased design:', error);
      this.showError('Failed to load your design');
    }
  }

  setupAutoSave() {
    // Clear existing interval if any
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      this.saveCustomization();
    }, 30000);

    // Save on page unload
    const handleUnload = () => {
      this.saveCustomization();
    };
    
    window.addEventListener('beforeunload', handleUnload);
    
    // Store reference to remove listener if needed
    this.unloadHandler = handleUnload;
  }

  async saveCustomization() {
    if (!this.isInitialized) return;
    if (this._saving) { this._saveQueued = true; return; }
    this._saving = true;
    
    try {
      // Dynamically import to avoid circular dependencies
      const { getSlides } = await import('./state-manager.js');
      const slides = getSlides();

      const eventDetails = {
        title: document.getElementById('eventTitle')?.value || '',
        date: document.getElementById('eventDate')?.value || '',
        location: document.getElementById('eventLocation')?.value || ''
      };

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
      if (this._saveQueued) { this._saveQueued = false; this.saveCustomization(); }
    }
  }

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
    clearTimeout(this._savedTimer);
    this._savedTimer = setTimeout(() => { badge?.remove(); }, 1500);
  }

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

  async showRSVPModal() {
    try {
      const response = await fetch(`/api/editor/${this.token}/rsvps`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load RSVPs');
      }
      
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
              <div class="response-count yes">Yes: ${esc(data.stats.yes)}</div>
              <div class="response-count no">No: ${esc(data.stats.no)}</div>
              <div class="response-count maybe">Maybe: ${esc(data.stats.maybe)}</div>
              <div class="response-count total">Total Guests: ${esc(data.stats.totalGuests)}</div>
            </div>
            
            <div class="rsvp-list">
              ${data.rsvps.map(rsvp => `
                <div class="rsvp-item">
                  <div class="guest-name">
                    ${esc(rsvp.guest_name)}
                    <span class="guest-response ${esc(rsvp.response)}">${esc(rsvp.response)}</span>
                  </div>
                  ${rsvp.guest_email ? `<div class="guest-email">${esc(rsvp.guest_email)}</div>` : ''}
                  ${rsvp.plus_one_count > 0 ? `<div class="plus-ones">+${esc(String(rsvp.plus_one_count))} guest(s)</div>` : ''}
                  ${rsvp.dietary_restrictions ? `<div class="dietary">Dietary: ${esc(rsvp.dietary_restrictions)}</div>` : ''}
                  ${rsvp.message ? `<div class="message">"${esc(rsvp.message)}"</div>` : ''}
                  <div class="submitted-date">${esc(new Date(rsvp.submitted_at).toLocaleDateString())}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.remove();
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });

    } catch (error) {
      this.showError('Failed to load RSVPs: ' + esc(error.message));
    }
  }

  shareInvitation() {
    const shareUrl = `${window.location.origin}/invitation/${this.customization.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: `You're invited to ${document.getElementById('eventTitle')?.value || 'our event'}!`,
        text: 'Please RSVP to our special event',
        url: shareUrl
      }).catch(() => {
        this.fallbackShare(shareUrl);
      });
    } else {
      this.fallbackShare(shareUrl);
    }
  }

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

  showAccessStatus() {
    if (!this.customer) return;
    if (this.customer.daysRemaining < 30) {
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
        Your access expires in ${esc(String(this.customer.daysRemaining))} days (${esc(new Date(this.customer.expiresAt).toLocaleDateString())}).
        Make sure to complete and share your invitation before then.
        <button id="dismissAccessWarn" style="margin-left:10px; padding:2px 6px; border:none; border-radius:4px; cursor:pointer;">✕</button>
      `;
      
      document.body.appendChild(warning);
      warning.querySelector('#dismissAccessWarn')?.addEventListener('click', () => warning.remove());
    }
  }

  showAccessError(message) {
    document.body.innerHTML = `
      <div style="position: fixed; inset: 0; background: linear-gradient(135deg, #0f1a2d, #1a2332); display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div style="background: white; border-radius: 18px; padding: 3rem; max-width: 500px; text-align: center;">
          <h1 style="color: #1f2937; margin-bottom: 1rem;">Access Expired or Invalid</h1>
          <p style="color: #6b7280; margin-bottom: 2rem;">${esc(message)}</p>
          <p style="color: #6b7280; font-size: 14px;">
            If you believe this is an error, please contact support with your purchase details.
          </p>
          <a href="mailto:support@yourdomain.com" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 1rem;">Contact Support</a>
        </div>
      </div>
    `;
  }

  showError(message) {
    console.error(message);
    // Could add toast notification here
  }

  showSuccess(message) {
    console.log(message);
    // Could add toast notification here
  }

  cleanup() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = null;
    }
    
    this.isInitialized = false;
  }
}

// -----------------------
// CSS for purchased design features
// -----------------------
const purchasedDesignCSS = `
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

// Add CSS for purchased design features
if (isPurchasedDesign) {
  const style = document.createElement('style');
  style.textContent = purchasedDesignCSS;
  document.head.appendChild(style);
}

// -----------------------
// Responsive scaling functionality
// -----------------------
let lastWorkW = null;
let resizeSaveT = null;
const workRO = new ResizeObserver(() => handleWorkResize());

function scaleAll(f) {
  if (!isFinite(f) || Math.abs(f - 1) < 0.0001) return;
  
  const work = document.querySelector('#work');
  [...work.querySelectorAll('.layer')].forEach(el => {
    const left = parseFloat(el.style.left || '0');
    const top = parseFloat(el.style.top || '0');
    const w = el.style.width ? parseFloat(el.style.width) : null;
    const fs = parseFloat(el.style.fontSize || getComputedStyle(el).fontSize) || 28;
    el.style.left = (left * f) + 'px';
    el.style.top = (top * f) + 'px';
    if (w != null && !Number.isNaN(w)) el.style.width = (w * f) + 'px';
    el.style.fontSize = (fs * f) + 'px';
  });
  
  if (imgState.has) {
    imgState.cx *= f;
    imgState.cy *= f;
    imgState.scale = Math.max(0.05, imgState.scale * f);
    setTransforms();
  }
  
  syncToolbarFromActive();
}

function handleWorkResize() {
  const { w } = workSize();
  if (w <= 0) return;
  if (lastWorkW == null) { 
    lastWorkW = w; 
    return; 
  }
  const f = w / lastWorkW;
  if (Math.abs(f - 1) > 0.001) {
    scaleAll(f);
    lastWorkW = w;
    clearTimeout(resizeSaveT);
    resizeSaveT = setTimeout(() => {
      if (purchasedDesignEditor?.isInitialized) {
        purchasedDesignEditor.saveCustomization();
      } else {
        saveProjectDebounced();
      }
    }, 400);
  }
}

// -----------------------
// Auth UI
// -----------------------
function setupAuthUI() {
  const loginForm = document.getElementById('loginForm');
  const authModal = document.getElementById('authModal');

  if (!loginForm || !authModal) {
    return;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    try {
      await apiClient.login({ email, password });
      authModal.style.display = 'none';
      
      const statusText = document.getElementById('statusText');
      if (statusText) {
        statusText.textContent = 'Logged in successfully';
        setTimeout(() => statusText.textContent = '', 3000);
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed: ' + (error.message || 'Unknown error'));
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

function showAuthModal() {
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.style.display = 'flex';
  }
}

// -----------------------
// Event Handlers
// -----------------------
function setupEventHandlers() {
  // Undo/Redo handlers
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  undoBtn?.addEventListener('click', doUndo);
  redoBtn?.addEventListener('click', doRedo);

  // Slide navigation handlers
  const prevSlideBtn = document.getElementById('prevSlideBtn');
  const nextSlideBtn = document.getElementById('nextSlideBtn');
  const playSlidesBtn = document.getElementById('playSlidesBtn');
  prevSlideBtn?.addEventListener('click', previousSlide);
  nextSlideBtn?.addEventListener('click', nextSlide);
  playSlidesBtn?.addEventListener('click', togglePlay);

  // Slide management handlers
  const addSlideBtn = document.getElementById('addSlideBtn');
  const dupSlideBtn = document.getElementById('dupSlideBtn');
  const delSlideBtn = document.getElementById('delSlideBtn');
  const slideDur = document.getElementById('slideDur');
  
  addSlideBtn?.addEventListener('click', addSlide);
  dupSlideBtn?.addEventListener('click', duplicateSlide);
  delSlideBtn?.addEventListener('click', deleteSlide);
  slideDur?.addEventListener('input', (e) => handleSlideDurationChange(Number(e.target.value) || 0));

  // Text management handlers
  const addTextBtn = document.getElementById('addTextBtn');
  const addTextInput = document.getElementById('addText');
  const textDeleteBtn = document.getElementById('textDelete');
  
  addTextBtn?.addEventListener('click', () => {
    const text = addTextInput.value.trim();
    if (text) addTextLayer(text);
  });
  
  addTextInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = addTextInput.value.trim();
      if (text) addTextLayer(text);
    }
  });
  
  textDeleteBtn?.addEventListener('click', deleteActiveText);

  // Text fade handlers
  const textFadeInBtn = document.getElementById('textFadeInBtn');
  const textFadeOutBtn = document.getElementById('textFadeOutBtn');
  const textFadeInRange = document.getElementById('textFadeInRange');
  const textFadeOutRange = document.getElementById('textFadeOutRange');
  
  textFadeInBtn?.addEventListener('click', handleTextFadeIn);
  textFadeOutBtn?.addEventListener('click', handleTextFadeOut);
  textFadeInRange?.addEventListener('input', (e) => handleTextFadeInRange(e.target.value));
  textFadeOutRange?.addEventListener('input', (e) => handleTextFadeOutRange(e.target.value));

  // Text styling handlers
  const fontSizeInput = document.getElementById('fontSize');
  const fontColorInput = document.getElementById('fontColor');
  const fontFamilySelect = document.getElementById('fontFamily');
  const boldBtn = document.getElementById('boldBtn');
  const italicBtn = document.getElementById('italicBtn');
  const underlineBtn = document.getElementById('underlineBtn');

  fontSizeInput?.addEventListener('input', (e) => handleFontSize(e.target.value));
  fontColorInput?.addEventListener('change', (e) => handleFontColor(e.target.value));
  fontFamilySelect?.addEventListener('change', (e) => handleFontFamily(e.target.value));
  boldBtn?.addEventListener('click', handleBold);
  italicBtn?.addEventListener('click', handleItalic);
  underlineBtn?.addEventListener('click', handleUnderline);

  // Image management handlers
  const imgScale = document.getElementById('imgScale');
  const imgRotate = document.getElementById('imgRotate');
  const imgFlip = document.getElementById('imgFlip');
  const imgDelete = document.getElementById('imgDelete');
  const uploadBgBtn = document.getElementById('uploadBgBtn');
  const bgFileInput = document.getElementById('bgFileInput');

  imgScale?.addEventListener('input', (e) => handleImageScale(e.target.value));
  imgRotate?.addEventListener('input', (e) => handleImageRotate(e.target.value));
  imgFlip?.addEventListener('click', handleImageFlip);
  imgDelete?.addEventListener('click', deleteImage);
  
  uploadBgBtn?.addEventListener('click', () => bgFileInput?.click());
  bgFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  });

  // Image fade handlers
  const imgFadeInBtn = document.getElementById('imgFadeInBtn');
  const imgFadeOutBtn = document.getElementById('imgFadeOutBtn');
  const imgFadeInRange = document.getElementById('imgFadeInRange');
  const imgFadeOutRange = document.getElementById('imgFadeOutRange');
  
  imgFadeInBtn?.addEventListener('click', handleImageFadeIn);
  imgFadeOutBtn?.addEventListener('click', handleImageFadeOut);
  imgFadeInRange?.addEventListener('input', (e) => handleImageFadeInRange(e.target.value));
  imgFadeOutRange?.addEventListener('input', (e) => handleImageFadeOutRange(e.target.value));

  // Preset handlers
  const presetGrid = document.getElementById('presetGrid');
  presetGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (btn) {
      const preset = btn.dataset.preset;
      applyPreset(preset);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        doUndo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        doRedo();
      } else if (e.key === 's') {
        e.preventDefault();
        if (purchasedDesignEditor?.isInitialized) {
          purchasedDesignEditor.saveCustomization();
        } else {
          saveProjectDebounced();
        }
      }
    }
  });
}

function setupImageDragHandlers() {
  const work = document.getElementById('work');
  const bgBox = document.getElementById('bgBox');
  
  if (!work || !bgBox) return;

  let dragState = null;

  // Background image drag handlers
  work.addEventListener('pointerdown', (e) => {
    const body = document.body;
    if (body.classList.contains('preview') || body.classList.contains('viewer')) return;
    
    if (e.target === work || e.target.closest('#userBgWrap')) {
      if (imgState.has) {
        e.preventDefault();
        dragState = {
          type: 'image',
          startX: e.clientX,
          startY: e.clientY,
          startCx: imgState.cx,
          startCy: imgState.cy
        };
        work.setPointerCapture(e.pointerId);
      }
    }
  });

  work.addEventListener('pointermove', (e) => {
    if (dragState?.type === 'image') {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      imgState.cx = dragState.startCx + dx;
      imgState.cy = dragState.startCy + dy;
      setTransforms();
    } else {
      handleTextDrag(e);
    }
  });

  work.addEventListener('pointerup', (e) => {
    if (dragState?.type === 'image') {
      dragState = null;
      import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
      if (purchasedDesignEditor?.isInitialized) {
        purchasedDesignEditor.saveCustomization();
      } else {
        saveProjectDebounced();
      }
    } else {
      endTextDrag();
    }
  });

  // Handle clicks on text layers for selection
  work.addEventListener('click', (e) => {
    const body = document.body;
    if (body.classList.contains('preview') || body.classList.contains('viewer')) return;
    
    const layer = e.target.closest('.layer');
    if (layer) {
      // Import and use text manager function
      import('./text-manager.js').then(({ handleSetActiveLayer }) => {
        handleSetActiveLayer(layer);
      });
    }
  });

  // Transform box handle dragging
  bgBox.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.handle');
    if (!handle || !imgState.has) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const handleType = handle.dataset.handle;
    const rect = work.getBoundingClientRect();
    
    dragState = {
      type: 'handle',
      handleType,
      startX: e.clientX,
      startY: e.clientY,
      startScale: imgState.scale,
      startAngle: imgState.angle,
      centerX: rect.left + imgState.cx,
      centerY: rect.top + imgState.cy
    };
    
    bgBox.setPointerCapture(e.pointerId);
  });

  bgBox.addEventListener('pointermove', (e) => {
    if (dragState?.type === 'handle') {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      
      if (dragState.handleType === 'rotate') {
        // Rotation handle: keep radians (renderer expects radians)
        const angleRad = Math.atan2(e.clientY - dragState.centerY, e.clientX - dragState.centerX);
        imgState.angle = angleRad;
      } else {
        // Scale handles
        const distance = Math.sqrt(dx * dx + dy * dy);
        const factor = 1 + (distance * (dx > 0 ? 1 : -1)) / 100;
        imgState.scale = Math.max(0.1, dragState.startScale * factor);
      }
      
      setTransforms();
    }
  });

  bgBox.addEventListener('pointerup', () => {
    if (dragState?.type === 'handle') {
      dragState = null;
      import('./slide-manager.js').then(({ writeCurrentSlide }) => writeCurrentSlide());
      if (purchasedDesignEditor?.isInitialized) {
        purchasedDesignEditor.saveCustomization();
      } else {
        saveProjectDebounced();
      }
    }
  });
}

// -----------------------
// Main initialization
// -----------------------
async function init() {
  try {
    // If purchased design mode is active, let it handle initialization
    if (isPurchasedDesign) {
      purchasedDesignEditor = new PurchasedDesignEditor(token);
      await purchasedDesignEditor.init();
      return;
    }

    // Import functions dynamically to avoid circular dependencies
    const { applyViewerFromUrl } = await import('./share-manager.js');
    const { 
      initializeResponsive, 
      setupUIEventHandlers, 
      setupRsvpHandlers, 
      setupMapHandlers, 
      initializeForMode, 
      initializeViewerFullscreen 
    } = await import('./ui-manager.js');
    const { setupShareHandler } = await import('./share-manager.js');
    const { loadProject } = await import('./state-manager.js');
    const { updateSlidesUI, loadSlideIntoDOM } = await import('./slide-manager.js');
    const { addTextLayer } = await import('./text-manager.js');
    const { initializeHistory } = await import('./state-manager.js');
    const { preloadSlideImageAt } = await import('./image-manager.js');

    // Apply viewer mode from URL
    applyViewerFromUrl();
    
    // Initialize UI components
    initializeResponsive();
    setupUIEventHandlers();
    initializeRsvpSystem();
    setupMapHandlers();
    setupShareHandler();
    initializeForMode();
    initializeViewerFullscreen();
    
    // Setup event handlers
    setupEventHandlers();
    setupImageDragHandlers();
    setupAuthUI();
    
    // Observe work area for responsive scaling
    const work = document.querySelector('#work');
    if (work) {
      const workRO = new ResizeObserver(() => handleWorkResize());
      workRO.observe(work);
    }
    
    // Load or create project
    const restored = await loadProject();
    updateSlidesUI();
    
    if (!restored) {
      await loadSlideIntoDOM({ 
        image: null, 
        layers: [], 
        workSize: workSize(), 
        durationMs: 3000 
      });
      addTextLayer("You're invited!");
      lastWorkW = workSize().w;
    } else {
      lastWorkW = workSize().w;
    }
    
    // Initialize history and preload
    initializeHistory();
    preloadSlideImageAt(1);
    
    // Start background video
    const fxVideo = document.querySelector('#fxVideo');
    if (fxVideo && fxVideo.play) {
      fxVideo.play().catch(() => {
        console.log('Background video autoplay blocked');
      });
    }

    // Show auth modal for regular editor if not logged in
    if (!apiClient.token && !document.body.classList.contains('viewer')) {
      setTimeout(() => {
        showAuthModal();
      }, 500);
    }
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    // Show error state
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = 'Failed to load editor';
    }
  }
}

// -----------------------
// Start the application
// -----------------------
init();
