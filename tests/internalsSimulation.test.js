import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    SIMULATOR_TABLE_IDS, analyzeComponents, calculateTotal, calculateNeededForNext
} from '../src/utils/internalsSimulation.js';

// Rows as /api/internals returns them (row_data = old-site eCampus cells, in order).
// Expected totals are eCampus's own numbers: old-site Totals for 25N244, new-site Totals for 24PC22 (2026-10-23).
const course = (table_id, row_data, is_lab = false) => ({
    table_id, row_data, is_lab, total: row_data[row_data.length - 1] || 'Not Updated Yet'
});
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

// ---------- Totals match eCampus ----------

test('your theory tables (8^2210, 8^2220): simulator total = eCampus Total', () => {
    const rows = [
        [course('8^2210', ['23N303', 'DATA STRUCTURES', '27.6', '*', '*', '*', '10', '*', '*', '18.80']), 18.80, 15],
        [course('8^2210', ['23N304', 'SOFTWARE ENGINEERING', '23.7', '*', '*', '*', '8', '*', '*', '15.85']), 15.85, 13],
        [course('8^2220', ['23N301', 'LINEAR ALGEBRA', '25.2', '*', '*', '3.7', '*', '6.3', '*', '*', '19.45']), 19.45, 16],
        [course('8^2220', ['23N302', 'PROBABILITY', '24', '*', '*', '4.1', '*', '8', '*', '*', '20.10']), 20.10, 16],
        [course('8^2220', ['23O305', 'ENGINEERING ECONOMICS', '26.4', '*', '*', '5', '*', '10', '*', '*', '23.20']), 23.20, 19]
    ];
    for (const [c, ecampus, converted] of rows) {
        const t = calculateTotal(analyzeComponents(c));
        close(t[50], ecampus);
        // e.g. 18.80 x 0.8 = 15.04 -> 15/40.
        assert.deepEqual([t.converted, t.max], [converted, 40], c.row_data[0]);
    }
});

test('your theory CA marks are shown out of 50 (eCampus /30 value / 0.6)', () => {
    const comps = analyzeComponents(course('8^2220', ['23N301', 'LA', '25.2', '*', '*', '3.7', '*', '6.3', '*', '*', '19.45']));
    close(comps.t1, 42);        // 25.2 / 0.6
    assert.equal(comps.t2, null); // pending
    assert.equal(comps.type, 'theory_split');
});

test('your lab (8^1600): IR + PLRO, converted x 60/50', () => {
    // 15 + 10 = 25 (the new eCampus site shows 25) -> 30/60.
    const t = calculateTotal(analyzeComponents(course('8^1600', ['23N310', 'OOP LAB', '15', '*', '10', '*', ''], true)));
    assert.deepEqual([t[50], t.converted, t.max], [25, 30, 60]);
});

test("friend's lab (8^1890): LT1 + LT2 out of 60, no conversion", () => {
    // New eCampus site Totals: 30, 30, 18 (out of 60).
    for (const [lt1, expected] of [['30', 30], ['18', 18]]) {
        const t = calculateTotal(analyzeComponents(course('8^1890', ['23XC5x', 'LAB', lt1, '*', ''], true)));
        assert.deepEqual([t[50], t.converted, t.max, t.outOf], [expected, expected, 60, 60]);
    }
});

test("friend's theory (8^2260): T1/T2 as percentages, total = eCampus new-site Total", () => {
    // Converted: 18.81 x 0.8 = 15.05 -> 15; 18.55 -> 14.84 -> 15; 19.69 -> 15.75 -> 16; 19.09 -> 15.27 -> 15; 18.56 -> 14.85 -> 15.
    const rows = [['26.62', '5.5', 18.81, 88.73, 15], ['25.5', '5.8', 18.55, 85, 15], ['27.38', '6', 19.69, 91.27, 16],
                  ['27.38', '5.4', 19.09, 91.27, 15], ['28.12', '4.5', 18.56, 93.73, 15]];
    for (const [t1, mp1, ecampus, pct, converted] of rows) {
        const comps = analyzeComponents(course('8^2260', ['23XC5x', 'T', t1, '*', '*', '*', mp1, '*', '']));
        assert.equal(comps.type, 'theory_mp');
        close(Math.round(comps.t1 * 100) / 100, pct);   // T1 / 30 x 100
        const t = calculateTotal(comps);
        close(t[50], ecampus);                           // (T1 + T2)/2 + AP + MP/T1 + MP/T2
        assert.deepEqual([t.converted, t.max], [converted, 40]);
    }
});

