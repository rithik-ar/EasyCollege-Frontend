// Grade points for PSG Tech's two grading regulations. The backend has the same rules in grading.py;
// change them together and keep test_data/grading_cases.json in step.

// Best grade first. Absolute: current first and second years. Relative: current third and fourth years.
export const GRADE_SCALES = {
    absolute: [
        { letter: 'S', points: 10 }, { letter: 'A+', points: 9 }, { letter: 'A', points: 8 }, { letter: 'B+', points: 7 },
        { letter: 'B', points: 6.5 }, { letter: 'C+', points: 6 }, { letter: 'C', points: 5 }
    ],
    relative: [
        { letter: 'O', points: 10 }, { letter: 'A+', points: 9 }, { letter: 'A', points: 8 }, { letter: 'B+', points: 7 },
        { letter: 'B', points: 6 }, { letter: 'C', points: 5 }
    ]
};

// An undecided student is scored on the relative scale until they answer; only B differs
export const scaleFor = (regulation) => GRADE_SCALES[regulation] || GRADE_SCALES.relative;

// Points for a grade cell, or null if unrecognised. Points printed in the cell ("9 A+") win over the letter.
export function gradePoints(grade, regulation) {
    const text = (grade || '').trim();
    const printed = text.match(/^(\d+(?:\.\d+)?)(?:\s|$)/);
    if (printed) return parseFloat(printed[1]);
    const letter = text.split(/\s+/).pop();
    return scaleFor(regulation).find(entry => entry.letter === letter)?.points ?? null;
}

// The line telling a student some courses aren't counted, or null when every grade is recognised.
// rows: { grade, credits }. RA and 0-credit courses don't count here, as they are expected to add nothing.
export function unrecognisedNotice(rows, regulation) {
    const grades = rows
        .filter(row => Number(row.credits) > 0 && !(row.grade || '').startsWith('RA') && gradePoints(row.grade, regulation) === null)
        .map(row => row.grade);
    if (grades.length === 0) return null;
    const names = [...new Set(grades.filter(Boolean))].join(', ');
    const label = names ? ` (${names})` : '';
    return grades.length === 1
        ? `1 course has a grade we don't recognise${label} and isn't counted.`
        : `${grades.length} courses have grades we don't recognise${label} and aren't counted.`;
}
