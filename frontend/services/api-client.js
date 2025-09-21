import { logError, logWarning } from '../error-handler.js';

const SESSION_STORAGE_KEY = 'app_auth_session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const PERSISTENT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

function hasWindow() {
  return typeof window !== 'undefined' && window?.location;
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isStorageLike(candidate) {
  return (
    candidate &&
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  );
}

function getGlobal(key) {
  try {
    return typeof globalThis !== 'undefined' ? globalThis[key] : undefined;
  } catch (_) {
    return undefined;
  }
}

function getWebStorage(name) {
  const storage = getGlobal(name);
  return isStorageLike(storage) ? storage : null;
}

function safeStorageCall(storage, method, ...args) {
  if (!isStorageLike(storage)) return null;
  try {
    return storage[method](...args);
  } catch (error) {
    logWarning(error, `Storage ${method} failed`);
    return null;
  }
}

function readSessionRecord(storage, ttl) {
  if (!isStorageLike(storage)) return null;
  const raw = safeStorageCall(storage, 'getItem', SESSION_STORAGE_KEY);
  if (typeof raw !== 'string' || !raw) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logWarning(error, 'Failed to parse stored session');
    safeStorageCall(storage, 'removeItem', SESSION_STORAGE_KEY);
    return null;
  }

  if (!parsed || typeof parsed.token !== 'string') {
    safeStorageCall(storage, 'removeItem', SESSION_STORAGE_KEY);
    return null;
  }

  const lastActivity = Number(parsed.lastActivity);
  if (!Number.isFinite(lastActivity)) {
    safeStorageCall(storage, 'removeItem', SESSION_STORAGE_KEY);
    return null;
  }

  if (typeof ttl === 'number' && ttl > 0) {
    if (Date.now() - lastActivity > ttl) {
      safeStorageCall(storage, 'removeItem', SESSION_STORAGE_KEY);
      return null;
    }
  }

  const user = isPlainObject(parsed.user) ? parsed.user : null;
  return { token: parsed.token, user, lastActivity };
}

function writeSessionRecord(storage, record) {
  if (!isStorageLike(storage)) return false;
  if (!record || typeof record.token !== 'string') return false;

  const payload = {
    token: record.token,
    lastActivity: Number.isFinite(record.lastActivity)
      ? record.lastActivity
      : Date.now(),
  };

  if (record.user && isPlainObject(record.user)) {
    payload.user = record.user;
  }

  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    logWarning(error, 'Failed to persist session');
    return false;
  }
}

function removeSessionRecord(storage) {
  if (!isStorageLike(storage)) return;
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    logWarning(error, 'Failed to remove session');
  }
}

function resolveBaseInput(providedBase) {
  const envBase =
    typeof process !== 'undefined' && process?.env
      ? process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || null
      : null;

  if (typeof envBase === 'string' && envBase.trim()) {
    return envBase.trim();
  }

  if (typeof providedBase === 'string' && providedBase.trim()) {
    return providedBase.trim();
  }

  if (hasWindow()) {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    // Use the exact worker URL without any /api suffix
    return 'https://invitation-maker-api.celesia91.workers.dev';
  }

  return 'http://localhost:3001';
}

function normalizeBaseURLs(baseInput) {
  const raw = typeof baseInput === 'string' ? baseInput.trim() : '';
  if (!raw) {
    return { base: '', api: '/api' };
  }
  if (raw === '/') {
    return { base: '/', api: '/api' };
  }

  const withoutTrailing = raw.replace(/\/+$/, '');
  if (!withoutTrailing) {
    return { base: '', api: '/api' };
  }

  // If already ends with /api, do not append another /api
  if (withoutTrailing.toLowerCase().endsWith('/api')) {
    const root = withoutTrailing.slice(0, -4);
    const base = root || (withoutTrailing.startsWith('/') ? '/' : '');
    return { base, api: '/api' };
  }

  const api = withoutTrailing === '/' ? '/api' : `${withoutTrailing}/api`;
  return { base: withoutTrailing, api };
}

