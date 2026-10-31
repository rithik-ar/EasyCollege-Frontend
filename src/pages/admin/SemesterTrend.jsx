import React from 'react';
import { Legend } from './AdminParts';

const SERIES = [
    { key: 'sgpa', label: 'SGPA', color: 'var(--adm-ring-1)' },
    { key: 'cgpa', label: 'CGPA', color: 'var(--adm-ring-3)' }
];

// SGPA and CGPA per semester on one 0–10 scale (zoomed to the student's range). Lines are SVG stretched
// to the plot; dots and labels are HTML so they keep their shape at any width.
function SemesterTrend({ rows }) {
    const points = rows
        .map(row => ({ sem: row.sem, sgpa: parseFloat(row.sgpa), cgpa: parseFloat(row.cgpa) }))
        .filter(p => Number.isFinite(p.sgpa) || Number.isFinite(p.cgpa));
    if (points.length < 2) return null;

    // Zoom to the student's range in half-point steps (whole points when the spread is wide)
    const values = points.flatMap(p => [p.sgpa, p.cgpa]).filter(Number.isFinite);
    const spread = Math.max(...values) - Math.min(...values);
    const step = spread > 2 ? 1 : 0.5;
    let low = Math.max(0, Math.floor((Math.min(...values) - 0.1) / step) * step);
    const high = Math.min(10, Math.ceil((Math.max(...values) + 0.1) / step) * step);
    if (high - low < 2 * step) low = Math.max(0, high - 2 * step);
    const x = (index) => ((index + 0.5) / points.length) * 100;
    const y = (value) => ((value - low) / (high - low)) * 100;
    const gridlines = Array.from({ length: Math.round((high - low) / step) + 1 }, (_, i) => low + i * step);
    const latest = points[points.length - 1];

    return (
        <figure className="adm-trend" aria-label="SGPA and CGPA by semester">
            <Legend
                series={SERIES.map(s => ({
                    ...s,
                    label: Number.isFinite(latest[s.key]) ? `${s.label} ${latest[s.key].toFixed(2)}` : s.label
                }))}
            />
            <div className="adm-trend-plot">
                {gridlines.map(value => (
                    <span key={value} className="adm-trend-grid" style={{ bottom: `${y(value)}%` }} aria-hidden="true">
                        <span>{step < 1 ? value.toFixed(1) : value}</span>
                    </span>
                ))}
                <svg className="adm-trend-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {SERIES.map(s => (
                        <polyline
                            key={s.key}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                            points={points
                                .map((p, i) => (Number.isFinite(p[s.key]) ? `${x(i)},${100 - y(p[s.key])}` : null))
                                .filter(Boolean)
                                .join(' ')}
                        />
                    ))}
                </svg>
                {points.map((p, i) => SERIES.map(s => Number.isFinite(p[s.key]) && (
                    <span
                        key={`${p.sem}-${s.key}`}
                        className={`adm-trend-dot ${i < points.length / 3 ? 'is-start' : i > (2 * points.length) / 3 ? 'is-end' : ''}`}
                        style={{ left: `${x(i)}%`, bottom: `${y(p[s.key])}%`, background: s.color }}
                        tabIndex={0}
                        aria-label={`Semester ${p.sem}: ${s.label} ${p[s.key].toFixed(2)}`}
                    >
                        <span className="adm-tip" role="presentation">
                            <strong>Semester {p.sem}</strong>
                            <span>{s.label} <b>{p[s.key].toFixed(2)}</b></span>
                        </span>
                    </span>
                )))}
            </div>
            <div className="adm-trend-axis" aria-hidden="true">
                {points.map(p => <span key={p.sem}>S{p.sem}</span>)}
            </div>
        </figure>
    );
}

export default SemesterTrend;
