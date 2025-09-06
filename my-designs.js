// Offline designs loader using localStorage
async function loadDesigns() {
  const listEl = document.getElementById('designList');
  if (!listEl) return;

  listEl.textContent = '';

  try {
    const raw = localStorage.getItem('invite_maker_project_v10_share');
    if (!raw) {
      listEl.innerHTML = '<p>No designs found.</p>';
      return;
    }

    const project = JSON.parse(raw);
    const title = project.title || 'Untitled';

    const link = document.createElement('a');
    link.href = 'index.html';
    link.className = 'design-card';
    link.innerHTML = `
      <h3>${title}</h3>
    `;

    listEl.appendChild(link);
  } catch (err) {
    console.error('Failed to load designs:', err);
    listEl.innerHTML = '<p class="error">Failed to load designs.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadDesigns);

