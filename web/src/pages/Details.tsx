
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { JobApplication } from '../types';
import { addNote, getById } from '../services/jobApplications';
import { toast } from '../utils/toast';

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<JobApplication | null>(null);
  const [note, setNote] = useState<{ content: string; type: string }>({ content: '', type: '' });

  async function load() {
    if (!id) return;
    try {
      const item = await getById(id);
      setData(item);
    } catch (e: any) {
      toast(e?.message ?? 'Greška pri učitavanju', 'error');
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !note.content.trim()) return;
    try {
      await addNote(id, { content: note.content.trim(), type: note.type || undefined });
      setNote({ content: '', type: '' });
      toast('Bilješka dodana ✅', 'success');
      await load();
    } catch (e: any) {
      toast(e?.message ?? 'Greška pri dodavanju bilješke', 'error');
    }
  }

  if (!data) return <div className="container center"><div className="card">Učitavanje...</div></div>;

  const appliedAt = new Date(data.appliedDate).toLocaleString();

  return (
    <div className="container">
      {/* HERO / NASLOV */}
      <section className="neon-hover">
        <h2 className="m-0">{data.company} — {data.position}</h2>

        <div className="chips mt-8">
          <span className={`pill ${data.status ?? ''}`}>Status: {data.status}</span>
          {data.location && <span className="chip">📍 {data.location}</span>}
          <span className="chip">🗓️ {appliedAt}</span>
          {data.source && <span className="chip">🔗 Izvor: {data.source}</span>}
          {data.expectedSalary && <span className="chip">💰 {data.expectedSalary}</span>}
        </div>
      </section>

      {/* GRID KARTICE */}
      <div className="grid mt-12">
        {/* Detalji pozicije */}
        <div className="card">
          <h3 className="m-0">Detalji pozicije</h3>
          <table className="mt-8">
            <tbody>
              <tr>
                <th>Kompanija</th>
                <td>{data.company}</td>
              </tr>
              <tr>
                <th>Pozicija</th>
                <td>{data.position}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td><span className={`pill ${data.status ?? ''}`}>{data.status}</span></td>
              </tr>
              {data.location && (
                <tr>
                  <th>Lokacija</th>
                  <td>{data.location}</td>
                </tr>
              )}
              {data.expectedSalary && (
                <tr>
                  <th>Očekivana plata</th>
                  <td>{data.expectedSalary}</td>
                </tr>
              )}
              {data.notes && (
                <tr>
                  <th>Napomena</th>
                  <td>{data.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Linkovi / URL */}
        <div className="card">
          <h3 className="m-0">Linkovi</h3>
          <div className="mt-8">
            {data.jobPostingUrl ? (
              <a
                href={data.jobPostingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 12px', borderRadius: '10px' }}
              >
                🔎 Otvori oglas
              </a>
            ) : (
              <p className="m-0">Nije unesen URL oglasa.</p>
            )}
          </div>
        </div>
      </div>

      
      {/* TIMELINE / BILJEŠKE */}
      <section className="mt-12">
        <h3 className="m-0">Timeline / Bilješke</h3>

        <div className="timeline mt-8">
          {(data.timeline ?? []).map((n, idx) => {
            const date = new Date(n.createdAt).toLocaleString();
            const type = n.type ?? 'note';

            // mapa ikonica po tipu
            const icons: Record<string, string> = {
              call: '📞',
              email: '✉️',
              interview: '🎤',
              reminder: '⏰',
              update: '🔄',
              note: '📝',
            };
            const icon = icons[type] ?? '📝';

            return (
              <div className="timeline-item neon-hover" key={idx}>
                <div className="timeline-dot" />
                <div className="timeline-card card">
                  <div className="timeline-header">
                    <span className="note-date">{date}</span>
                    <span className="note-type">{type}</span>
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-icon">{icon}</span>
                    <p className="m-0">{n.content}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {(data.timeline ?? []).length === 0 && (
            <div className="timeline-empty card center">
              <p className="m-0">Nema bilješki.</p>
            </div>
          )}
        </div>

        {/* Forma za novu bilješku */}
        <form className="form inline mt-12" onSubmit={submitNote}>
          <div>
            <label>Bilješka</label>
            <textarea
              placeholder="Upiši bilješku…"
              value={note.content}
              onChange={(e) => setNote((prev) => ({ ...prev, content: e.target.value }))}
            />
          </div>
          <div>
            <label>Tip</label>
            <select
              value={note.type}
              onChange={(e) => setNote((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="">(bez)</option>
              <option value="call">Poziv</option>
              <option value="email">Email</option>
              <option value="interview">Intervju</option>
              <option value="reminder">Podsjetnik</option>
              <option value="update">Update</option>
            </select>
          </div>
          <div className="center">
            <button type="submit">Dodaj</button>
          </div>
        </form>
      </section>


    </div>
  );
}
