import { describe, expect, it } from 'vitest';
import { renderTable } from '../main.js';
import { sampleCollections } from '../api/mockData.js';

describe('renderTable', () => {
  it('renders a row for each document', () => {
    const container = document.createElement('div');

    renderTable(container, sampleCollections.users);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(sampleCollections.users.length);
    expect(rows[0].textContent).toContain('Ada Lovelace');
  });

  it('renders empty values safely', () => {
    const container = document.createElement('div');
    renderTable(container, [{ name: '', role: '', active: false }]);
    const cells = container.querySelectorAll('tbody td');
    expect(cells[0].textContent).toBe('');
    expect(cells[2].textContent).toBe('No');
  });
});
