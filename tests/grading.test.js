import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRADE_SCALES, gradePoints, scaleFor, unrecognisedNotice } from '../src/utils/grading.js';

// Shared with the backend's tests/test_grading.py
const shared = JSON.parse(readFileSync(new URL('../../test_data/grading_cases.json', import.meta.url), 'utf8'));

test('grade points match the shared cases', () => {
    for (const { grade, regulation, points } of shared.grade_points) {
        assert.equal(gradePoints(grade, regulation), points, `${grade} on ${regulation}`);
    }
});

test('each scale runs best to worst, and only the absolute one has seven grades', () => {
    for (const scale of Object.values(GRADE_SCALES)) {
        scale.slice(1).forEach((entry, index) => assert.ok(entry.points < scale[index].points));
    }
    assert.equal(GRADE_SCALES.absolute.length, 7);
    assert.equal(GRADE_SCALES.relative.length, 6);
});

test('an undecided student gets the relative scale', () => {
    assert.equal(scaleFor(null), GRADE_SCALES.relative);
});

test('the notice names unrecognised grades and counts only courses with credits', () => {
    const row = (grade, credits = 3) => ({ grade, credits });
    assert.equal(unrecognisedNotice([row('A'), row('RA'), row('Completed', 0)], 'relative'), null);
    assert.equal(unrecognisedNotice([row('W')], 'relative'), "1 course has a grade we don't recognise (W) and isn't counted.");
    assert.equal(unrecognisedNotice([row('W'), row('W'), row('I')], 'relative'), "3 courses have grades we don't recognise (W, I) and aren't counted.");
    assert.equal(unrecognisedNotice([row('')], 'relative'), "1 course has a grade we don't recognise and isn't counted.");
});
