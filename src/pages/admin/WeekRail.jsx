import React, { useEffect, useState } from 'react';
import useAdminFetch from './useAdminFetch';
import { formatNumber, formatWeekday } from './format';
import { CountUp, Skel } from './AdminParts';

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAYS = [['M', 'Monday'], ['T', 'Tuesday'], ['W', 'Wednesday'], ['T', 'Thursday'], ['F', 'Friday'], ['S', 'Saturday'], ['S', 'Sunday']];
const REFRESH_MS = 5 * 60 * 1000;

// Monday 00:00 IST of the week containing `now`, the same week the backend's rollups use
const istWeekStart = (now) => {
    const ist = new Date(now + IST_OFFSET_MS);
    const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
    return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - daysSinceMonday) - IST_OFFSET_MS;
};

// The current week on a rail: failures per day filled up to today, later days dimmed,
// and a marker on the day eCampus first posted attendance
function WeekRail({ token, onExpired, onOpen }) {
    const failures = useAdminFetch('/api/admin/events?kind=failure&hours=168&limit=1', token, onExpired);
    const weekly = useAdminFetch('/api/admin/events/weekly?weeks=1', token, onExpired);
    const [now, setNow] = useState(() => Date.now());
    const { reload: reloadFailures } = failures;
    const { reload: reloadWeekly } = weekly;

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
            reloadFailures();
            reloadWeekly();
        }, REFRESH_MS);
        return () => clearInterval(timer);
    }, [reloadFailures, reloadWeekly]);

    const weekStart = istWeekStart(now);
    const today = Math.min(6, Math.floor((now - weekStart) / DAY_MS));

    // Daily buckets start at IST midnight; days before today with no bucket had no failures
    const counts = Array(7).fill(0);
    (failures.data?.timeline || []).forEach(bucket => {
        const index = Math.round((Date.parse(bucket.start) - weekStart) / DAY_MS);
        if (index >= 0 && index <= today) {
            counts[index] = Object.values(bucket.counts).reduce((sum, n) => sum + n, 0);
        }
    });
    const max = Math.max(1, ...counts);
    const total = counts.reduce((sum, n) => sum + n, 0);

    const thisWeek = (weekly.data?.weeks || []).find(w => Date.parse(w.week_start) === weekStart);
    const posted = thisWeek?.first_attendance_change_at || null;
    const postedDay = posted ? Math.floor((Date.parse(posted) - weekStart) / DAY_MS) : -1;

    return (
        <section className="adm-week" aria-label="This week">
            <button type="button" className="adm-week-head" onClick={onOpen}>
                <span className="adm-kicker">This week</span>
                <span className="adm-week-total">{failures.data ? <CountUp value={total} format={n => `${formatNumber(n)} failures`} /> : <Skel width="9ch" />}</span>
            </button>
            <ol className="adm-week-days">
                {DAYS.map(([letter, name], index) => {
                    const state = index < today ? 'past' : index === today ? 'today' : 'future';
                    const count = counts[index];
                    return (
                        <li key={name} className={`adm-week-day is-${state}`}>
                            <span className="adm-week-slot" aria-hidden="true">
                                {/* Bars mount with the data, so they grow from the rail once instead of popping in */}
                                {state !== 'future' && failures.data && (
                                    <span
                                        className="adm-week-bar"
                                        style={{ height: count ? `${Math.max(10, (100 * count) / max)}%` : undefined, animationDelay: `${index * 50}ms` }}
                                    />
                                )}
                            </span>
                            <span className="adm-week-letter" aria-hidden="true">{letter}</span>
                            <span className={`adm-week-mark ${index === postedDay ? 'is-posted' : ''}`} aria-hidden="true" />
                            <span className="adm-sr">
                                {name}: {state === 'future' ? 'not yet' : `${count} failures`}
                                {index === postedDay ? ', attendance posted' : ''}
                            </span>
                        </li>
                    );
                })}
            </ol>
            <p className="adm-week-note">
                {!weekly.data ? <Skel width="20ch" /> : posted ? `Attendance posted ${formatWeekday(posted)}` : 'No attendance update yet'}
            </p>
        </section>
    );
}

export default WeekRail;
