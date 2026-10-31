import React from 'react';
import { ArrowRight, OctagonAlert } from 'lucide-react';
import useAdminFetch from './useAdminFetch';
import { CountUp, Panel, PanelState, RefreshButton, Skel, Skeleton, Timeline } from './AdminParts';
import {
    FAILURE_REASONS, formatAgo, formatClock, formatNumber, formatWeekday, percent, reasonLabel, sourceLabel
} from './format';

function Overview({ token, onExpired, onNavigate, onOpenStudent }) {
    const stats = useAdminFetch('/api/admin/stats', token, onExpired);
    const failures = useAdminFetch('/api/admin/events?kind=failure&hours=24&limit=6', token, onExpired);
    const activity = useAdminFetch('/api/admin/events?kind=activity&hours=168&limit=6', token, onExpired);
    const feedback = useAdminFetch('/api/admin/feedback?limit=3', token, onExpired);
    const weekly = useAdminFetch('/api/admin/events/weekly?weeks=2', token, onExpired);

    const isLoading = [stats, failures, activity, feedback, weekly].some(r => r.isLoading);
    const reloadAll = () => [stats, failures, activity, feedback, weekly].forEach(r => r.reload());

    const s = stats.data;
    const pageChanged = (failures.data?.counts || []).filter(c => c.reason === 'parse');
    const lastUpdate = (weekly.data?.weeks || []).find(w => w.first_attendance_change_at);

    return (
        <div className="adm-stack">
            {/* The alarm lives in the toolbar row (fixed height), so its arrival never pushes the page down */}
            <div className="adm-toolbar adm-toolbar-fixed">
                {pageChanged.length > 0 ? (
                    <button type="button" className="adm-alarm" onClick={() => onNavigate('failures')}>
                        <OctagonAlert size={16} aria-hidden="true" />
                        <span className="adm-alarm-text">
                            <strong>Page changed</strong>{' · '}
                            {pageChanged.map(c => `${sourceLabel(c.source)} ×${c.count}`).join(', ')} in 24h, a scraper may need fixing
                        </span>
                        <ArrowRight size={16} aria-hidden="true" />
                    </button>
                ) : <span />}
                <div className="adm-toolbar-end">
                    <p className="adm-dim adm-mono adm-hide-sm" aria-live="polite">{s ? `Updated ${formatClock(s.generated_at)} IST` : ''}</p>
                    <RefreshButton onClick={reloadAll} isLoading={isLoading} />
                </div>
            </div>

            <section className="adm-hero" aria-label="Users">
                <div className="adm-hero-main">
                    <span className="adm-kicker">Active this week</span>
                    <span className="adm-hero-value">{s ? <CountUp value={s.active_7d} /> : <Skel width="2.2ch" />}</span>
                    <span className="adm-dim">
                        {s ? `${percent(s.active_7d, s.total_users)}% of ${formatNumber(s.total_users)} users · ${formatNumber(s.new_7d)} new` : <Skel width="22ch" />}
                    </span>
                </div>
                <dl className="adm-kpis">
                    <div><dt>Active 30d</dt><dd>{s ? <CountUp value={s.active_30d} /> : <Skel />}</dd></div>
                    <div><dt>Fast Mode</dt><dd>{s ? <CountUp value={percent(s.fast_mode_users, s.total_users)} format={(n) => `${n}%`} /> : <Skel />}</dd></div>
                    <div><dt>Failures 24h</dt><dd>{failures.data ? <CountUp value={failures.data.total} /> : <Skel />}</dd></div>
                    <div>
                        <dt>Attendance posted</dt>
                        <dd>{!weekly.data ? <Skel width="5ch" /> : lastUpdate ? formatWeekday(lastUpdate.first_attendance_change_at) : '--'}</dd>
                    </div>
                </dl>
            </section>
            <PanelState isLoading={stats.isLoading} error={stats.error} hasData={!!s} onRetry={stats.reload} skeleton={false} />

            <Panel
                title="Failures"
                meta="last 24 hours"
                actions={<button type="button" className="adm-link" onClick={() => onNavigate('failures')}>Open <ArrowRight size={14} aria-hidden="true" /></button>}
            >
                <PanelState
                    isLoading={failures.isLoading}
                    error={failures.error}
                    hasData={!!failures.data}
                    isEmpty={failures.data?.total === 0}
                    empty="No failures in the last 24 hours."
                    onRetry={failures.reload}
                    skeleton={<Skeleton kind="chart" />}
                />
                {/* Drawn even when empty (a flat baseline), so the panel keeps its height */}
                {failures.data && (
                    <Timeline
                        buckets={failures.data.timeline}
                        bucketHours={failures.data.bucket_hours}
                        series={FAILURE_REASONS}
                        label="Failures per hour, last 24 hours"
                    />
                )}
            </Panel>

            <div className="adm-split">
                <Panel
                    title="Latest feedback"
                    actions={<button type="button" className="adm-link" onClick={() => onNavigate('feedback')}>Inbox <ArrowRight size={14} aria-hidden="true" /></button>}
                >
                    <PanelState
                        isLoading={feedback.isLoading}
                        error={feedback.error}
                        hasData={!!feedback.data}
                        isEmpty={feedback.data?.feedback.length === 0}
                        empty="No feedback yet."
                        onRetry={feedback.reload}
                        skeleton={<Skeleton count={3} rowHeight={72} />}
                    />
                    {feedback.data && (
                        <ul className="adm-notes adm-reveal">
                            {feedback.data.feedback.map(item => (
                                <li key={item.id}>
                                    <div className="adm-note-meta">
                                        <span className="adm-tag">{item.type}</span>
                                        <button type="button" className="adm-roll" onClick={() => onOpenStudent(item.roll_number)}>{item.roll_number}</button>
                                        <span className="adm-dim">{formatAgo(item.created_at)}</span>
                                    </div>
                                    <p className="adm-clamp">{item.message}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel
                    title="Activity"
                    meta="last 7 days"
                    actions={<button type="button" className="adm-link" onClick={() => onNavigate('activity')}>Open <ArrowRight size={14} aria-hidden="true" /></button>}
                >
                    <PanelState
                        isLoading={activity.isLoading}
                        error={activity.error}
                        hasData={!!activity.data}
                        isEmpty={activity.data?.total === 0}
                        empty="No activity in the last 7 days."
                        onRetry={activity.reload}
                        skeleton={<Skeleton count={6} rowHeight={38} />}
                    />
                    {activity.data && (
                        <ol className="adm-log adm-reveal">
                            {activity.data.events.map(event => (
                                <li key={event.id}>
                                    <span className="adm-log-time">{formatAgo(event.created_at)}</span>
                                    <span className="adm-log-what">{reasonLabel(event.reason)}</span>
                                    {event.roll_number
                                        ? <button type="button" className="adm-roll" onClick={() => onOpenStudent(event.roll_number)}>{event.roll_number}</button>
                                        : <span className="adm-dim">--</span>}
                                    {event.detail && <span className="adm-log-detail">{event.detail}</span>}
                                </li>
                            ))}
                        </ol>
                    )}
                </Panel>
            </div>
        </div>
    );
}

export default Overview;
