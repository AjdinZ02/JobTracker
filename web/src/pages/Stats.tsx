
import { useEffect, useMemo, useState } from 'react';
import type { JobApplication, ApplicationStatus } from '../types';
import { list } from '../services/jobApplications';
import { Statuses } from '../services/jobApplications';
import { toast } from '../utils/toast';

/* ---------- Helpers ---------- */
function fmtMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function parseISO(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
function inRange(d: Date, from?: Date | null, to?: Date | null) {
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/* ---------- Mini vizualni komponenti  ---------- */
function BarChart({
  data,
  height = 220,
  barColor = 'url(#barGradient)',
  label = 'Mjesečno'
}: {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  label?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = Math.max(360, data.length * 48);
  const padX = 28;
  const padTop = 20;
  const padBottom = 42;
  const chartW = w - padX * 2;
  const chartH = height - padTop - padBottom;

  return (
    <div className="card chart">
      <h3 className="m-0">{label}</h3>
      <div className="chart-scroller">
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={label}>
          <defs>
            <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(124,58,237,0.95)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.35)" />
            </linearGradient>
            <linearGradient id="gridGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
            </linearGradient>
          </defs>

          {/* Grid linije */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padTop + chartH * p;
            return (
              <line
                key={i}
                x1={padX}
                x2={w - padX}
                y1={y}
                y2={y}
                stroke="url(#gridGradient)"
                strokeWidth="1"
              />
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const bw = 28;
            const gap = 20;
            const x = padX + i * (bw + gap);
            const h = Math.round((d.value / max) * chartH);
            const y = padTop + (chartH - h);
            return (
              <g key={d.label} className="bar">
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={h}
                  rx="8"
                  fill={barColor}
                />
                <text x={x + bw / 2} y={height - 18} textAnchor="middle" fontSize="11" fill="var(--txt-dim)">
                  {d.label}
                </text>
                {d.value > 0 && (
                  <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="var(--txt)">
                    {d.value}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function LineChart({
  data,
  height = 220,
  color = 'rgba(34,211,238,0.9)',
  label = 'Kumulativno'
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  label?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = Math.max(360, data.length * 48);
  const padX = 28;
  const padTop = 20;
  const padBottom = 42;
  const chartW = w - padX * 2;
  const chartH = height - padTop - padBottom;

  const points = data.map((d, i) => {
    const xStep = chartW / Math.max(1, data.length - 1);
    const x = padX + i * xStep;
    const y = padTop + chartH - (d.value / max) * chartH;
    return { x, y };
  });

  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  return (
    <div className="card chart">
      <h3 className="m-0">{label}</h3>
      <div className="chart-scroller">
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={label}>
          <defs>
            <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0.26)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0.02)" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padTop + chartH * p;
            return (
              <line
                key={i}
                x1={padX}
                x2={w - padX}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="1"
              />
            );
          })}

          {/* Područje */}
          <path
            d={`${path} L ${padX + chartW} ${padTop + chartH} L ${padX} ${padTop + chartH} Z`}
            fill="url(#lineFill)"
          />

          {/* Linija */}
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" />

          {/* Tačke */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.2" fill={color} />
          ))}

          {/* Oznake ispod */}
          {data.map((d, i) => {
            const xStep = chartW / Math.max(1, data.length - 1);
            const x = padX + i * xStep;
            return (
              <text
                key={d.label}
                x={x}
                y={height - 18}
                textAnchor="middle"
                fontSize="11"
                fill="var(--txt-dim)"
              >
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ---------- Glavna stranica ---------- **/
export default function Stats() {
  const [items, setItems] = useState<JobApplication[]>([]);
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  async function load() {
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (from) params.from = new Date(from).toISOString();
      if (to) params.to = new Date(to).toISOString();
      const data = await list(params);
      setItems(data);
    } catch (e: any) {
      toast(e?.message ?? 'Greška pri učitavanju statistike', 'error');
    }
  }

  useEffect(() => {
    load();
    
  }, []);

  /* ----- Filtrirani niz po lokalnim filterima  ----- */
  const filtered = useMemo(() => {
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;
    return items.filter((x) => {
      const d = parseISO(x.appliedDate);
      if (!d) return false;
      if (status && x.status !== status) return false;
      return inRange(d, f, t);
    });
  }, [items, status, from, to]);

  /** ----- Brojevi po statusu ----- */
  const byStatus = useMemo(() => {
    const m = new Map<ApplicationStatus, number>();
    for (const s of Statuses) m.set(s, 0);
    for (const i of filtered) m.set(i.status, (m.get(i.status as ApplicationStatus) ?? 0) + 1);
    return m;
  }, [filtered]);

  /* ----- Mjesečna agregacija ----- */
  const byMonth = useMemo(() => {
    const mm = new Map<string, number>();
    for (const i of filtered) {
      const d = parseISO(i.appliedDate);
      if (!d) continue;
      const k = fmtMonthKey(d);
      mm.set(k, (mm.get(k) ?? 0) + 1);
    }
    const entries = [...mm.entries()].sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([label, value]) => ({ label, value }));
  }, [filtered]);

  /* ----- running total po mjesecu ----- */
  const cumulative = useMemo(() => {
    let run = 0;
    return byMonth.map((d) => {
      run += d.value;
      return { label: d.label, value: run };
    });
  }, [byMonth]);

  /* ----- Glavne metrike ----- */
  const total = filtered.length;
  const interviews = byStatus.get('Interview') ?? 0;
  const offers = byStatus.get('Offer') ?? 0;
  const accepted = byStatus.get('Accepted') ?? 0;
  const rejected = byStatus.get('Rejected') ?? 0;
  const offerRate = total ? Math.round((offers / total) * 100) : 0;
  const passRate = total ? Math.round(((interviews + offers + accepted) / total) * 100) : 0;

  return (
    <section className="neon-hover">
      <h2>Statistika</h2>

      {/* Filteri */}
      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus | '')}>
          <option value="">Status (svi)</option>
          {Statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label>
          Od datuma
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Do datuma
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button onClick={load}>Primijeni</button>
      </div>

      
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-title">Ukupno prijava</div>
          <div className="kpi-value">{total}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Interviews</div>
          <div className="kpi-value">{interviews}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Offers</div>
          <div className="kpi-value">{offers}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Accepted</div>
          <div className="kpi-value">{accepted}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Rejected</div>
          <div className="kpi-value">{rejected}</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Offer rate</div>
          <div className="kpi-value">{offerRate}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-title">Pass rate*</div>
          <div className="kpi-value">{passRate}%</div>
        </div>
      </div>
      <p className="kpi-note">* Pass rate = (Interview + Offer + Accepted) / Ukupno</p>

      
      <div className="grid">
        <BarChart data={byMonth} label="Prijave po mjesecu" />
        <LineChart data={cumulative} label="Kumulativ broja prijava (po mjesecu)" />
      </div>

      
      <div className="card mt-12">
        <h3 className="m-0">Po statusu</h3>
        <table className="mt-12">
          <thead>
            <tr>
              <th>Status</th>
              <th>Broj</th>
              <th>Udio</th>
            </tr>
          </thead>
          <tbody>
            {Statuses.map((s) => {
              const n = byStatus.get(s) ?? 0;
              return (
                <tr key={s}>
                  <td><span className={`pill ${s}`}>{s}</span></td>
                  <td>{n}</td>
                  <td>{total ? Math.round((n / total) * 100) : 0}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total === 0 && (
        <p className="mt-12" style={{ color: 'var(--txt-dim)' }}>
          Nema podataka za odabrane filtere.
        </p>
      )}
    </section>
  );
}
