// collapsible-groups.js - Manage collapsible UI groups

import { safeLocalStorage } from './utils.js';

const storage = safeLocalStorage();
const STORAGE_PREFIX = 'groupState-';

function getGroupId(group) {
  if (!group.dataset.cgId) {
    const groups = Array.from(document.querySelectorAll('.group'));
    const idx = groups.indexOf(group);
    group.dataset.cgId = idx; // may be -1 if not found
  }
  return group.dataset.cgId;
}

function saveState(group, collapsed) {
  const id = getGroupId(group);
  storage.setItem(STORAGE_PREFIX + id, collapsed ? 'collapsed' : 'expanded');
}

function collapseGroup(group) {
  if (!group) return;
  const title = group.querySelector('.group-title');
  group.classList.add('collapsed');
  if (title) title.setAttribute('aria-expanded', 'false');
  saveState(group, true);
}

function expandGroup(group) {
  if (!group) return;
  const title = group.querySelector('.group-title');
  group.classList.remove('collapsed');
  if (title) title.setAttribute('aria-expanded', 'true');
  saveState(group, false);
}

function toggleGroup(group) {
  if (!group) return;
  if (group.classList.contains('collapsed')) {
    expandGroup(group);
  } else {
    collapseGroup(group);
  }
}

export function initializeCollapsibleGroups() {
  const titles = document.querySelectorAll('.group-title');
  titles.forEach((title, index) => {
    title.setAttribute('tabindex', '0');
    title.setAttribute('role', 'button');
    const group = title.closest('.group');
    if (!group) return;
    group.dataset.cgId = index;

    const stored = storage.getItem(STORAGE_PREFIX + index);
    if (stored === 'collapsed') {
      collapseGroup(group);
    } else {
      expandGroup(group);
    }

    title.addEventListener('click', () => toggleGroup(group));
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleGroup(group);
      }
    });
  });
}

export function collapseAllGroups() {
  const groups = document.querySelectorAll('.group');
  groups.forEach((group) => collapseGroup(group));
}

export function expandAllGroups() {
  const groups = document.querySelectorAll('.group');
  groups.forEach((group) => expandGroup(group));
}

export function toggleAllGroups() {
  const groups = document.querySelectorAll('.group');
  groups.forEach((group) => toggleGroup(group));
}

