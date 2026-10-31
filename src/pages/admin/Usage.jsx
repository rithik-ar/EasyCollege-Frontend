import React, { useState } from 'react';
import useAdminFetch from './useAdminFetch';
import { BarList, CountUp, Panel, PanelState, RefreshButton, Skeleton } from './AdminParts';
import { formatDayTime, percent } from './format';

const BATCH_YEARS_SHOWN = 5;

const toRow = (g) => ({ key: g.key, whole: g.users, part: g.active_30d });

// The newest five batch years get their own row; older batches fold into "Earlier".
// "Unknown" (roll numbers that don't parse) is left off both lists.
const batchRows = (groups, oldestShown) => {
    const earlier = { key: 'Earlier', whole: 0, part: 0 };
    const rows = [];
    groups.forEach(g => {
        if (/^\d+$/.test(g.key) && Number(g.key) < oldestShown) {
            earlier.whole += g.users;
            earlier.part += g.active_30d;
        } else if (g.key !== 'Unknown') {
            rows.push(toRow(g));
        }
    });
    if (earlier.whole) rows.push(earlier);
    return rows;
};

function Usage({ token, onExpired }) {
    const stats = useAdminFetch('/api/admin/stats', token, onExpired);
    const [showAllDepartments, setShowAllDepartments] = useState(false);
    const s = stats.data;
    const oldestShown = s ? new Date(s.generated_at).getFullYear() - (BATCH_YEARS_SHOWN - 1) : 0;

    return (
        <div className="adm-stack">
            <div className="adm-toolbar">
                <p className="adm-dim">{s ? `As of ${formatDayTime(s.generated_at)} · from login records` : 'From login records'}</p>
                <RefreshButton onClick={stats.reload} isLoading={stats.isLoading} />
            </div>

            <PanelState
                isLoading={stats.isLoading}
                error={stats.error}
                hasData={!!s}
                onRetry={stats.reload}
                skeleton={(
                    <>
                        <Skeleton kind="kpis" count={6} />
                        <div className="adm-split">
                            <Skeleton count={5} rowHeight={32} />
                            <Skeleton count={8} rowHeight={32} />
                        </div>
                    </>
                )}
            />

            {s && (
                <>
                    <dl className="adm-kpis adm-kpis-wide adm-reveal">
                        <div><dt>Users</dt><dd><CountUp value={s.total_users} /></dd></div>
                        <div><dt>Active 7d</dt><dd><CountUp value={s.active_7d} /></dd></div>
                        <div><dt>Active 30d</dt><dd><CountUp value={s.active_30d} /></dd></div>
                        <div><dt>New 7d</dt><dd><CountUp value={s.new_7d} /></dd></div>
                        <div><dt>New 30d</dt><dd><CountUp value={s.new_30d} /></dd></div>
                        <div>
                            <dt>Fast Mode</dt>
                            <dd><CountUp value={s.fast_mode_users} /><small> {percent(s.fast_mode_users, s.total_users)}%</small></dd>
                        </div>
                    </dl>

                    <div className="adm-split">
                        <Panel title="By batch" meta="year joined · users · active 30d">
                            <BarList rows={batchRows(s.by_batch, oldestShown)} partLabel="Active 30d" wholeLabel="Users" />
                            {s.by_batch.some(g => /^\d+$/.test(g.key) && Number(g.key) < oldestShown) && (
                                <p className="adm-footnote">Earlier: joined before {oldestShown}.</p>
                            )}
                        </Panel>
                        <Panel title="By department" meta="users · active 30d">
                            <BarList
                                rows={s.by_department.filter(g => g.key !== 'Unknown').map(toRow)}
                                partLabel="Active 30d"
                                wholeLabel="Users"
                                limit={10}
                                isExpanded={showAllDepartments}
                                onToggle={() => setShowAllDepartments(v => !v)}
                            />
                        </Panel>
                    </div>
                </>
            )}
        </div>
    );
}

export default Usage;
