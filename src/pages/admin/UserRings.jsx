import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import useAdminFetch from './useAdminFetch';
import { CountUp, Skel } from './AdminParts';
import { percent } from './format';

const SIZE = 104;
const STROKE = 9;
const GAP = 2; // surface gap between rings
const REFRESH_MS = 5 * 60 * 1000;
const SWEEP_STAGGER = 0.12; // seconds between rings, outer first

const MotionCircle = motion.circle;

// Outer to inner. One hue in validated light/dark steps: these are shares of the same users,
// and the categorical colours already mean failure reasons elsewhere on the page.
const RINGS = [
    { key: 'active_7d', label: 'Active 7d', color: 'var(--adm-ring-1)' },
    { key: 'active_30d', label: 'Active 30d', color: 'var(--adm-ring-2)' },
    { key: 'fast_mode_users', label: 'Fast Mode', color: 'var(--adm-ring-3)' }
];

// Share of all users on concentric rings. Each arc sweeps clockwise from the top to its value when data
// arrives, and later refreshes glide from wherever the arc is (springs start from the current value).
function UserRings({ token, onExpired, onOpen }) {
    const stats = useAdminFetch('/api/admin/stats', token, onExpired);
    const reduceMotion = useReducedMotion();
    const { reload } = stats;
    const s = stats.data;

    useEffect(() => {
        const timer = setInterval(reload, REFRESH_MS);
        return () => clearInterval(timer);
    }, [reload]);

    return (
        <section className="adm-rings" aria-label="Users">
            <button type="button" className="adm-rings-head" onClick={onOpen}>
                <span className="adm-kicker">Users</span>
                <span className="adm-rings-total">{s ? <CountUp value={s.total_users} /> : <Skel width="5ch" />}</span>
            </button>
            <div className="adm-rings-body">
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
                    {RINGS.map((ring, index) => {
                        const radius = SIZE / 2 - STROKE / 2 - index * (STROKE + GAP);
                        const share = s && s.total_users ? Math.min(1, s[ring.key] / s.total_users) : 0;
                        const delay = index * SWEEP_STAGGER;
                        return (
                            <g key={ring.key} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
                                <circle cx={SIZE / 2} cy={SIZE / 2} r={radius} fill="none" stroke={ring.color} strokeOpacity="0.18" strokeWidth={STROKE} />
                                <MotionCircle
                                    cx={SIZE / 2}
                                    cy={SIZE / 2}
                                    r={radius}
                                    fill="none"
                                    stroke={ring.color}
                                    strokeWidth={STROKE}
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: share, opacity: share > 0 ? 1 : 0 }}
                                    transition={reduceMotion
                                        ? { duration: 0 }
                                        : {
                                            pathLength: { type: 'spring', bounce: 0, duration: 1.1, delay },
                                            opacity: { duration: 0.12, delay }
                                        }}
                                />
                            </g>
                        );
                    })}
                </svg>
                <dl className="adm-rings-legend">
                    {RINGS.map((ring, index) => (
                        <div key={ring.key}>
                            <dt><span className="adm-swatch" style={{ background: ring.color }} aria-hidden="true" />{ring.label}</dt>
                            <dd>
                                {s ? (
                                    // Counts alongside its ring's sweep
                                    <CountUp
                                        value={percent(s[ring.key], s.total_users)}
                                        format={(n) => `${n}%`}
                                        from={0}
                                        duration={1100}
                                        delay={index * SWEEP_STAGGER * 1000}
                                    />
                                ) : <Skel width="3ch" />}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

export default UserRings;
