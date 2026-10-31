import React, { useState } from 'react';
import useAdminFetch from './useAdminFetch';
import { PanelState, RefreshButton, Segmented, Skeleton } from './AdminParts';
import { FEEDBACK_TYPES, formatAgo, formatDayTime } from './format';

const FILTERS = [['', 'All'], ['Bug Report', 'Bugs'], ['Feature Request', 'Features'], ['General Feedback', 'General']];

function FeedbackInbox({ token, onExpired, onOpenStudent }) {
    const [type, setType] = useState('');
    const [limit, setLimit] = useState(50);

    const params = new URLSearchParams({ limit: String(limit) });
    if (type) params.set('type', type);
    const feedback = useAdminFetch(`/api/admin/feedback?${params}`, token, onExpired);
    const items = feedback.data?.feedback || [];

    return (
        <div className="adm-stack">
            <div className="adm-toolbar">
                <Segmented label="Feedback type" options={FILTERS} value={type} onChange={value => { setType(value); setLimit(50); }} />
                <RefreshButton onClick={feedback.reload} isLoading={feedback.isLoading} />
            </div>

            <PanelState
                isLoading={feedback.isLoading}
                error={feedback.error}
                hasData={!!feedback.data}
                isEmpty={items.length === 0}
                empty={type ? `No ${type.toLowerCase()} yet.` : 'No feedback yet.'}
                onRetry={feedback.reload}
                skeleton={<Skeleton count={4} rowHeight={100} />}
            />

            {feedback.data && (
                <ul className="adm-inbox adm-reveal">
                    {items.map(item => (
                        <li key={item.id}>
                            <div className="adm-inbox-meta">
                                <span className={`adm-tag is-${FEEDBACK_TYPES.indexOf(item.type)}`}>{item.type}</span>
                                <time dateTime={item.created_at} title={formatDayTime(item.created_at)}>{formatAgo(item.created_at)}</time>
                            </div>
                            <p className="adm-inbox-message">{item.message}</p>
                            <div className="adm-inbox-from">
                                <button type="button" className="adm-roll" onClick={() => onOpenStudent(item.roll_number)}>{item.roll_number}</button>
                                <span className="adm-dim">{item.name}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {items.length === limit && limit < 200 && (
                <button type="button" className="adm-btn adm-btn-quiet adm-center" onClick={() => setLimit(200)} disabled={feedback.isLoading}>
                    Load older (up to 200)
                </button>
            )}
        </div>
    );
}

export default FeedbackInbox;
