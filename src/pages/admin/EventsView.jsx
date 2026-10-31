import React, { useState } from 'react';
import { X } from 'lucide-react';
import useAdminFetch from './useAdminFetch';
import { CountUp, Panel, PanelState, RefreshButton, Segmented, Skeleton, Timeline } from './AdminParts';
import AttendanceLanding from './AttendanceLanding';
import {
    ACTIVITY_REASONS, FAILURE_REASONS, formatAgo, formatDay, formatDayTime, formatNumber, formatWeekday,
    reasonLabel, sourceLabel
} from './format';

const WINDOWS = [['24', '24h'], ['168', '7 days'], ['720', '30 days']];
const ACTIVITY_SERIES = [{ key: 'all', label: 'Events', color: 'var(--adm-s1)' }];

// Failures and Activity share this view; `kind` picks the event kind and what is summarised
function EventsView({ kind, token, onExpired, onOpenStudent }) {
    const isFailures = kind === 'failure';
    const [hours, setHours] = useState('24');
    const [department, setDepartment] = useState('');
    const [draft, setDraft] = useState('');

    const params = new URLSearchParams({ kind, hours, limit: '100' });
    if (department) params.set('department', department);
    const events = useAdminFetch(`/api/admin/events?${params}`, token, onExpired);
    const weekly = useAdminFetch('/api/admin/events/weekly', token, onExpired);
    const data = events.data;

    const applyDepartment = (value) => {
        const code = value.trim().toUpperCase();
        setDepartment(code);
        setDraft(code);
    };

    const countFor = (source, reason) => (data?.counts || [])
        .filter(c => (source === null || c.source === source) && c.reason === reason)
        .reduce((sum, c) => sum + c.count, 0);
    const sources = [...new Set((data?.counts || []).map(c => c.source))];
    const reasons = isFailures ? FAILURE_REASONS : ACTIVITY_REASONS;
    const matrixMax = Math.max(1, ...(data?.counts || []).map(c => c.count));

    return (
        <div className="adm-stack">
            <div className="adm-toolbar">
                <div className="adm-controls">
                    <Segmented label="Time window" options={WINDOWS} value={hours} onChange={setHours} />
                    <form
                        className="adm-field adm-field-inline"
                        onSubmit={e => { e.preventDefault(); applyDepartment(draft); }}
                    >
                        <label htmlFor={`adm-dept-${kind}`}>Dept</label>
                        <input
                            id={`adm-dept-${kind}`}
                            value={draft}
                            onChange={e => setDraft(e.target.value.toUpperCase())}
                            onBlur={() => applyDepartment(draft)}
                            placeholder="All"
                            autoComplete="off"
                            spellCheck="false"
                        />
                        {department && (
                            <button type="button" className="adm-icon-btn" onClick={() => applyDepartment('')} aria-label="Clear department filter">
                                <X size={14} aria-hidden="true" />
                            </button>
                        )}
                    </form>
                </div>
                <RefreshButton onClick={() => { events.reload(); weekly.reload(); }} isLoading={events.isLoading || weekly.isLoading} />
            </div>

            <PanelState
                isLoading={events.isLoading}
                error={events.error}
                hasData={!!data}
                isEmpty={data?.total === 0}
                empty={isFailures ? 'No failures in this window. Quiet is good.' : 'No activity in this window.'}
                onRetry={events.reload}
                skeleton={(
                    <>
                        <Skeleton kind="kpis" count={reasons.length} />
                        <Skeleton kind="chart" />
                        <Skeleton count={6} rowHeight={38} />
                    </>
                )}
            />

            {data && data.total > 0 && (
                <>
                    <dl className="adm-kpis adm-kpis-wide adm-reveal">
                        {reasons.map(r => (
                            <div key={r.key}>
                                <dt>{r.color && <span className="adm-swatch" style={{ background: r.color }} aria-hidden="true" />}{r.label}</dt>
                                <dd><CountUp value={countFor(null, r.key)} /></dd>
                            </div>
                        ))}
                    </dl>

                    <Panel title={isFailures ? 'Failures over time' : 'Activity over time'} meta={data.bucket_hours >= 24 ? 'per day' : 'per hour'}>
                        <Timeline
                            buckets={data.timeline}
                            bucketHours={data.bucket_hours}
                            series={isFailures ? FAILURE_REASONS : ACTIVITY_SERIES}
                            label={isFailures ? 'Failures over time by reason' : 'Activity events over time'}
                        />
                    </Panel>

                    {isFailures && (
                        <Panel title="Where" meta="page × reason">
                            <div className="adm-scroll">
                                <table className="adm-table adm-matrix">
                                    <thead>
                                        <tr>
                                            <th scope="col">Page</th>
                                            {FAILURE_REASONS.map(r => (
                                                <th key={r.key} scope="col"><span className="adm-swatch" style={{ background: r.color }} aria-hidden="true" />{r.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sources.map(source => (
                                            <tr key={source}>
                                                <th scope="row">{sourceLabel(source)}</th>
                                                {FAILURE_REASONS.map(r => {
                                                    const count = countFor(source, r.key);
                                                    return (
                                                        <td key={r.key} className="adm-num" style={count ? { '--heat': (0.06 + (0.3 * count) / matrixMax).toFixed(2) } : undefined}>
                                                            {count ? formatNumber(count) : <span className="adm-zero">·</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    )}

                    <Panel title="By department" meta={department ? `filtered to ${department}` : 'tap to filter'}>
                        <div className="adm-chips">
                            {data.by_department.map(group => (
                                <button
                                    key={group.key}
                                    type="button"
                                    className={`adm-chip ${department === group.key ? 'is-active' : ''}`}
                                    aria-pressed={department === group.key}
                                    onClick={() => applyDepartment(department === group.key ? '' : group.key)}
                                >
                                    {group.key}<span>{formatNumber(group.count)}</span>
                                </button>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Log" meta={`latest ${data.events.length} of ${formatNumber(data.total)}${data.truncated ? '+' : ''}`}>
                        <ol className="adm-log adm-log-full">
                            {data.events.map(event => {
                                const reason = FAILURE_REASONS.find(r => r.key === event.reason);
                                return (
                                    <li key={event.id}>
                                        <time className="adm-log-time" dateTime={event.created_at} title={formatDayTime(event.created_at)}>
                                            {formatAgo(event.created_at)}
                                        </time>
                                        <span className="adm-log-what">
                                            {reason && <span className="adm-swatch" style={{ background: reason.color }} aria-hidden="true" />}
                                            {reasonLabel(event.reason)}
                                        </span>
                                        {isFailures && <span className="adm-log-source">{sourceLabel(event.source)}</span>}
                                        {event.roll_number
                                            ? <button type="button" className="adm-roll" onClick={() => onOpenStudent(event.roll_number)}>{event.roll_number}</button>
                                            : <span className="adm-dim">no roll</span>}
                                        {event.detail && <span className="adm-log-detail">{event.detail}</span>}
                                        {event.backend && (
                                            <span className="adm-log-backend adm-hide-sm">{event.backend}{event.commit ? `@${event.commit}` : ''}</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </Panel>
                </>
            )}

            {!isFailures && weekly.data?.weeks.length > 0 && (
                <Panel title="When attendance lands" meta="first update each week, last 12 weeks">
                    <AttendanceLanding weeks={weekly.data.weeks} />
                </Panel>
            )}

            <Panel title="Semester" meta="by week, Mon–Sun IST">
                <PanelState
                    isLoading={weekly.isLoading}
                    error={weekly.error}
                    hasData={!!weekly.data}
                    isEmpty={weekly.data?.weeks.length === 0}
                    empty="No weeks recorded yet."
                    onRetry={weekly.reload}
                    skeleton={<Skeleton count={6} rowHeight={38} />}
                />
                {weekly.data?.weeks.length > 0 && (
                    <div className="adm-scroll">
                        <table className="adm-table">
                            <thead>
                                {isFailures ? (
                                    <tr>
                                        <th scope="col">Week of</th>
                                        {FAILURE_REASONS.map(r => <th key={r.key} scope="col">{r.label}</th>)}
                                    </tr>
                                ) : (
                                    <tr>
                                        <th scope="col">Week of</th>
                                        <th scope="col">Attendance updates</th>
                                        <th scope="col">First posted</th>
                                        <th scope="col">New users</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {weekly.data.weeks.map(week => (
                                    <tr key={week.week_start}>
                                        <th scope="row" className="adm-nowrap">{formatDay(week.week_start)}</th>
                                        {isFailures
                                            ? FAILURE_REASONS.map(r => (
                                                <td key={r.key} className="adm-num">{week.failures[r.key] ? formatNumber(week.failures[r.key]) : <span className="adm-zero">·</span>}</td>
                                            ))
                                            : (
                                                <>
                                                    <td className="adm-num">{formatNumber(week.activity.attendance_changed || 0)}</td>
                                                    <td className="adm-num">{formatWeekday(week.first_attendance_change_at)}</td>
                                                    <td className="adm-num">{formatNumber(week.activity.first_login || 0)}</td>
                                                </>
                                            )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!isFailures && (
                    <p className="adm-footnote">Attendance updates are only seen for Fast Mode users, who have a cached copy to compare against.</p>
                )}
            </Panel>
        </div>
    );
}

export default EventsView;
