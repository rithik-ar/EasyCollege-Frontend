import React from 'react';
import { formatDay, formatWeekday } from './format';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MINUTES = 24 * 60;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_WEEKS = 12;

// Where in the week (0 = Monday 00:00 IST, 1 = next Monday) eCampus first posted attendance
const weekPosition = (week) => (Date.parse(week.first_attendance_change_at) - Date.parse(week.week_start)) / WEEK_MS;

// Median landing time as "Thu ~08:30", rounded to the quarter hour
const typicalLanding = (positions) => {
    const sorted = [...positions].sort((a, b) => a - b);
    const middle = sorted.length / 2;
    const median = sorted.length % 2 ? sorted[Math.floor(middle)] : (sorted[middle - 1] + sorted[middle]) / 2;
    const minutes = Math.round((median * 7 * DAY_MINUTES) / 15) * 15;
    const day = Math.min(6, Math.floor(minutes / DAY_MINUTES));
    const clock = minutes % DAY_MINUTES;
    return `${DAY_NAMES[day]} ~${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
};

// One row per week, a dot on a Mon–Sun track where attendance first landed: the weekly rhythm at a glance
function AttendanceLanding({ weeks }) {
    const rows = weeks.filter(w => w.first_attendance_change_at).slice(0, MAX_WEEKS);
    if (rows.length === 0) return <p className="adm-state">No attendance updates recorded yet.</p>;
    const positions = rows.map(weekPosition);

    return (
        <figure className="adm-landing">
            <p className="adm-landing-summary">
                Usually lands <strong>{typicalLanding(positions)}</strong>
                <span className="adm-dim"> · median of {rows.length} week{rows.length === 1 ? '' : 's'}, IST</span>
            </p>
            <div className="adm-landing-grid">
                <span aria-hidden="true" />
                <div className="adm-landing-days" aria-hidden="true">
                    {DAY_NAMES.map(name => <span key={name}>{name.charAt(0)}</span>)}
                </div>
                {rows.map((week, index) => {
                    const left = Math.max(0, Math.min(100, positions[index] * 100));
                    const edge = left < 30 ? 'is-start' : left > 70 ? 'is-end' : '';
                    return (
                        <React.Fragment key={week.week_start}>
                            <span className="adm-landing-week">{formatDay(week.week_start)}</span>
                            <div className="adm-landing-track">
                                <span
                                    className={`adm-landing-dot ${index === 0 ? 'is-latest' : ''} ${edge}`}
                                    style={{ left: `${left}%` }}
                                    tabIndex={0}
                                    aria-label={`Week of ${formatDay(week.week_start)}: first update ${formatWeekday(week.first_attendance_change_at)}`}
                                >
                                    <span className="adm-tip" role="presentation">
                                        <strong>Week of {formatDay(week.week_start)}</strong>
                                        <span>First update {formatWeekday(week.first_attendance_change_at)}</span>
                                    </span>
                                </span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </figure>
    );
}

export default AttendanceLanding;
