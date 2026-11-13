// The semester estimator on the CGPA page. Pure functions, used by src/pages/cgpa/GradeEstimator.jsx and
// tested in tests/cgpaEstimate.test.js.

// Exact half-up rounding to 2 decimals, as eCampus rounds. Works in whole half-points (grades can be 6.5),
// so a tie can't drift the way toFixed's binary floats do.
export function roundHalfUp(points, credits) {
    return Math.floor((100 * Math.round(points * 2) + credits) / (2 * credits)) / 100;
}

// The grade a course starts on: the best one not above the student's current average
export function startingGrade(basePoints, baseCredits, scale) {
    if (!(baseCredits > 0)) return 'A';
    const average = basePoints / baseCredits;
    return (scale.find(entry => entry.points <= average) || scale[scale.length - 1]).letter;
}

// rows: the courses being counted, as { credits, points }. Null values mean nothing is counted yet.
export function estimateCgpa(basePoints, baseCredits, rows) {
    const semCredits = rows.reduce((sum, row) => sum + row.credits, 0);
    if (semCredits === 0) return { semGpa: null, cgpa: null };
    const semPoints = rows.reduce((sum, row) => sum + row.credits * row.points, 0);
    return {
        semGpa: roundHalfUp(semPoints, semCredits),
        cgpa: roundHalfUp(basePoints + semPoints, baseCredits + semCredits)
    };
}

export function formatChange(change) {
    if (change === 0) return 'No change';
    return `${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(2)}`;
}

// Change from the CGPA on screen; null when there is no number to compare with (no history, or "RA")
export function changeFromCurrent(currentCgpa, estimatedCgpa) {
    const current = parseFloat(currentCgpa);
    if (estimatedCgpa === null || !(current > 0)) return null;
    return Math.round((estimatedCgpa - current) * 100) / 100;
}

const asHundredths = (value) => Math.round(value * 100);

// What this semester has to add for the displayed CGPA to reach target. semCredits: the credits being counted.
// neededPoints is the smallest semester total, in the half-points grades come in, that rounds to the target
// or above (half up, as eCampus rounds). status: 'reachable', 'secured' (any pass grade gets there) or
// 'unreachable' (the top grade everywhere falls short; bestCgpa is what that gives). Null with nothing counted.
export function targetNeed(basePoints, baseCredits, semCredits, target, scale) {
    if (!(semCredits > 0)) return null;
    const credits = baseCredits + semCredits;
    const goal = asHundredths(target);
    const meets = (half) => asHundredths(roundHalfUp(basePoints + half / 2, credits)) >= goal;

    // From roundHalfUp: floor((100 * (2 * base + half) + credits) / (2 * credits)) >= goal, then checked directly
    let half = Math.ceil((2 * credits * goal - credits) / 100 - 2 * basePoints);
    for (let i = 0; i < 4 && meets(half - 1); i++) half -= 1;
    while (!meets(half)) half += 1;

    const neededPoints = half / 2;
    const top = scale[0].points;
    const lowest = scale[scale.length - 1].points;
    let status = 'reachable';
    if (neededPoints > top * semCredits) status = 'unreachable';
    else if (neededPoints <= lowest * semCredits) status = 'secured';
    return {
        status,
        neededPoints,
        neededGpa: Math.max(0, Math.ceil(neededPoints * 100 / semCredits - 1e-9) / 100),
        bestCgpa: roundHalfUp(basePoints + top * semCredits, credits)
    };
}

export const MAX_TARGET = 10;

// A typed target CGPA: "8.5" -> 8.5, or null while the text isn't one yet ("", "11", "8.555")
export function parseTarget(text) {
    if (!/^\d{1,2}(\.\d{0,2})?$/.test(text)) return null; // "8." is 8 mid-typing
    const value = parseFloat(text);
    return value > 0 && value <= MAX_TARGET ? value : null;
}