function joinUrl(base, path) {
  const baseStr = typeof base === 'string' ? base : '';
  const target = typeof path === 'string' ? path : '';

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target) || target.startsWith('//')) {
    return target;
  }

  if (!baseStr) {
    if (!target) return '';
    if (target.startsWith('/')) return target;
    return `/${target}`;
  }

  if (!target) {
    return baseStr;
  }

  if (target.startsWith('?') || target.startsWith('#')) {
    return `${baseStr}${target}`;
  }

  // Remove trailing slashes from base and leading slashes from path
  let normalizedBase = baseStr.replace(/\/+$/, '');
  let normalizedPath = target.replace(/^\/+/, '');

  // Prevent double /api if both base and path include it
  if (
    normalizedBase.toLowerCase().endsWith('/api') &&
    (normalizedPath.toLowerCase().startsWith('api/') || normalizedPath.toLowerCase() === 'api')
  ) {
    normalizedPath = normalizedPath.replace(/^api\/?/i, '');
  }

  // If normalizedBase ends with /api and normalizedPath is empty, just return normalizedBase
  if (normalizedBase.toLowerCase().endsWith('/api') && !normalizedPath) {
    return normalizedBase;
  }

  // Ensure single slash between base and path, but avoid trailing slash if path is empty
  if (normalizedPath) {
    return `${normalizedBase}/${normalizedPath}`.replace(/\/+/g, '/');
  } else {
    return normalizedBase;
  }
}

