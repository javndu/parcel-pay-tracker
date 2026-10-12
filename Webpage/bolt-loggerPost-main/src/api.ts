import type { Entry, EntryInput } from '@/types';

const API_BASE = '/api';

export async function fetchEntries(): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/entries`);
  if (!res.ok) throw new Error('Failed to fetch entries');
  const data = await res.json();
  return data.entries || [];
}

export async function createEntry(entry: EntryInput): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to create entry');
  const data = await res.json();
  return data.entries || [];
}

export async function updateEntry(id: string, entry: EntryInput): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to update entry');
  const data = await res.json();
  return data.entries || [];
}

export async function togglePaid(id: string): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/entries/${id}/toggle-paid`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to toggle paid status');
  const data = await res.json();
  return data.entries || [];
}

export async function deleteEntry(id: string): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/entries/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete entry');
  const data = await res.json();
  return data.entries || [];
}

export async function markAllPaid(): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/entries/mark-all-paid`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark all as paid');
  const data = await res.json();
  return data.entries || [];
}

export async function clearAllEntries(): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/entries/clear-all`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear all entries');
  const data = await res.json();
  return data.entries || [];
}

export async function exportExcel(): Promise<void> {
  window.location.href = `${API_BASE}/export/excel`;
}

export async function exportInvoice(): Promise<void> {
  window.location.href = `${API_BASE}/export/invoice`;
}
