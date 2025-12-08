import './style.css';
import { sampleCollections } from './api/mockData.js';

/**
 * Render a simple table of collection documents.
 * @param {HTMLElement} root - Container element.
 * @param {Array<Object>} data - Documents to display.
 */
export function renderTable(root, data = []) {
  if (!root) return;

  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Name</th><th>Role</th><th>Active</th></tr>';

  const tbody = document.createElement('tbody');
  data.forEach((doc) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${doc.name || ''}</td>
      <td>${doc.role || ''}</td>
      <td>${doc.active ? 'Yes' : 'No'}</td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  root.innerHTML = '';
  root.appendChild(table);
}

function renderApp() {
  const root = document.getElementById('app');
  renderTable(root, sampleCollections.users || []);
}

if (typeof document !== 'undefined') {
  renderApp();
}