function appendQuery(endpoint, params) {
  if (!params || typeof params !== 'object') {
    return endpoint;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null) return;
        searchParams.append(key, String(item));
      });
    } else {
      searchParams.append(key, String(value));
    }
  }

  const query = searchParams.toString();
  if (!query) {
    return endpoint;
  }

  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}${query}`;
}
class APIClient {
  constructor(baseURL, fetchImpl) {
    const resolvedBase = resolveBaseInput(baseURL);
    const basePointsToApiNamespace =
      typeof resolvedBase === 'string' &&
      resolvedBase.trim().replace(/\/+$/, '').toLowerCase().endsWith('/api');
    this.baseURL = resolvedBase;
    // In a static export, we don't need separate API base URL handling
    this.apiBaseURL = resolvedBase;
    this._baseIncludesApi = false;
    this._preferApiNamespace = false;
    this.fetch = this._resolveFetch(fetchImpl);
    this.sessionKey = SESSION_STORAGE_KEY;
    this._storageKey = this.sessionKey;
    this.sessionDuration = SESSION_TTL;
    this.persistentDuration = PERSISTENT_TTL;
    this._storages = {
      local: getWebStorage('localStorage'),
      session: getWebStorage('sessionStorage'),
    };
    this.storage = this._storages.session ?? this._storages.local ?? null;
    this._storage = this.storage;
    this.currentDuration =
      this.storage === this._storages.local
        ? this.persistentDuration
        : this.sessionDuration;
    this.token = null;
    this.user = null;
    this.sessionInfo = { lastActivity: 0 };
    this.isRetrying = false;
    this._debug = false;

    this.loadSession();
  }

  _resolveFetch(fetchImpl) {
    if (typeof fetchImpl === 'function') {
      return fetchImpl;
    }

    const globalFetch = getGlobal('fetch');
    if (typeof globalFetch === 'function') {
      return globalFetch.bind(globalThis);
    }

    return async () => {
      throw new Error('A fetch implementation is required');
    };
  }

  loadSession() {
    const storages = [
      { storage: this._storages.local, ttl: this.persistentDuration },
      { storage: this._storages.session, ttl: this.sessionDuration },
    ];

    for (const { storage, ttl } of storages) {
      const record = readSessionRecord(storage, ttl);
      if (record) {
        this.token = record.token;
        this.user = record.user ?? null;
        this.sessionInfo.lastActivity = record.lastActivity;
        this.storage = storage;
        this._storage = this.storage;
        this.currentDuration =
          storage === this._storages.local
            ? this.persistentDuration
            : this.sessionDuration;
        this._clearOtherStorages(storage);
        return this.token;
      }
    }

    this.token = null;
    this.user = null;
    this.sessionInfo.lastActivity = 0;
    this.storage = this._storages.session ?? this._storages.local ?? null;
    this._storage = this.storage;
    this.currentDuration =
      this.storage === this._storages.local
        ? this.persistentDuration
        : this.sessionDuration;
    return null;
  }

  _clearOtherStorages(activeStorage) {
    for (const storage of Object.values(this._storages)) {
      if (storage && storage !== activeStorage) {
        removeSessionRecord(storage);
      }
    }
  }

  _selectStorage(remember) {
    if (remember && this._storages.local) {
      this.storage = this._storages.local;
      this._storage = this.storage;
      this.currentDuration = this.persistentDuration;
      return;
    }

    if (this._storages.session) {
      this.storage = this._storages.session;
      this._storage = this.storage;
      this.currentDuration = this.sessionDuration;
      return;
    }

    if (this._storages.local) {
      this.storage = this._storages.local;
      this._storage = this.storage;
      this.currentDuration = this.persistentDuration;
      return;
    }

    this.storage = null;
    this._storage = null;
    this.currentDuration = this.sessionDuration;
  }

  saveToken(token, options = {}) {
    const { remember } = options;

    if (remember !== undefined) {
      this._selectStorage(remember);
    } else if (
      !this.storage &&
      this._storage &&
      (isStorageLike(this._storage) || typeof this._storage.setItem === 'function')
    ) {
      this.storage = this._storage;
    }

    if (typeof token !== 'string' || !token) {
      this.clearToken();
      return;
    }

    if (!this.storage) {
      this.clearToken();
      return;
    }

    const record = {
      token,
      user: this.user ?? undefined,
      lastActivity: Date.now(),
    };

    let persisted = writeSessionRecord(this.storage, record);

    if (!persisted && this.storage && typeof this.storage.setItem === 'function') {
      try {
        const payload = {
          token,
          lastActivity: record.lastActivity,
        };
        if (record.user && isPlainObject(record.user)) {
          payload.user = record.user;
        }
        this.storage.setItem(this._storageKey, JSON.stringify(payload));
        persisted = true;
      } catch (error) {
        logWarning(error, 'Failed to persist session');
      }
    }

    if (!persisted) {
      this.clearToken();
      return;
    }

    this.token = token;
    this.sessionInfo.lastActivity = record.lastActivity;
    this._clearOtherStorages(this.storage);
    this._storage = this.storage;
  }

  clearToken() {
    this.token = null;
    this.user = null;
    this.sessionInfo.lastActivity = 0;
    removeSessionRecord(this._storages.local);
    removeSessionRecord(this._storages.session);
    this.storage = this._storages.session ?? this._storages.local ?? null;
    this._storage = this.storage;
    this.currentDuration =
      this.storage === this._storages.local
        ? this.persistentDuration
        : this.sessionDuration;
  }

  saveUser(user) {
    if (!isPlainObject(user)) {
      return;
    }

    this.user = { ...user };

    if (!this.token || !this.storage) {
      return;
    }

    const record = {
      token: this.token,
      user: this.user,
      lastActivity: Date.now(),
    };

    if (writeSessionRecord(this.storage, record)) {
      this.sessionInfo.lastActivity = record.lastActivity;
      this._clearOtherStorages(this.storage);
      this._storage = this.storage;
    }
  }

  getUser() {
    return this.user ?? null;
  }

  isSessionValid() {
    if (!this.token || !this.storage) {
      return false;
    }

    const record = readSessionRecord(this.storage, this.currentDuration);
    if (!record) {
      this.clearToken();
      return false;
    }

    this.token = record.token;
    if (record.user) {
      this.user = record.user;
    }
    this.sessionInfo.lastActivity = record.lastActivity;
    return true;
  }

  refreshSession() {
    if (!this.token || !this.storage) {
      return;
    }

    const record = readSessionRecord(this.storage, this.currentDuration);
    if (!record) {
      this.clearToken();
      return;
    }

    const updatedRecord = {
      token: record.token,
      user: record.user ?? this.user ?? undefined,
      lastActivity: Date.now(),
    };

    if (writeSessionRecord(this.storage, updatedRecord)) {
      this.token = updatedRecord.token;
      this.user = updatedRecord.user ?? null;
      this.sessionInfo.lastActivity = updatedRecord.lastActivity;
      this._clearOtherStorages(this.storage);
      this._storage = this.storage;
    }
  }

  isAuthenticated() {
    return Boolean(this.token && this.isSessionValid());
  }
  _buildRequestUrl(endpoint) {
    const target = typeof endpoint === 'string' ? endpoint.trim() : '';
    if (!target) {
      return this.baseURL || '';
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target) || target.startsWith('//')) {
      return target;
    }

    // Ensure we always have a leading slash for the endpoint
    const normalizedTarget = target.startsWith('/') ? target : `/${target}`;
    
    // Simple URL join that preserves the /api path
    const base = this.baseURL.replace(/\/+$/, '');
    return `${base}${normalizedTarget}`;
  }

  _prepareRequestOptions(endpoint, options = {}) {
    const url = this._buildRequestUrl(endpoint);
    const method = (options.method || 'GET').toUpperCase();
    const headers = { ...(options.headers || {}) };
    const fetchOptions = { method };

    if (options.signal) fetchOptions.signal = options.signal;
    if (options.credentials) fetchOptions.credentials = options.credentials;
    if (options.mode) fetchOptions.mode = options.mode;
    if (options.cache) fetchOptions.cache = options.cache;
    if (options.redirect) fetchOptions.redirect = options.redirect;
    if (options.keepalive) fetchOptions.keepalive = options.keepalive;

    let body = options.body;
    const hasContentType = Object.keys(headers).some(
      (name) => name.toLowerCase() === 'content-type',
    );
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;
    const isArrayBuffer =
      body instanceof ArrayBuffer || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView?.(body));
    const isUrlSearchParams = typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;

    if (body !== undefined) {
      if (isFormData || isBlob || isArrayBuffer) {
        fetchOptions.body = body;
      } else if (isUrlSearchParams) {
        fetchOptions.body = body.toString();
        if (!hasContentType) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        }
      } else if (typeof body === 'string') {
        fetchOptions.body = body;
        if (!hasContentType) {
          headers['Content-Type'] = 'application/json';
        }
      } else if (isPlainObject(body)) {
        fetchOptions.body = JSON.stringify(body);
        if (!hasContentType) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        fetchOptions.body = body;
      }
    } else if (!hasContentType && ['POST', 'PUT', 'PATCH'].includes(method)) {
      headers['Content-Type'] = 'application/json';
    }

    if (!options.skipAuth && this.token && this.isSessionValid()) {
      const hasAuthorization = Object.keys(headers).some(
        (name) => name.toLowerCase() === 'authorization',
      );
      if (!hasAuthorization) {
        headers.Authorization = `Bearer ${this.token}`;
      }
    }

    fetchOptions.headers = headers;

    return { url, fetchOptions };
  }

  async request(endpoint, options = {}) {
    if (!options.skipSessionRefresh) {
      this.refreshSession();
    }

    const { url, fetchOptions } = this._prepareRequestOptions(endpoint, options);
    const parsePreference = options.parse;
    const maxRetries = options.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? 1000;

    const performRequest = async () => {
      this._log('Request', fetchOptions.method, url);
      const response = await this.fetch(url, fetchOptions);
      return this._handleResponse(response, { parse: parsePreference, url });
    };

    try {
      const result = await this.retryRequest(performRequest, maxRetries, retryDelay);
      this._log('Response', fetchOptions.method, url, result);
      return result;
    } catch (error) {
      const status = error?.status ?? 0;
      if (status === 401) {
        this.clearToken();
      }
      if (error?.name === 'TypeError' && String(error.message || '').includes('fetch')) {
        throw new Error('Network error - please check your connection');
      }
      throw error;
    }
  }

  async _handleResponse(response, { parse, url } = {}) {
    const status = response?.status ?? 0;
    const headers = response?.headers;
    let contentType = '';

    if (headers) {
      if (typeof headers.get === 'function') {
        contentType = headers.get('content-type') || headers.get('Content-Type') || '';
      } else if (typeof headers['content-type'] === 'string') {
        contentType = headers['content-type'];
      }
    }

    const normalizedContentType = typeof contentType === 'string' ? contentType.toLowerCase() : '';
    const shouldParseJson =
      parse === 'json' || (parse !== 'text' && normalizedContentType.includes('application/json'));
    const shouldParseText = parse === 'text' || (!shouldParseJson && typeof response?.text === 'function');

    let data = null;

    if (shouldParseJson && typeof response?.json === 'function') {
      try {
        data = await response.json();
      } catch (error) {
        logWarning(error, 'Failed to parse JSON response', { url, status });
        data = null;
      }
    } else if (shouldParseText) {
      try {
        data = await response.text();
      } catch (error) {
        logWarning(error, 'Failed to read text response', { url, status });
        data = '';
      }
    }

    if (!response.ok) {
      const message = this._extractErrorMessage(data, response.statusText);
      const error = new Error(message || `HTTP ${status}`);
      error.status = status;
      error.payload = data;
      throw error;
    }

    return data;
  }

  _extractErrorMessage(payload, fallback) {
    if (!payload) {
      return fallback || 'Request failed';
    }
    if (typeof payload === 'string') {
      return payload;
    }
    if (typeof payload.error === 'string') {
      return payload.error;
    }
    if (payload.error && typeof payload.error.message === 'string') {
      return payload.error.message;
    }
    if (typeof payload.message === 'string') {
      return payload.message;
    }
    return fallback || 'Request failed';
  }

  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    const attempts = Math.max(1, Number(maxRetries) || 1);
    let attempt = 0;
    let lastError;

    while (attempt < attempts) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        attempt += 1;

        const status = error?.status ?? 0;
        const message = String(error?.message || '').toLowerCase();

        if (status >= 400 && status < 500 && status !== 429) {
          break;
        }
        if (
          message.includes('authentication') ||
          message.includes('invalid credentials') ||
          message.includes('unauthorized')
        ) {
          break;
        }
        if (attempt >= attempts) {
          break;
        }

        const waitMs = Number(delay) || 0;
        if (waitMs > 0) {
          const backoff = waitMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    throw lastError;
  }

  async get(endpoint, params = {}, options = {}) {
    const target = appendQuery(endpoint, params);
    return this.request(target, { ...options, method: 'GET' });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: data });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: data });
  }

  async patch(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body: data });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
  async register(userData) {
    this.isRetrying = true;
    try {
      const response = await this.post('/auth/register', userData);
      if (response?.token) {
        this.saveToken(response.token);
      }
      if (response?.user) {
        this.saveUser(response.user);
      }
      return response;
    } finally {
      this.isRetrying = false;
    }
  }

  async login(credentials = {}) {
    const { remember = false, ...loginData } = credentials || {};
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: loginData,
        skipAuth: true,
      });

      const token = response?.access_token || response?.token;
      if (!token) {
        throw new Error('No token received from server');
      }

      this.saveToken(token, { remember });

      if (response?.user) {
        this.saveUser(response.user);
      }

      return response;
    } catch (error) {
      logError(error, 'Login failed');
      throw error;
    }
  }

  async logout() {
    try {
      if (this.isAuthenticated()) {
        try {
          await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
          logWarning(error, 'Logout endpoint failed');
        }
      }
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    if (this.user && this.isSessionValid()) {
      return { user: this.user };
    }

    const response = await this.get('/auth/me');
    if (response?.user) {
      this.saveUser(response.user);
    }
    return response;
  }

  async getUserTokens() {
    return this.get('/api/user/tokens');
  }

  async updateTokens(amount, extra = {}) {
    return this.post('/api/purchase', { tokens: amount, ...extra });
  }

  async purchaseTokens(amount, extra = {}) {
    return this.updateTokens(amount, extra);
  }

  async getNavigationState() {
    return this.get('/api/navigation/state');
  }

  async updateNavigationState(patch) {
    return this.request('/api/navigation/state', {
      method: 'PATCH',
      body: patch,
    });
  }

  async listMarketplace(filters = {}) {
    const params = new URLSearchParams();
    const { role, category, search, ownerId, mine } = filters || {};

    if (typeof role === 'string' && role.trim()) params.set('role', role.trim());
    if (typeof category === 'string' && category.trim()) params.set('category', category.trim());
    if (typeof search === 'string' && search.trim()) params.set('search', search.trim());

    if (ownerId !== undefined && ownerId !== null) {
      const owner = String(ownerId).trim();
      if (owner) params.set('ownerId', owner);
    }

    const mineNormalized = typeof mine === 'string'
      ? ['1', 'true', 'yes', 'y'].includes(mine.trim().toLowerCase())
      : Boolean(mine);
    if (mineNormalized) params.set('mine', 'true');

    const query = params.toString();
    const endpoint = query ? `/api/marketplace?${query}` : '/api/marketplace';

    return this.request(endpoint, { method: 'GET' });
  }

  async recordView(designId) {
    if (!designId) {
      return { ok: false };
    }
    return this.post('/api/analytics/view', { designId });
  }

  async recordConversion(designId) {
    if (!designId) {
      return { ok: false };
    }
    return this.post('/api/analytics/convert', { designId });
  }

  async getPopularDesigns() {
    return this.get('/api/analytics/popular');
  }

  async getConversionRates() {
    return this.get('/api/analytics/conversions');
  }

  async getAdminCategories() {
    return this.get('/api/admin/categories');
  }

  async createAdminCategory(payload) {
    return this.post('/api/admin/categories', payload);
  }

  async deleteAdminCategory(id) {
    if (!id) {
      throw new Error('Category id is required');
    }
    return this.delete(`/api/admin/categories/${encodeURIComponent(id)}`);
  }

  async listAdminDesigns(params = {}) {
    return this.get('/api/admin/designs', params);
  }

  async createAdminDesign(payload) {
    return this.post('/api/admin/designs', payload);
  }

  async updateAdminDesign(id, payload) {
    if (!id) {
      throw new Error('Design id is required');
    }
    return this.put(`/api/admin/designs/${encodeURIComponent(id)}`, payload);
  }

  async patchAdminDesign(id, payload) {
    if (!id) {
      throw new Error('Design id is required');
    }
    return this.patch(`/api/admin/designs/${encodeURIComponent(id)}`, payload);
  }

  async archiveAdminDesign(id, { ifUnmodifiedSince } = {}) {
    if (!id) {
      throw new Error('Design id is required');
    }
    const headers = {};
    if (ifUnmodifiedSince) {
      headers['If-Unmodified-Since'] = ifUnmodifiedSince;
    }
    return this.delete(`/api/admin/designs/${encodeURIComponent(id)}`, { headers });
  }

  async updateAdminDesignPrice(id, price) {
    if (!id) {
      throw new Error('Design id is required');
    }
    return this.put(`/api/admin/designs/${encodeURIComponent(id)}/price`, { price });
  }

  async getDesigns(params = {}) {
    return this.get('/api/designs', params);
  }

  async getDesign(designId) {
    if (designId === undefined || designId === null) {
      throw new Error('designId is required');
    }
    return this.get(`/api/designs/${encodeURIComponent(designId)}`);
  }

  async getDesignsByCategory(category, params = {}) {
    if (!category) {
      throw new Error('category is required');
    }
    return this.get(`/api/designs/${encodeURIComponent(category)}`, params);
  }

  async listDesignWebm(designId) {
    if (designId === undefined || designId === null) {
      throw new Error('designId is required');
    }
    return this.get(`/api/designs/${encodeURIComponent(designId)}/webm`);
  }

  async createWebmAsset(payload) {
    return this.post('/api/webm', payload);
  }

  async getWebmAsset(id) {
    if (!id) {
      throw new Error('WebM id is required');
    }
    return this.get(`/api/webm/${encodeURIComponent(id)}`);
  }

  async updateWebmAsset(id, payload) {
    if (!id) {
      throw new Error('WebM id is required');
    }
    return this.patch(`/api/webm/${encodeURIComponent(id)}`, payload);
  }

  async deleteWebmAsset(id) {
    if (!id) {
      throw new Error('WebM id is required');
    }
    return this.delete(`/api/webm/${encodeURIComponent(id)}`);
  }

  async uploadImage(file, { endpoint = '/api/images/upload', fields = {} } = {}) {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileType = file.type ?? '';
    if (fileType && !ALLOWED_IMAGE_TYPES.has(fileType)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.');
    }

    if (Number.isFinite(file.size) && file.size > MAX_UPLOAD_SIZE) {
      throw new Error('File is too large. Maximum size is 10MB.');
    }

    if (!this.isAuthenticated()) {
      throw new Error('Authentication required for image upload');
    }

    if (typeof FormData === 'undefined') {
      throw new Error('FormData is not supported in this environment');
    }

    const formData = new FormData();
    formData.append('image', file);

    if (fields && typeof fields === 'object') {
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) continue;
        formData.append(key, value);
      }
    }

    return this.request(endpoint, { method: 'POST', body: formData });
  }

  async uploadImages(files, options) {
    const items = Array.from(files || []);
    const uploads = items.map((file) => this.uploadImage(file, options));
    return Promise.all(uploads);
  }

  setBaseURL(baseURL) {
    const resolvedBase = resolveBaseInput(baseURL);
    const baseIncludesApi =
      typeof resolvedBase === 'string' &&
      resolvedBase.trim().replace(/\/+$/, '').toLowerCase().endsWith('/api');
    const { base, api } = normalizeBaseURLs(resolvedBase);
    this.baseURL = base;
    this.apiBaseURL = api;
    this._baseIncludesApi = baseIncludesApi;
    this._preferApiNamespace = baseIncludesApi;
  }

  getBaseURL() {
    return this.baseURL;
  }

  async healthCheck() {
    const supportsAbort = typeof AbortController !== 'undefined';
    const controller = supportsAbort ? new AbortController() : null;
    let timeoutId;

    try {
      if (controller) {
        timeoutId = setTimeout(() => controller.abort(), 5000);
      }

      const response = await this.request('/health', {
        method: 'GET',
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Health check timed out');
      }
      throw new Error('Backend server is not responding');
    }
  }

  handleError(error) {
    logError(error, 'API Error');
    const message = error?.message || 'An unexpected error occurred.';

    if (message.includes('Network error')) {
      return 'Connection failed. Please check your internet connection.';
    }
    if (message.includes('Authentication required')) {
      return 'Please log in to continue.';
    }
    if (message.includes('Invalid credentials')) {
      return 'Invalid email or password.';
    }
    if (message.includes('User already exists')) {
      return 'An account with this email already exists.';
    }
    if (message.includes('Too many requests')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (message.includes('File is too large')) {
      return 'File is too large. Maximum size is 10MB.';
    }
    if (message.includes('Invalid file type')) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP).';
    }
    if (message.includes('Server error') || message.includes('Server temporarily unavailable')) {
      return 'Server temporarily unavailable. Please try again later.';
    }

    return message;
  }

  debug(enabled = true) {
    this._debug = enabled;
    if (enabled) {
      console.log('API Client Debug Mode Enabled');
      console.log('Base URL:', this.baseURL);
      console.log('API Base URL:', this.apiBaseURL);
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

const apiClient = new APIClient();

export { APIClient };
export { apiClient };
export default apiClient;
