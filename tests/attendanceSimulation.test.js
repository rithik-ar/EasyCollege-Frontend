import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    simulateCourse, updateSimulation, canSimulate, calculateAttendance, formatBunks, displayedPercent,
    EMPTY_SIMULATION, MED_BUNKS_SEARCH_LIMIT
} from '../src/utils/attendanceSimulation.js';

// Hand-derived expectations shared with the backend tests (see each case's "why").
const shared = JSON.parse(readFileSync(new URL('../../test_data/attendance_cases.json', import.meta.url), 'utf8'));

// exemption = total exemption hours used by the rules; exemptionColumn = eCampus's Exemption Hours
// column, which can be lower when medical leave is only counted in "% with Exemp Med".
const row = ({ total, present, absent, exemption, exemptionColumn = exemption }, extra = {}) => ({
    course_code: 'X',
    course_name: 'Course X',
    total_hours: total,
    present_hours: present,
    absent_hours: absent,
    exemption_hours: exemptionColumn,
    total_exemption_hours: exemption,
    physical_attendance: '0%',
    with_exemption: '0%',
    updated_till: '',
    status: 'Remaining bunks',
    count: 0,
    exemption_bunks: 0,
    ...extra
});

const deepFreeze = (obj) => {
    Object.values(obj).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); });
    return Object.freeze(obj);
};

const pick = (r) => ({
    total: r.total_hours,
    present: r.present_hours,
    absent: r.absent_hours,
    physical: r.physical_attendance,
    with_exemption: r.with_exemption,
    status: r.status,
    count: r.count,
    exemption_bunks: r.exemption_bunks
});

// ---------- Rules (shared with the backend) ----------

test('displayed percentages round up like eCampus', () => {
    for (const p of shared.displayed_percentages_from_ecampus) {
        assert.equal(displayedPercent(p.hours, p.total), p.shown, `${p.course} ${p.column}`);
    }
    assert.equal(displayedPercent(20, 27), 75); // 74.07%
    assert.equal(displayedPercent(37, 50), 74); // exactly 74%
    assert.equal(displayedPercent(15, 20), 75); // exactly 75%
});

for (const c of shared.cases) {
    test(`rules: ${c.name}`, () => {
        assert.deepEqual(calculateAttendance(c.total, c.present, c.exemption), {
            status: c.status,
            count: c.count,
            exemption_bunks: c.frontend_exemption_bunks ?? c.exemption_bunks
        }, c.why);
    });
}

for (const s of shared.simulations) {
    test(`predictor: ${s.name}`, () => {
        const base = deepFreeze(row(s.base));
        assert.deepEqual(pick(simulateCourse(base, s.sim)), s.expect, s.why);
    });
}

test('Med Bunks search limit is 70 and only caps larger results', () => {
    assert.equal(MED_BUNKS_SEARCH_LIMIT, 70);
    // 300/405 = 74.07% shows 75 -> 105 without a limit (the backend value).
    assert.equal(calculateAttendance(300, 300, 0, Infinity).exemption_bunks, 105);
    assert.equal(calculateAttendance(300, 300, 0).exemption_bunks, 70);
    // Results under 50 are the same with any limit.
    for (const c of shared.cases.filter(c => c.exemption_bunks < 50)) {
        assert.equal(calculateAttendance(c.total, c.present, c.exemption, 50).exemption_bunks, c.exemption_bunks);
    }
});

// ---------- Zero inputs and actual data ----------

test('no inputs returns the original row untouched', () => {
    const backendRow = deepFreeze(row({ total: 33, present: 25, absent: 8, exemption: 4 },
        { physical_attendance: '75%', with_exemption: '88%', count: 0, exemption_bunks: 5 }));
    for (const sim of [undefined, {}, EMPTY_SIMULATION, { attend: 0, bunk: 0 }]) {
        const r = simulateCourse(backendRow, sim);
        assert.equal(r.isSimulated, false);
        assert.deepEqual(pick(r), pick(backendRow));
    }
});

test('rounded percentages from eCampus cannot change the prediction', () => {
    const a = deepFreeze(row({ total: 33, present: 25, absent: 8, exemption: 4 }, { physical_attendance: '75%', with_exemption: '88%' }));
    const b = deepFreeze(row({ total: 33, present: 25, absent: 8, exemption: 4 }, { physical_attendance: '76%', with_exemption: '93%' }));
    for (const sim of [{ attend: 1 }, { bunk: 2 }, { exemption: 3 }, { attend: 2, bunk: 1, exemption: 1 }]) {
        assert.deepEqual(pick(simulateCourse(a, sim)), pick(simulateCourse(b, sim)));
    }
});

test('simulated exemptions never raise physical attendance or change the real exemption hours', () => {
    const base = deepFreeze(row({ total: 40, present: 32, absent: 8, exemption: 2 }));
    let previousMed = -1;
    for (let e = 1; e <= 20; e++) {
        const r = simulateCourse(base, { exemption: e });
        assert.equal(r.present_hours, 32);
        assert.equal(r.physical_attendance, `${Math.ceil(3200 / (40 + e))}`);
        assert.ok(Number(r.with_exemption) >= previousMed);
        previousMed = Number(r.with_exemption);
        assert.equal(r.exemption_hours, 2);
        assert.equal(r.total_exemption_hours, 2);
    }
});

