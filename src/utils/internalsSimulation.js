// Internals page calculations: map eCampus CA columns to components, total them, and work out the CA2
// increase needed for one more /40 mark. Pure functions, used by src/pages/Internals.jsx and tested in
// tests/internalsSimulation.test.js. Moved out of Internals.jsx unchanged (2026-10-23).

// Table layouts whose columns analyzeComponents understands. Other CA tables (e.g. 8^1740, 8^2080) show
// eCampus's Total only, with no simulator or CA2 target.
export const SIMULATOR_TABLE_IDS = ['8^1600', '8^1601', '8^1602', '8^2210', '8^2220', '8^1890', '8^2260'];

export const analyzeComponents = (course) => {
    const { table_id, row_data } = course;
    const result = {
        t1: null, t2: null, ap: null, ap1: null, ap2: null, mq1: null, mq2: null,
        ir1: null, ir2: null, plro1: null, plro2: null, lt1: null, lt2: null, mp1: null, mp2: null
    };

    const parse = (val) => {
        if (!val || val === "*" || val === "Pending" || val === "") return null;
        return parseFloat(val);
    };

    if (table_id === '8^1600' || table_id === '8^1601' || table_id === '8^1602') {
        result.ir1 = parse(row_data[2]);
        result.ir2 = parse(row_data[3]);
        result.plro1 = parse(row_data[4]);
        result.plro2 = parse(row_data[5]);
        result.type = 'lab';
    } else if (table_id === '8^2210') {
        // Reverse convert displayed / 0.6 to get raw component
        result.t1 = parse(row_data[2]) !== null ? parse(row_data[2]) / 0.6 : null;
        result.t2 = parse(row_data[3]) !== null ? parse(row_data[3]) / 0.6 : null;
        result.ap = parse(row_data[5]);
        result.mq1 = parse(row_data[6]);
        result.mq2 = parse(row_data[7]);
        result.type = 'theory';
    } else if (table_id === '8^1890') {
        // LT1 (30), LT2 (30), Total (60): the lab total is already out of 60.
        result.lt1 = parse(row_data[2]);
        result.lt2 = parse(row_data[3]);
        result.type = 'lab_lt';
    } else if (table_id === '8^2260') {
        // T1 (30), T2 (30), Total (30), AP (8), MP / T1 (6), MP / T2 (6), Total (50).
        // The paper's own maximum is unknown here (eCampus shows T1/T2 scaled to 30), so T1/T2 are kept as
        // percentages, which are the same whatever the paper was out of.
        const pct = (v) => (parse(v) !== null ? (parse(v) / 30) * 100 : null);
        result.t1 = pct(row_data[2]);
        result.t2 = pct(row_data[3]);
        result.ap = parse(row_data[5]);
        result.mp1 = parse(row_data[6]);
        result.mp2 = parse(row_data[7]);
        result.type = 'theory_mp';
    } else if (table_id === '8^2220') {
        result.t1 = parse(row_data[2]) !== null ? parse(row_data[2]) / 0.6 : null;
        result.t2 = parse(row_data[3]) !== null ? parse(row_data[3]) / 0.6 : null;
        result.ap1 = parse(row_data[5]);
        result.ap2 = parse(row_data[6]);
        result.mq1 = parse(row_data[7]);
        result.mq2 = parse(row_data[8]);
        result.type = 'theory_split';
    }

    return result;
};

export const calculateTotal = (data) => {
    let testTotal = 0;
    let mcqTotal = 0;
    let apTotal = 0;
    let labTotal = 0;

    const val = (v) => v === null ? 0 : v;

    if (data.type === 'lab') {
        labTotal = val(data.ir1) + val(data.ir2) + val(data.plro1) + val(data.plro2);
        return { raw: labTotal, 50: labTotal, converted: Math.round(labTotal * 1.2), max: 60 };
    } else if (data.type === 'lab_lt') {
        const ltTotal = Math.round((val(data.lt1) + val(data.lt2)) * 100) / 100;
        return { raw: ltTotal, 50: ltTotal, converted: ltTotal, max: 60, outOf: 60 };
    } else if (data.type === 'theory_mp') {
        // Verified on eCampus: (T1 + T2) / 2 + AP + MP/T1 + MP/T2, pending marks counted as 0.
        const tests30 = ((val(data.t1) + val(data.t2)) / 2) * 0.3; // T1/T2 are percentages -> /30
        const total50 = tests30 + val(data.ap) + val(data.mp1) + val(data.mp2);
        return { raw: total50.toFixed(2), 50: total50, converted: Math.round(total50 * 0.8), max: 40 };
    } else {
        // Input T1/T2 are now Raw out of 50. Convert to 30 before averaging.
        const t1_displayed = val(data.t1) * 0.6;
        const t2_displayed = val(data.t2) * 0.6;
        testTotal = (t1_displayed + t2_displayed) / 2;

        mcqTotal = (val(data.mq1) + val(data.mq2)) / 2;
        apTotal = data.type === 'theory_split' ? val(data.ap1) + val(data.ap2) : val(data.ap);

        const total50 = testTotal + mcqTotal + apTotal;
        return { raw: total50.toFixed(2), 50: total50, converted: Math.round(total50 * 0.8), max: 40 };
    }
};

export const calculateNeededForNext = (course) => {
    if (!course.total || course.total === "Not Updated Yet") return null;

    // Only show for theory courses
    if (course.is_lab) return null;

    // Check if everything is filled (no * or Pending in row_data)
    const hasPending = course.row_data && course.row_data.some(val =>
        val === "*" || val === "Pending" || val === ""
    );
    if (hasPending) return null;

    const currentTotal = parseFloat(course.total);
    if (isNaN(currentTotal)) return null;

    const current40 = Math.round(currentTotal * 0.8);
    const target40 = current40 + 1;

    const targetThreshold40 = target40 - 0.5;
    const targetTotal50 = targetThreshold40 / 0.8;

    const neededIncreaseTotal = targetTotal50 - currentTotal;

    // Needed increase in test average
    const neededIncreaseAvg = neededIncreaseTotal;

    // Needed increase in sum of T1+T2 (displayed)
    const neededIncreaseSumDisplayed = neededIncreaseAvg * 2;

    // Conversion from raw 50 to displayed 30: Displayed = Raw * 0.6
    const neededIncreaseRaw = neededIncreaseSumDisplayed / 0.6;

    // 8^2260: T1/T2 are shown as percentages (the paper's maximum is unknown), so give the CA2 increase as a
    // percentage of the paper too, rounded up to a whole percent.
    if (course.table_id === '8^2260') {
        const neededPercent = Math.max(0, Math.ceil((neededIncreaseSumDisplayed / 30) * 100));
        return { target: target40, increaseRaw: `${neededPercent}%` };
    }

    // Ceil to 0.5
    const ceiledIncrease = Math.ceil(neededIncreaseRaw * 2) / 2;

    return {
        target: target40,
        increaseRaw: Math.max(0, ceiledIncrease).toFixed(1)
    };
};
