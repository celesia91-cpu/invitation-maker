const navigationStateByUser = new Map();

function normalizeUserId(userId) {
  const id = String(userId ?? '').trim();
  if (!id) {
    throw new Error('userId is required to access navigation state');
  }
  return id;
}

function assertPlainObject(value, message) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(message);
  }
}

function cloneState(state) {
  return Object.assign({}, state);
}

export function getNavigationState(userId) {
  const id = normalizeUserId(userId);
  const existing = navigationStateByUser.get(id);
  return existing ? cloneState(existing) : {};
}

export function saveNavigationState(userId, updates) {
  const id = normalizeUserId(userId);
  assertPlainObject(updates, 'Navigation state must be provided as an object');

  const current = navigationStateByUser.get(id) || {};
  const merged = cloneState(current);

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }

  navigationStateByUser.set(id, merged);
  return cloneState(merged);
}
