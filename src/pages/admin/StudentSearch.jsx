import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, CornerDownLeft } from 'lucide-react';
import { API_URL } from './useAdminFetch';
import { Meter, Panel, PanelState, Segmented, Skeleton } from './AdminParts';
import SemesterTrend from './SemesterTrend';
import { formatAgo, formatDayTime, formatNumber } from './format';

const DATASETS = {
    attendance: '/api/attendance',
    internals: '/api/internals',
    gpa: '/api/gpa',
    cgpa: '/api/cgpa'
};
const IDLE = { data: null, error: '', isLoading: false };
const EMPTY = { attendance: IDLE, internals: IDLE, gpa: IDLE, cgpa: IDLE };
const TABS = [['attendance', 'Attendance'], ['internals', 'Internals'], ['results', 'Results']];
const meterTone = (percent) => (percent >= 75 ? 'good' : percent >= 65 ? 'warning' : 'critical');

function StudentSearch({ token, onExpired, requestedRoll, inputRef, recent, onRemember }) {
    const [roll, setRoll] = useState('');
    const [student, setStudent] = useState(null);
    const [isLooking, setIsLooking] = useState(false);
    const [error, setError] = useState('');
    const [datasets, setDatasets] = useState(EMPTY);
    const [tab, setTab] = useState('attendance');
    const lookupId = useRef(0);

    const loadDataset = useCallback(async (name, studentToken, id) => {
        setDatasets(prev => ({ ...prev, [name]: { ...prev[name], isLoading: true, error: '' } }));
        let next;
        try {
            const response = await fetch(`${API_URL}${DATASETS[name]}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: studentToken })
            });
            const body = await response.json();
            next = response.ok ? { data: body, error: '', isLoading: false } : { data: null, error: body.error || 'eCampus did not return this page', isLoading: false };
            if (response.status === 401) next.rejected = true;
        } catch {
            next = { data: null, error: 'Could not reach the backend', isLoading: false };
        }
        if (id === lookupId.current) setDatasets(prev => ({ ...prev, [name]: next }));
        return next;
    }, []);

    const lookup = useCallback(async (value) => {
        const normalized = value.trim().toUpperCase();
        if (!normalized) return;
        const id = ++lookupId.current;
        setIsLooking(true);
        setError('');
        setStudent(null);
        setDatasets(EMPTY);
        try {
            const response = await fetch(`${API_URL}/api/admin/student-info/${encodeURIComponent(normalized)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) return onExpired();
            const body = await response.json();
            if (id !== lookupId.current) return;
            if (!response.ok || !body.success) {
                setError(body.error || 'Student not found');
                return;
            }
            setStudent(body.student);
            onRemember({ roll: normalized, name: body.student.name || '' });
            // GPA first (a single eCampus login). If eCampus rejects the student's saved password, stop there:
            // loading everything at once would be several failed logins towards eCampus's 5-a-day lock.
            const first = await loadDataset('gpa', body.student_auth_token, id);
            if (id !== lookupId.current) return;
            if (first.rejected) {
                const message = 'eCampus rejected this student\'s saved password. They need to sign in to EasyCollege again.';
                setDatasets(prev => Object.fromEntries(Object.keys(prev).map(key => [key, { ...IDLE, error: message }])));
                return;
            }
            ['attendance', 'internals', 'cgpa'].forEach(name => loadDataset(name, body.student_auth_token, id));
        } catch {
            if (id === lookupId.current) setError('Could not reach the backend');
        } finally {
            if (id === lookupId.current) setIsLooking(false);
        }
    }, [token, onExpired, onRemember, loadDataset]);

    useEffect(() => {
        if (requestedRoll?.roll) {
            setRoll(requestedRoll.roll);
            lookup(requestedRoll.roll);
        }
    }, [requestedRoll, lookup]);

    const { attendance, internals, gpa, cgpa } = datasets;

    return (
        <div className="adm-stack">
            <form className="adm-lookup" onSubmit={e => { e.preventDefault(); lookup(roll); }}>
                <label htmlFor="adm-roll" className="adm-kicker">Roll number</label>
                <div className="adm-lookup-row">
                    <input
                        id="adm-roll"
                        ref={inputRef}
                        value={roll}
                        onChange={e => setRoll(e.target.value.toUpperCase())}
                        placeholder="23Z301"
                        autoComplete="off"
                        spellCheck="false"
                        autoCapitalize="characters"
                    />
                    <button type="submit" className="adm-btn adm-btn-primary" disabled={isLooking || !roll.trim()}>
                        {isLooking ? 'Looking up' : 'Look up'} <CornerDownLeft size={14} aria-hidden="true" />
                    </button>
                </div>
                {recent.length > 0 && (
                    <div className="adm-recent">
                        <span className="adm-dim">Recent</span>
                        {recent.map(r => (
                            <button key={r.roll} type="button" className="adm-roll" title={r.name || undefined} onClick={() => { setRoll(r.roll); lookup(r.roll); }}>{r.roll}</button>
                        ))}
                    </div>
                )}
                <p className="adm-footnote">Only students who have signed in to EasyCollege can be found. Their pages are scraped live from eCampus, which can take a while.</p>
            </form>

            {error && <p className="adm-state adm-state-error" role="alert"><CircleAlert size={14} aria-hidden="true" /> {error}</p>}

            {student && (
                <>
                    <section className="adm-student" aria-label="Student">
                        <div>
                            <h2 className="adm-student-name">{student.name || 'Unknown name'}</h2>
                            <p className="adm-mono adm-dim">
                                {student.roll_number} · {student.department_code || '--'} · batch {student.batch_year || '--'}
                            </p>
                        </div>
                        <dl className="adm-kpis">
                            <div><dt>Logins</dt><dd>{formatNumber(student.login_count)}</dd></div>
                            <div><dt>Last login</dt><dd title={formatDayTime(student.last_login)}>{formatAgo(student.last_login)}</dd></div>
                            <div><dt>CGPA</dt><dd>{cgpa.data?.cgpa ?? (cgpa.isLoading ? '…' : '--')}</dd></div>
                        </dl>
                    </section>

                    <Segmented label="Student data" options={TABS} value={tab} onChange={setTab} />

                    {tab === 'attendance' && (
                        <Panel title="Attendance" meta={attendance.data?.[0]?.updated_till ? `updated till ${attendance.data[0].updated_till}` : undefined}>
                            <PanelState
                                isLoading={attendance.isLoading}
                                error={attendance.error}
                                hasData={!!attendance.data}
                                isEmpty={attendance.data?.length === 0}
                                empty="No courses on eCampus yet."
                                skeleton={<Skeleton count={5} rowHeight={56} />}
                            />
                            {attendance.isLoading && <p className="adm-footnote">Signing in to eCampus as {student.roll_number}…</p>}
                            {Array.isArray(attendance.data) && attendance.data.length > 0 && (
                                <div className="adm-scroll">
                                    <table className="adm-table adm-att">
                                        <thead>
                                            <tr>
                                                <th scope="col">Course</th>
                                                <th scope="col">Physical</th>
                                                <th scope="col" className="adm-hide-sm">With exemption</th>
                                                <th scope="col">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendance.data.map(course => {
                                                const physical = parseInt(course.physical_attendance, 10);
                                                const canSkip = course.status === 'Remaining bunks';
                                                return (
                                                    <tr key={course.course_code}>
                                                        <th scope="row">
                                                            <span className="adm-mono">{course.course_code}</span>
                                                            <span className="adm-course">{course.course_name}</span>
                                                        </th>
                                                        <td>
                                                            <span className="adm-num">{course.physical_attendance}</span>
                                                            <Meter value={physical} tone={meterTone(physical)} />
                                                        </td>
                                                        <td className="adm-num adm-hide-sm">{course.with_exemption}</td>
                                                        <td>
                                                            <span className={`adm-status is-${canSkip ? 'good' : 'critical'}`}>
                                                                {canSkip ? <CircleCheck size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}
                                                                {canSkip ? `Can skip ${course.count}` : `Attend ${course.count}`}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>
                    )}

                    {tab === 'internals' && (
                        <Panel title="Internals" meta="CA marks, old eCampus site">
                            <PanelState
                                isLoading={internals.isLoading}
                                error={internals.error}
                                hasData={!!internals.data}
                                isEmpty={internals.data?.length === 0}
                                empty="No CA marks yet."
                                skeleton={<Skeleton count={3} rowHeight={56} />}
                            />
                            {Array.isArray(internals.data) && internals.data.length > 0 && (
                                <div className="adm-scroll">
                                    <table className="adm-table">
                                        <thead>
                                            <tr>
                                                <th scope="col">Course</th>
                                                <th scope="col">Total</th>
                                                <th scope="col">Converted</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {internals.data.map(course => (
                                                <tr key={`${course.table_id}-${course.course_code}`}>
                                                    <th scope="row">
                                                        <span className="adm-mono">{course.course_code}</span>
                                                        <span className="adm-course">{course.course_name}</span>
                                                    </th>
                                                    <td className="adm-num">
                                                        {course.total || '--'}<span className="adm-dim"> / {course.total_max ?? '--'}</span>
                                                    </td>
                                                    <td className="adm-num">
                                                        {course.total_converted ?? '--'}<span className="adm-dim"> / {course.target_max ?? '--'}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>
                    )}

                    {tab === 'results' && (
                        <Panel title="Results">
                            <PanelState
                                isLoading={gpa.isLoading || cgpa.isLoading}
                                error={gpa.error || cgpa.error}
                                hasData={!!(gpa.data || cgpa.data)}
                                skeleton={false}
                            />
                            <dl className="adm-kpis adm-kpis-wide">
                                <div><dt>Latest GPA</dt><dd>{gpa.data?.gpa ?? '--'}</dd></div>
                                <div><dt>CGPA</dt><dd>{cgpa.data?.cgpa ?? '--'}</dd></div>
                                <div><dt>Credits</dt><dd>{cgpa.data?.total_credits ?? '--'}</dd></div>
                            </dl>
                            {cgpa.data?.semwise_data?.length > 1 && <SemesterTrend rows={cgpa.data.semwise_data} />}
                            {cgpa.data?.semwise_data?.length > 0 && (
                                <div className="adm-scroll">
                                    <table className="adm-table">
                                        <thead>
                                            <tr><th scope="col">Semester</th><th scope="col">SGPA</th><th scope="col">CGPA</th></tr>
                                        </thead>
                                        <tbody>
                                            {cgpa.data.semwise_data.map(row => (
                                                <tr key={row.sem}>
                                                    <th scope="row">{row.sem}</th>
                                                    <td className="adm-num">{row.sgpa}</td>
                                                    <td className="adm-num">{row.cgpa}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>
                    )}
                </>
            )}
        </div>
    );
}

export default StudentSearch;
