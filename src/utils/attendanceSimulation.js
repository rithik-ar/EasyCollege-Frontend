// Browser-side "what-if" predictor for one attendance row from /api/attendance.
// Mirrors EasyCollege_Backend/attendance_rules.py; change both together. Shared expected
// values: test_data/attendance_cases.json at the repository root.
// Inputs are hypothetical: they are never persisted or sent to the backend.
//
// eCampus displays percentages rounded UP: ceil(100 * hours / total) (verified on real rows).
// A course meets the attendance requirement through either route, judged on those displayed values:
//   A. physical (present / total) >= 75%
//   B. with exemption ((present + exemption) / total) >= 75% AND physical >= 65%
// ceil(100h / T) >= p  <=>  100h > (p - 1) * T, so every check is exact integer arithmetic on hours.

export const EMPTY_SIMULATION = { attend: 0, bunk: 0, exemption: 0 };

// Upper bound on the Med Bunks search; the count stops here if more bunks would still qualify.
// The backend has no limit, so for very large totals it can report more.
export const MED_BUNKS_SEARCH_LIMIT = 70;

export const updateSimulation = (prev, courseCode, type, delta) => {
    const currentObj = { ...EMPTY_SIMULATION, ...prev[courseCode] };
    return {
        ...prev,
        [courseCode]: {
            ...currentObj,
            [type]: Math.max(0, currentObj[type] + delta)
        }
    };
};

// The predictor needs total_exemption_hours from the backend: the Exemption Hours column plus any
// medical leave that only eCampus's "% with Exemp Med" counts. Attendance cached before the backend
// returned it (served by the stale-cache fallback) does not have it.
export const canSimulate = (course) => Number.isInteger(course.total_exemption_hours) && course.total_exemption_hours >= 0;

// Shows a "need to attend" count as negative; zero (including -0) is shown as "0".
export const formatBunks = (course) => {
    const count = course.count === 0 ? 0 : course.count;
    return course.status !== "Remaining bunks" && count !== 0 ? `-${count}` : `${count}`;
};

// The percentage eCampus would display for these hours.
export const displayedPercent = (hours, total) => Math.ceil((100 * hours) / total);

const shownAtLeast = (hours, total, threshold) => 100 * hours > (threshold - 1) * total;
const meetsPhysical75 = (present, total) => shownAtLeast(present, total, 75);
const meetsRouteB = (present, total, exemption) => shownAtLeast(present + exemption, total, 75) && shownAtLeast(present, total, 65);

// { status, count, exemption_bunks } for a course with these hours; same as the backend.
export const calculateAttendance = (total, present, exemption, medBunksLimit = MED_BUNKS_SEARCH_LIMIT) => {
    const eligible = total > 0 && (meetsPhysical75(present, total) || meetsRouteB(present, total, exemption));

    let status;
    let count;
    if (eligible) {
        status = "Remaining bunks";
        // 100P > 74(T + b)  <=>  b < (100P - 74T) / 74
        count = Math.max(0, Math.floor((100 * present - 74 * total - 1) / 74));
    } else {
        status = "Classes to attend";
        // Smallest x meeting both parts of route B (route A after x classes implies route B):
        //   100(P + x) > 64(T + x)      <=>  x > (64T - 100P) / 36
        //   100(P + E + x) > 74(T + x)  <=>  x > (74T - 100(P + E)) / 26
        count = Math.max(0,
            Math.floor((64 * total - 100 * present) / 36) + 1,
            Math.floor((74 * total - 100 * (present + exemption)) / 26) + 1);
        if (total === 0) count = 0; // no classes held yet: nothing to report
    }

    let exemptionBunks = 0;
    while (exemptionBunks < medBunksLimit && total > 0 && meetsRouteB(present, total + exemptionBunks + 1, exemption)) {
        exemptionBunks += 1;
    }

    return { status, count, exemption_bunks: exemptionBunks };
};

export const simulateCourse = (course, simInput) => {
    const sim = { ...EMPTY_SIMULATION, ...simInput };
    const unsimulated = { ...course, isSimulated: false, simBunk: 0, simAttend: 0, simExemption: 0 };
    if (sim.bunk === 0 && sim.attend === 0 && sim.exemption === 0) {
        return unsimulated;
    }
    if (!canSimulate(course)) {
        return { ...unsimulated, predictorUnavailable: true };
    }

    // An exempted class is held (total +1) and missed physically (absent +1, present unchanged),
    // but counts towards the with-exemption percentage. The real exemption-hour fields are left as is.
    const simulatedTotal = parseInt(course.total_hours) + sim.bunk + sim.attend + sim.exemption;
    const simulatedPresent = parseInt(course.present_hours) + sim.attend;
    const simulatedAbsent = parseInt(course.absent_hours) + sim.bunk + sim.exemption;
    const simulatedExemption = course.total_exemption_hours + sim.exemption;

    return {
        ...course,
        ...calculateAttendance(simulatedTotal, simulatedPresent, simulatedExemption),
        total_hours: simulatedTotal,
        present_hours: simulatedPresent,
        absent_hours: simulatedAbsent,
        physical_attendance: `${displayedPercent(simulatedPresent, simulatedTotal)}`,
        with_exemption: `${displayedPercent(simulatedPresent + simulatedExemption, simulatedTotal)}`,
        isSimulated: true,
        simBunk: sim.bunk,
        simAttend: sim.attend,
        simExemption: sim.exemption
    };
};
