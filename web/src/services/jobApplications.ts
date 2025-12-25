
import type { JobApplication, ApplicationNote, ApplicationStatus } from '../types';
import { getToken, ensureValidToken } from './auth';

// Support both VITE_API_URL and VITE_API_BASE for backwards compatibility
const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const BASE = `${API}/job-applications`;

async function getHeaders() {
  const token = await ensureValidToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

export async function list(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(BASE + query, {
    headers: await getHeaders()
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Neuspjelo učitavanje prijava');
  }
  return res.json() as Promise<JobApplication[]>;
}

export async function getById(id: string) {
  const res = await fetch(`${BASE}/${id}`, {
    headers: await getHeaders()
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Prijava nije pronađena');
  }
  return res.json() as Promise<JobApplication>;
}

export async function create(payload: Omit<JobApplication, 'id' | 'userId' | 'timeline'>) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Neuspjelo kreiranje');
  }
  return res.json() as Promise<JobApplication>;
}

export async function update(id: string, payload: Omit<JobApplication, 'id' | 'userId' | 'timeline'>) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: await getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Neuspjelo ažuriranje');
  }
  return res.json() as Promise<JobApplication>;
}

export async function remove(id: string) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: await getHeaders()
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Neuspjelo brisanje');
  }
}

export async function addNote(id: string, note: { content: string; type?: string }) {
  const res = await fetch(`${BASE}/${id}/notes`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(note)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Neuspjelo dodavanje bilješke');
  }
  return res.json() as Promise<ApplicationNote>;
}

export const Statuses: ApplicationStatus[] = [
  'Applied','Screening','Interview','Offer','Accepted','Rejected','OnHold'
];
