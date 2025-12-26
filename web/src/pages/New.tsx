
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { create, Statuses } from '../services/jobApplications';
import type { ApplicationStatus } from '../types';
import { toast } from '../utils/toast';

const toUtcMidnight = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();

export default function New() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    company: '',
    position: '',
    location: '',
    status: 'Applied' as ApplicationStatus,
    appliedDate: toUtcMidnight(new Date()),
    source: '',
    jobPostingUrl: '',
    expectedSalary: '',
    notes: ''
  });

  function set<K extends keyof typeof form>(key: K, v: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.company.trim() || !form.position.trim()) {
      toast('Company i Position su obavezni.', 'error');
      return;
    }

    const payload = {
      company: form.company.trim(),
      position: form.position.trim(),
      location: form.location.trim(),
      status: form.status,
      appliedDate: form.appliedDate,
      source: form.source || undefined,
      jobPostingUrl: form.jobPostingUrl || undefined,
      expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : undefined,
      notes: form.notes || undefined
    };

    try {
      await create(payload);
      toast('Sačuvano ✅', 'success');
      nav('/');
    } catch (err: any) {
      toast(err?.message ?? 'Greška pri spremanju', 'error');
    }
  }

  return (
    <section className="neon-hover">
      <h2>Nova prijava</h2>
      <form onSubmit={submit} className="form">
        <label>Kompanija
          <input required value={form.company} onChange={e => set('company', e.target.value)} />
        </label>
        <label>Pozicija
          <input required value={form.position} onChange={e => set('position', e.target.value)} />
        </label>
        <label>Lokacija
          <input required value={form.location} onChange={e => set('location', e.target.value)} />
        </label>
        <label>Status
          <select value={form.status} onChange={e => set('status', e.target.value as ApplicationStatus)}>
            {Statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Datum prijave
          <input type="date"
            value={form.appliedDate.slice(0,10)}
            onChange={e => {
              const d = e.target.value ? new Date(e.target.value) : new Date();
              set('appliedDate', toUtcMidnight(d));
            }}
          />
        </label>
        <label>Izvor
          <input value={form.source} onChange={e => set('source', e.target.value)} />
        </label>
        <label>URL oglasa
          <input value={form.jobPostingUrl} onChange={e => set('jobPostingUrl', e.target.value)} />
        </label>
        <label>Plata
          <input type="number" value={form.expectedSalary} onChange={e => set('expectedSalary', e.target.value)} />
        </label>
        <label>Napomena
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} />
        </label>
        <div className="actions">
          <button type="submit">Sačuvaj</button>
        </div>
      </form>
    </section>
  );
}
