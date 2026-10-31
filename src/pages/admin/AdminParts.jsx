import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { formatClock, formatDay, formatNumber } from './format';

// A ruled section: mono kicker on the left, actions on the right
export function Panel({ title, meta, actions, children, className = '' }) {
    return (
        <section className={`adm-panel ${className}`} aria-label={title}>
            <header className="adm-panel-head">
                <h2 className="adm-kicker">{title}{meta && <span className="adm-kicker-meta">{meta}</span>}</h2>
                {actions && <div className="adm-panel-actions">{actions}</div>}
            </header>
            {children}
        </section>
    );
}

export function RefreshButton({ onClick, isLoading, label = 'Refresh' }) {
    return (
        <button type="button" className="adm-btn adm-btn-quiet" onClick={onClick} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'adm-spin' : ''} aria-hidden="true" />
            <span>{isLoading ? 'Loading' : label}</span>
        </button>
    );
}

// A number that counts up when it first appears: it starts near two-thirds of the value and decelerates
// sharply into it (exponential ease-out). Later changes glide from whatever is on screen, so a refresh
// mid-count never jumps. Screen readers get the final value; reduced motion shows it straight away.
export function CountUp({ value, format = formatNumber, from = 0.66, duration = 800, delay = 0 }) {
    const reduceMotion = useReducedMotion();
    const [shown, setShown] = useState(() => (reduceMotion ? value : Math.round(value * from)));
    const shownRef = useRef(shown);

    useEffect(() => {
        const start = shownRef.current;
        if (reduceMotion || start === value) {
            shownRef.current = value;
            setShown(value);
            return undefined;
        }
        let frame;
        let began;
        const tick = (now) => {
            if (began === undefined) began = now + delay;
            const t = Math.max(0, Math.min(1, (now - began) / duration));
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            shownRef.current = Math.round(start + (value - start) * eased);
            setShown(shownRef.current);
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, reduceMotion, duration, delay]);

    return (
        <span className="adm-count">
            <span aria-hidden="true">{format(shown)}</span>
            <span className="adm-sr">{format(value)}</span>
        </span>
    );
}

// Inline placeholder for a value that hasn't arrived (keeps the line's height, so nothing jumps)
export function Skel({ width = '3ch' }) {
    return <span className="adm-skel adm-skel-inline" style={{ width }} aria-hidden="true" />;
}

// Block placeholder sized like the content it stands in for: a chart, a strip of figures or a list
export function Skeleton({ kind = 'rows', count = 3, rowHeight }) {
    let body;
    if (kind === 'chart') {
        body = (
            <div className="adm-skel-chart">
                <span className="adm-skel" style={{ width: '40%', height: 10 }} />
                <span className="adm-skel adm-skel-plot" />
                <span className="adm-skel" style={{ width: '100%', height: 8 }} />
            </div>
        );
    } else if (kind === 'kpis') {
        body = (
            <div className="adm-kpis adm-kpis-wide">
                {Array.from({ length: count }, (_, i) => (
                    <div key={i}>
                        <span className="adm-skel" style={{ width: '7ch', height: 10 }} />
                        <span className="adm-skel adm-skel-value" />
                    </div>
                ))}
            </div>
        );
    } else {
        body = (
            <div className="adm-skel-rows">
                {Array.from({ length: count }, (_, i) => (
                    <div key={i} className="adm-skel-row" style={rowHeight ? { minHeight: rowHeight } : undefined}>
                        <span className="adm-skel" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
                        <span className="adm-skel" style={{ width: `${25 + ((i * 11) % 20)}%`, height: 8 }} />
                    </div>
                ))}
            </div>
        );
    }
    return <div className="adm-skeleton" role="status" aria-label="Loading">{body}</div>;
}

// Loading / error / empty state for a panel. Until data first arrives it shows `skeleton` (pass false for
// nothing); data already on screen stays during a reload, and errors show above it.
export function PanelState({ isLoading, error, isEmpty, hasData, empty = 'Nothing here yet.', onRetry, skeleton }) {
    if (error) {
        return (
            <p className="adm-state adm-state-error" role="alert">
                <CircleAlert size={14} aria-hidden="true" /> {error}
                {onRetry && <button type="button" className="adm-link" onClick={onRetry}>Retry</button>}
            </p>
        );
    }
    if (!hasData) {
        if (skeleton === false) return null;
        return skeleton || (isLoading ? <p className="adm-state" aria-live="polite"><span className="adm-pulse" aria-hidden="true" /> Loading</p> : null);
    }
    if (hasData && isEmpty) return <p className="adm-state">{empty}</p>;
    return null;
}

const MotionSpan = motion.span;

// The selected thumb slides between options (spring from MotionConfig), like a native segmented control
export function Segmented({ label, options, value, onChange }) {
    const id = useId();
    return (
        <div className="adm-segmented" role="radiogroup" aria-label={label}>
            {options.map(([key, text]) => (
                <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={value === key}
                    className={value === key ? 'is-active' : ''}
                    onClick={() => onChange(key)}
                >
                    {value === key && <MotionSpan layoutId={`adm-seg-${id}`} className="adm-seg-thumb" aria-hidden="true" />}
                    {text}
                </button>
            ))}
        </div>
    );
}

export function Legend({ series }) {
    return (
        <ul className="adm-legend">
            {series.map(s => (
                <li key={s.key}><span className="adm-swatch" style={{ background: s.color }} aria-hidden="true" />{s.label}</li>
            ))}
        </ul>
    );
}

// Columns over time. With several series the columns stack in series order (2px surface gaps,
// rounded at the top only); with one series the value is the bucket's total.
export function Timeline({ buckets, bucketHours, series, label }) {
    if (!buckets || buckets.length === 0) return null;
    const stacked = series.length > 1;
    const valuesFor = (bucket) => (stacked
        ? series.map(s => bucket.counts[s.key] || 0)
        : [Object.values(bucket.counts).reduce((sum, n) => sum + n, 0)]);
    const totals = buckets.map(b => valuesFor(b).reduce((sum, n) => sum + n, 0));
    const max = Math.max(1, ...totals);
    const describe = (bucket) => (bucketHours >= 24 ? formatDay(bucket.start) : `${formatDay(bucket.start)} ${formatClock(bucket.start)}`);
    const tickEvery = Math.ceil(buckets.length / 4);

    return (
        <figure className="adm-timeline" aria-label={label}>
            {stacked && <Legend series={series} />}
            <div className="adm-tl-plot">
                <span className="adm-tl-max" aria-hidden="true">{formatNumber(max)}</span>
                <div className="adm-tl-cols">
                    {buckets.map((bucket, index) => {
                        const values = valuesFor(bucket);
                        const total = totals[index];
                        const parts = series.map((s, i) => ({ ...s, value: values[i] || 0 })).filter(p => p.value > 0);
                        const summary = total === 0 ? 'none' : parts.map(p => `${p.value} ${p.label}`).join(', ');
                        const edge = index < buckets.length / 3 ? 'is-start' : index > (2 * buckets.length) / 3 ? 'is-end' : '';
                        return (
                            <div key={bucket.start} className={`adm-tl-col ${edge}`} tabIndex={0} aria-label={`${describe(bucket)}: ${summary}`}>
                                <div className="adm-tl-stack" style={{ height: `${(100 * total) / max}%`, animationDelay: `${index * 12}ms` }}>
                                    {/* column-reverse: first series sits on the baseline */}
                                    {parts.map(p => (
                                        <span key={p.key} style={{ flexGrow: p.value, background: p.color }} />
                                    ))}
                                </div>
                                <div className="adm-tip" role="presentation">
                                    <strong>{describe(bucket)}</strong>
                                    {total === 0 ? <span>None</span> : parts.map(p => (
                                        <span key={p.key}>
                                            {stacked && <i className="adm-swatch" style={{ background: p.color }} />}
                                            {p.label} <b>{p.value}</b>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="adm-tl-axis" aria-hidden="true">
                {buckets.map((bucket, index) => (
                    <span key={bucket.start}>
                        {index % tickEvery === 0 ? (bucketHours >= 24 ? formatDay(bucket.start) : formatClock(bucket.start)) : ''}
                    </span>
                ))}
            </div>
        </figure>
    );
}

// Horizontal bars of a whole (track) with a part filled in, e.g. users and how many were active
export function BarList({ rows, partLabel, wholeLabel, limit, onToggle, isExpanded }) {
    const max = Math.max(1, ...rows.map(r => r.whole));
    const shown = limit && !isExpanded ? rows.slice(0, limit) : rows;
    return (
        <div className="adm-barlist">
            <Legend series={[{ key: 'part', label: partLabel, color: 'var(--adm-s1)' }, { key: 'whole', label: wholeLabel, color: 'var(--adm-track)' }]} />
            <table className="adm-bars">
                <thead className="adm-sr">
                    <tr><th scope="col">Group</th><th scope="col">{wholeLabel}</th><th scope="col">{partLabel}</th></tr>
                </thead>
                <tbody>
                    {shown.map((row, index) => (
                        <tr key={row.key}>
                            <th scope="row">{row.key}</th>
                            <td className="adm-bars-track" aria-hidden="true">
                                <span className="adm-bars-whole" style={{ width: `${(100 * row.whole) / max}%`, animationDelay: `${index * 30}ms` }}>
                                    <span className="adm-bars-part" style={{ width: `${row.whole ? (100 * row.part) / row.whole : 0}%` }} />
                                </span>
                            </td>
                            <td className="adm-num">{formatNumber(row.whole)}</td>
                            <td className="adm-num adm-dim">{formatNumber(row.part)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {limit && rows.length > limit && (
                <button type="button" className="adm-link" onClick={onToggle}>
                    {isExpanded ? 'Show fewer' : `Show all ${rows.length}`}
                </button>
            )}
        </div>
    );
}

// Attendance percentage on a 0-100 track with the 65% and 75% thresholds marked
export function Meter({ value, tone }) {
    const width = Math.max(0, Math.min(100, value || 0));
    return (
        <span className="adm-meter" aria-hidden="true">
            <span className={`adm-meter-fill is-${tone}`} style={{ width: `${width}%` }} />
            <span className="adm-meter-mark" style={{ left: '65%' }} />
            <span className="adm-meter-mark" style={{ left: '75%' }} />
        </span>
    );
}
