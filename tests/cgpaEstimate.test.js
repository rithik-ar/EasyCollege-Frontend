import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundHalfUp, startingGrade, estimateCgpa, changeFromCurrent, formatChange, targetNeed, parseTarget } from '../src/utils/cgpaEstimate.js';
import { GRADE_SCALES } from '../src/utils/grading.js';

test('a tie rounds up, including with half points', () => {
    assert.equal(roundHalfUp(32.5, 4), 8.13); // 8.125
    assert.equal(roundHalfUp(81, 8), 10.13); // 10.125
    assert.equal(roundHalfUp(413, 52), 7.94); // 7.9423
});

test('worked example with a 6.5 grade', () => {
    // Base 360 points over 45 credits. B (6.5) on 4 credits = 26, A+ (9) on 3 credits = 27.
    const result = estimateCgpa(360, 45, [{ credits: 4, points: 6.5 }, { credits: 3, points: 9 }]);
    assert.deepEqual(result, { semGpa: 7.57, cgpa: 7.94 }); // 53/7 and 413/52
});

test('first semester: the CGPA is the semester GPA', () => {
    assert.deepEqual(estimateCgpa(0, 0, [{ credits: 4, points: 8 }]), { semGpa: 8, cgpa: 8 });
});

test('nothing counted gives no numbers', () => {
    assert.deepEqual(estimateCgpa(360, 45, []), { semGpa: null, cgpa: null });
});

test('courses start on the best grade not above the current average', () => {
    assert.equal(startingGrade(380, 45, GRADE_SCALES.absolute), 'A'); // 8.44
    assert.equal(startingGrade(450, 45, GRADE_SCALES.absolute), 'S'); // 10
    assert.equal(startingGrade(297, 45, GRADE_SCALES.absolute), 'B'); // 6.6
    assert.equal(startingGrade(297, 45, GRADE_SCALES.relative), 'B'); // 6.6
    assert.equal(startingGrade(180, 45, GRADE_SCALES.relative), 'C'); // 4, below every grade
    assert.equal(startingGrade(0, 0, GRADE_SCALES.absolute), 'A'); // no history
});

test('change reads as a signed number, or says there is none', () => {
    assert.equal(formatChange(0.06), '+0.06');
    assert.equal(formatChange(-0.1), '−0.10');
    assert.equal(formatChange(0), 'No change');
});

test('change is measured from the number on screen', () => {
    assert.equal(changeFromCurrent('8.36', 8.42), 0.06);
    assert.equal(changeFromCurrent('8.36', 8.3), -0.06);
    assert.equal(changeFromCurrent('8.36', 8.36), 0);
    assert.equal(changeFromCurrent('RA', 8.42), null);
    assert.equal(changeFromCurrent('8.36', null), null);
    assert.equal(changeFromCurrent('0.00', 8.42), null);
});

const { relative: RELATIVE, absolute: ABSOLUTE } = GRADE_SCALES;

test('target: the smallest semester total whose CGPA rounds to the target', () => {
    // 360 over 45, 15 credits this semester: 494.7 / 60 = 8.245 is the cut, so 135 points (494.5 gives 8.24)
    assert.deepEqual(targetNeed(360, 45, 15, 8.25, RELATIVE),
        { status: 'reachable', neededPoints: 135, neededGpa: 9, bestCgpa: 8.5 });
});

test('target: a total landing exactly on the half rounds up and is enough', () => {
    // 325 / 40 = 8.125 shows as 8.13; 324.5 / 40 = 8.1125 shows as 8.11
    const need = targetNeed(280, 35, 5, 8.13, RELATIVE);
    assert.equal(need.neededPoints, 45);
    assert.equal(roundHalfUp(280 + 45, 40), 8.13);
    assert.equal(roundHalfUp(280 + 44.5, 40), 8.11);
});

test('target: out of reach reports the best possible CGPA', () => {
    // Needs 59.8 points from 5 credits; the top grade gives 50, so 330 / 40 = 8.25 at best
    const need = targetNeed(280, 35, 5, 8.5, RELATIVE);
    assert.equal(need.status, 'unreachable');
    assert.equal(need.bestCgpa, 8.25);
});

test('target: secured when the lowest pass grade is enough', () => {
    // Needs 20 points from 5 credits; C (5) gives 25
    assert.equal(targetNeed(280, 35, 5, 7.5, RELATIVE).status, 'secured');
});

test('target: no history means the semester GPA is the CGPA', () => {
    // 44.065 points from 7 credits, in half-points 44.5; 44.5 / 7 = 6.357, shown rounded up
    assert.deepEqual(targetNeed(0, 0, 7, 6.3, ABSOLUTE),
        { status: 'reachable', neededPoints: 44.5, neededGpa: 6.36, bestCgpa: 10 });
});

test('target: nothing counted gives no answer', () => {
    assert.equal(targetNeed(360, 45, 0, 8.5, RELATIVE), null);
});

test('a typed target is read only once it is a CGPA', () => {
    assert.equal(parseTarget('8.5'), 8.5);
    assert.equal(parseTarget('10'), 10);
    assert.equal(parseTarget('8.25'), 8.25);
    assert.equal(parseTarget(''), null);
    assert.equal(parseTarget('8.'), 8); // mid-typing
    assert.equal(parseTarget('11'), null);
    assert.equal(parseTarget('8.555'), null);
    assert.equal(parseTarget('0'), null);
});
