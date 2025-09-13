async function loadCategories() {
  const res = await fetch('/api/admin/categories');
  const list = await res.json();
  const ul = document.getElementById('categoryList');
  if (!ul) return;
  ul.innerHTML = '';
  list.forEach((c) => {
    const li = document.createElement('li');
    li.textContent = `${c.id}: ${c.name}`;
    ul.appendChild(li);
  });
}

const categoryForm = document.getElementById('categoryForm');
categoryForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryName').value;
  await fetch('/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name })
  });
  categoryForm.reset();
  loadCategories();
});

const designForm = document.getElementById('designForm');
designForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('designTitle').value;
  const category = document.getElementById('designCategory').value;
  const thumbnailUrl = document.getElementById('designThumb').value;
  const price = Number(document.getElementById('designPrice').value);
  await fetch('/api/admin/designs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category, thumbnailUrl, price })
  });
  designForm.reset();
});

const priceForm = document.getElementById('priceForm');
priceForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('priceDesignId').value;
  const price = Number(document.getElementById('newPrice').value);
  await fetch(`/api/admin/designs/${id}/price`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price })
  });
  priceForm.reset();
});

loadCategories();