// ---------- CA2 target (original behaviour: only once everything is released) ----------

test('CA2 target hidden while any mark is pending, and for labs', () => {
    assert.equal(calculateNeededForNext(course('8^2220', ['23N301', 'LA', '25.2', '*', '*', '3.7', '*', '6.3', '*', '*', '19.45'])), null);
    assert.equal(calculateNeededForNext(course('8^2260', ['23XC51', 'NS', '26.62', '*', '*', '*', '5.5', '*', ''])), null);
    assert.equal(calculateNeededForNext(course('8^1600', ['L', 'LAB', '15', '14', '10', '9', '48'], true)), null);
});

test('your CA2 target (marks out of 50) actually reaches the next /40 mark', () => {
    // Fully released row: tests (26.4 + 24)/2 = 25.2, AT 5 + 4, MCQ (10 + 8)/2 = 9 -> 43.2 -> 34.56 -> 35/40.
    const c = course('8^2220', ['T', 'x', '26.4', '24', '25.2', '5', '4', '10', '8', '9', '43.2']);
    const p = calculateNeededForNext(c);
    assert.deepEqual(p, { target: 36, increaseRaw: '4.0' });
    const comps = analyzeComponents(c);
    const withCA2 = (extra) => calculateTotal({ ...comps, t2: comps.t2 + extra }).converted;
    assert.equal(withCA2(4.0), 36);   // +4 marks on CA2 (/50): 44.4 -> 35.52 -> 36
    assert.equal(withCA2(3.5), 35);   // half a mark less is not enough
});

test('following the CA2 advice always reaches the target (it rounds up, never down)', () => {
    // Total 43.3 (tests (26.4 + 24.2)/2 = 25.3, AT 9, MCQ 9) -> 34.64 -> 35/40; next mark 36 needs 44.375, i.e. +3.58 on
    // CA2 (/50). Rounding that to the nearest half mark would say 3.5, which only reaches 35; rounding up says 4.0.
    const c = course('8^2220', ['T', 'x', '26.4', '24.2', '25.3', '5', '4', '10', '8', '9', '43.3']);
    const p = calculateNeededForNext(c);
    assert.deepEqual(p, { target: 36, increaseRaw: '4.0' });
    const comps = analyzeComponents(c);
    assert.equal(calculateTotal({ ...comps, t2: comps.t2 + parseFloat(p.increaseRaw) }).converted, 36);
    assert.equal(calculateTotal({ ...comps, t2: comps.t2 + 3.5 }).converted, 35);
});

test("friend's CA2 target (percent of paper) actually reaches the next /40 mark", () => {
    // T1 26.62, T2 24, AP 6, MP 5.5 + 5 -> 41.81 -> 33.45 -> 33/40.
    const c = course('8^2260', ['23XC51', 'NS', '26.62', '24', '25.31', '6', '5.5', '5', '41.81']);
    const p = calculateNeededForNext(c);
    assert.deepEqual(p, { target: 34, increaseRaw: '1%' });
    const comps = analyzeComponents(c);
    assert.equal(calculateTotal({ ...comps, t2: comps.t2 + 1 }).converted, 34);
    assert.equal(calculateTotal(comps).converted, 33);
});

// ---------- Which tables get a simulator ----------

test('simulator only for verified layouts', () => {
    for (const id of ['8^1600', '8^2210', '8^2220', '8^1890', '8^2260']) assert.ok(SIMULATOR_TABLE_IDS.includes(id), id);
    for (const id of ['8^1740', '8^2080', '8^9999', null]) assert.ok(!SIMULATOR_TABLE_IDS.includes(id), String(id));
    // Unknown layouts don't crash; they just have no component mapping.
    assert.equal(analyzeComponents(course('8^9999', ['X', 'NEW', '12', '*', ''])).type, undefined);
});

test('the Internals page uses these functions and gates the simulator by table id', () => {
    const src = readFileSync(new URL('../src/pages/Internals.jsx', import.meta.url), 'utf8');
    assert.match(src, /from '\.\.\/utils\/internalsSimulation'/);
    assert.match(src, /const hasSimulator = SIMULATOR_TABLE_IDS\.includes\(course\.table_id\);/);
    assert.match(src, /const prediction = hasSimulator \? calculateNeededForNext\(course\) : null;/);
});

test('the Total column header is just "Total" (each cell shows its own maximum)', () => {
    const src = readFileSync(new URL('../src/pages/Internals.jsx', import.meta.url), 'utf8');
    assert.match(src, /<th>Total<\/th>/);
    assert.doesNotMatch(src, /<th>Total \(50\)<\/th>/);
});
