
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { JobApplication, ApplicationStatus } from '../types';
import { list, remove } from '../services/jobApplications';
import { Statuses } from '../services/jobApplications';
import { toast } from '../utils/toast';

export default function List() {
  const [items, setItems] = useState<JobApplication[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | ''>('');

  async function load() {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (status) params.status = status;
      const data = await list(params);
      setItems(data);
    } catch (e: any) {
      toast(e?.message ?? 'Greška pri učitavanju', 'error');
    }
  }

  useEffect(() => { load(); }, []); // initial

  return (
    <section className="neon-hover">
      <h2>Lista prijava</h2>
      <div className="filters">
        <input
          placeholder="Pretraga (company/position)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={status} onChange={e => setStatus(e.target.value as ApplicationStatus | '')}>
          <option value="">Status (svi)</option>
          {Statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load}>Primijeni</button>
      </div>

      <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Kompanija</th>
            <th>Pozicija</th>
            <th>Status</th>
            <th>Datum apliciranja</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id}>
              <td>{i.company}</td>
              <td>{i.position}</td>
              <td><span className={`pill ${i.status}`}>{i.status}</span></td>
              <td>{new Date(i.appliedDate).toLocaleDateString()}</td>
              <td className="actions">
                <Link to={`/app/${i.id}`}>Detalji</Link>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    if (!confirm('Obrisati prijavu?')) return;
                    try {
                      await remove(i.id);
                      toast('Obrisano 🗑️', 'info');
                      await load();
                    } catch (e: any) {
                      toast(e?.message ?? 'Greška pri brisanju', 'error');
                    }
                  }}
                >
                  Obriši
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5}>Nema rezultata.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </section>
  );
}