test('medical leave outside the Exemption Hours column counts (reported 65% / 75% course)', () => {
    // Shared row 23X901: 40 total, 26 present, column 3, total 4 (1 medical hour).
    const reported = shared.rows.find(r => r.row[0] === '23X901');
    const base = deepFreeze(row({ total: 40, present: 26, absent: 14, exemption: reported.total_exemption_hours, exemptionColumn: 3 },
        { physical_attendance: '65%', with_exemption: '75%' }));
    // Attend 1: 27/41 = 65.9% shows 66; (27 + 4)/41 = 75.6% shows 76: route B still holds.
    // Bunks 0 (27/41 < 74%). Med Bunks: one bunk -> 31/42 = 73.8% shows 74 -> 0.
    // Using only the column (3) would give 30/41 = 73.2% and "Classes to attend".
    assert.deepEqual(pick(simulateCourse(base, { attend: 1 })), {
        total: 41, present: 27, absent: 14, physical: '66', with_exemption: '76',
        status: 'Remaining bunks', count: 0, exemption_bunks: 0
    });
});

test('missing or malformed exemption hours disable prediction instead of estimating', () => {
    const oldCache = { ...row({ total: 40, present: 32, absent: 8, exemption: 0 }), physical_attendance: '80%', with_exemption: '90%' };
    delete oldCache.total_exemption_hours; // cached before the backend returned it
    const cases = [oldCache, { ...oldCache, total_exemption_hours: null }, { ...oldCache, total_exemption_hours: '2' }, { ...oldCache, total_exemption_hours: -1 }];
    for (const c of cases) {
        assert.equal(canSimulate(c), false);
        const r = simulateCourse(c, { attend: 1, exemption: 2 });
        assert.equal(r.predictorUnavailable, true);
        assert.equal(r.isSimulated, false);
        assert.deepEqual(pick(r), pick(c));
    }
    assert.equal(canSimulate(row({ total: 0, present: 0, absent: 0, exemption: 0 })), true);
});

test('large inputs stay finite and within 0-100% without clamping', () => {
    for (const base of shared.simulations.map(s => s.base)) {
        for (const exemption of [1, 50, 500, 10000]) {
            const r = simulateCourse(row(base), { attend: 3, bunk: 3, exemption });
            const phys = Number(r.physical_attendance);
            const med = Number(r.with_exemption);
            assert.ok(phys >= 0 && phys <= 100);
            assert.ok(med >= phys && med <= 100);
            assert.ok(Number.isInteger(r.count) && r.count >= 0);
        }
    }
});

// ---------- Display ----------

test('zero is displayed as 0, never -0', () => {
    assert.equal(formatBunks({ status: 'Classes to attend', count: -0 }), '0');
    assert.equal(formatBunks({ status: 'Classes to attend', count: 0 }), '0');
    assert.equal(formatBunks({ status: 'Remaining bunks', count: -0 }), '0');
    assert.equal(formatBunks({ status: 'Classes to attend', count: 3 }), '-3');
    assert.equal(formatBunks({ status: 'Remaining bunks', count: 2 }), '2');
    // The case that used to produce -0 (physical 65%, exemption < 75%) now needs 4 classes.
    const r = calculateAttendance(20, 13, 1);
    assert.equal(formatBunks(r), '-4');
});

// ---------- Per-subject state ----------

test('state starts at zero, cannot go below zero and is independent per course', () => {
    let s = {};
    s = updateSimulation(s, 'A', 'exemption', -1);
    assert.deepEqual(s.A, { attend: 0, bunk: 0, exemption: 0 });

    s = updateSimulation(s, 'A', 'exemption', 1);
    s = updateSimulation(s, 'A', 'exemption', 1);
    s = updateSimulation(s, 'B', 'exemption', 1);
    s = updateSimulation(s, 'B', 'attend', 1);
    assert.deepEqual(s.A, { attend: 0, bunk: 0, exemption: 2 });
    assert.deepEqual(s.B, { attend: 1, bunk: 0, exemption: 1 });
    assert.equal(s.C, undefined);
});

test('updates do not mutate previous state', () => {
    const prev = deepFreeze({ A: { attend: 1, bunk: 0, exemption: 0 } });
    const next = updateSimulation(prev, 'A', 'exemption', 1);
    assert.notEqual(next, prev);
    assert.equal(prev.A.exemption, 0);
});

test('increasing then decreasing Exemption restores the original prediction', () => {
    const base = deepFreeze(row({ total: 100, present: 68, absent: 32, exemption: 4 }));
    let s = {};
    s = updateSimulation(s, 'X', 'attend', 2);
    s = updateSimulation(s, 'X', 'bunk', 1);
    const before = simulateCourse(base, s.X);
    for (let i = 0; i < 4; i++) s = updateSimulation(s, 'X', 'exemption', 1);
    assert.notDeepEqual(pick(simulateCourse(base, s.X)), pick(before));
    for (let i = 0; i < 4; i++) s = updateSimulation(s, 'X', 'exemption', -1);
    assert.deepEqual(simulateCourse(base, s.X), before);

    s = updateSimulation(s, 'X', 'attend', -2);
    s = updateSimulation(s, 'X', 'bunk', -1);
    assert.equal(simulateCourse(base, s.X).isSimulated, false);
});

test('the page uses these functions and does not persist or send simulation state', () => {
    const src = readFileSync(new URL('../src/pages/Attendance.jsx', import.meta.url), 'utf8');
    assert.match(src, /from '\.\.\/utils\/attendanceSimulation'/);
    assert.match(src, /JSON\.stringify\(\{ auth_token: authToken, force_refresh: forceRefresh \}\)/);
    assert.equal((src.match(/JSON\.stringify/g) || []).length, 1);
    assert.doesNotMatch(src, /(localStorage|sessionStorage)\.setItem/);
    assert.match(src, /formatBunks\(course\)/);
});
