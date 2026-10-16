const simulate = (present, total, assumedExemptionHours, newPercentage, newMedPercentage) => {
    let newStatus, newCount;
    if (newPercentage === newMedPercentage) {
        if (newPercentage >= 75) {
            newStatus = "Remaining bunks";
            newCount = Math.floor((present - 0.75 * total) / 0.75);
            if (newCount < 0) newCount = 0;
        } else {
            newStatus = "Classes to attend";
            newCount = Math.ceil((0.75 * total - present) / 0.25);
        }
    } else {
        if (newMedPercentage >= 75 && newPercentage >= 65) {
            newStatus = "Remaining bunks";
            newCount = Math.max(0, Math.floor((present - 0.75 * total) / 0.75));
        } else {
            newStatus = "Classes to attend";
            if (newMedPercentage < 75 && newPercentage > 65) {
                newCount = Math.ceil((0.75 * total - (present + assumedExemptionHours)) / 0.25);
            } else {
                newCount = Math.ceil((0.65 * total - present) / 0.35);
            }
        }
    }
    return { newStatus, newCount };
}

console.log("No simulation:", simulate(8, 15, 6, 53, 93)); // 8/15=53, (8+6)/15=93
console.log("Simulate 1 attend:", simulate(9, 16, 6, 56, 93)); // 9/16=56, (9+6)/16=93
