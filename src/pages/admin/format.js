// Labels, colours and time formatting shared by the admin console sections.

// Stack order is the validated colour order (adjacent pairs pass CVD checks on the console surface)
export const FAILURE_REASONS = [
    { key: 'network', label: 'eCampus down', color: 'var(--adm-s1)' },
    { key: 'parse', label: 'Page changed', color: 'var(--adm-s2)' },
    { key: 'login', label: 'Login failed', color: 'var(--adm-s3)' },
    { key: 'exception', label: 'Our bug', color: 'var(--adm-s4)' }
];

export const ACTIVITY_REASONS = [
    { key: 'attendance_changed', label: 'Attendance updated' },
    { key: 'first_login', label: 'New user' },
    { key: 'fast_mode_on', label: 'Fast Mode on' },
    { key: 'fast_mode_off', label: 'Fast Mode off' },
    { key: 'feedback_submitted', label: 'Feedback' }
];

export const SOURCE_LABELS = {
    login: 'Login',
    attendance: 'Attendance',
    gpa: 'GPA',
    cgpa: 'CGPA',
    internals: 'Internals',
    timetable: 'Timetable',
    course_names: 'Course names',
    app: 'App'
};

// Critically damped (no overshoot): indicators follow the click, they weren't thrown
export const ADMIN_SPRING = { type: 'spring', bounce: 0, duration: 0.35 };

export const FEEDBACK_TYPES = ['Bug Report', 'Feature Request', 'General Feedback'];

export const reasonLabel = (key) => (
    (FAILURE_REASONS.find(r => r.key === key) || ACTIVITY_REASONS.find(r => r.key === key) || { label: key }).label
);

export const sourceLabel = (key) => SOURCE_LABELS[key] || key;

export const formatNumber = (value) => (typeof value === 'number' ? value.toLocaleString('en-IN') : '--');

export const percent = (part, whole) => (whole ? Math.round((100 * part) / whole) : 0);

// Admins are in India: show every time in IST, whatever the device's zone
const IST = 'Asia/Kolkata';

export const formatClock = (iso) => (iso
    ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST })
    : '--');

export const formatDay = (iso) => (iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST })
    : '--');

export const formatDayTime = (iso) => (iso ? `${formatDay(iso)}, ${formatClock(iso)}` : '--');

export const formatWeekday = (iso) => (iso
    ? `${new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', timeZone: IST })} ${formatClock(iso)}`
    : '--');

export const formatAgo = (iso, now = Date.now()) => {
    if (!iso) return '--';
    const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

// A Fernet token is base64url(version | 8-byte big-endian issue time | ...); the time is readable without the key
export const tokenIssuedAt = (token) => {
    try {
        // Only the first 12 characters are needed (9 bytes); decoding just those avoids padding issues
        const raw = atob(token.slice(0, 12).replace(/-/g, '+').replace(/_/g, '/'));
        let seconds = 0;
        for (let i = 1; i <= 8; i++) seconds = seconds * 256 + raw.charCodeAt(i);
        return seconds * 1000;
    } catch {
        return null;
    }
};
