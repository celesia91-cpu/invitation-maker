import { apiClient } from './api-client.js';

async function loadDesigns() {
  const listEl = document.getElementById('designList');
  if (!listEl) return;

  listEl.textContent = 'Loading...';

  try {
    const designs = await apiClient.getUserDesigns();
    listEl.textContent = '';

    if (!Array.isArray(designs) || designs.length === 0) {
      listEl.innerHTML = '<p>No designs found.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const design of designs) {
      const id = design.id || design._id || design.projectId;
      const thumb = design.thumbnail || design.thumbUrl || '';
      const title = design.title || 'Untitled';
      const updated = design.updatedAt
        ? new Date(design.updatedAt).toLocaleString()
        : '';

      const link = document.createElement('a');
      link.href = `index.html?project=${encodeURIComponent(id)}`;
      link.className = 'design-card';
      link.innerHTML = `
        ${thumb ? `<img src="${thumb}" alt="${title}">` : ''}
        <h3>${title}</h3>
        <p class="updated">${updated}</p>
      `;

      fragment.appendChild(link);
    }

    listEl.appendChild(fragment);
  } catch (err) {
    console.error('Failed to load designs:', err);
    listEl.innerHTML = '<p class="error">Failed to load designs.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadDesigns);

