// Prints two attendance-predictor results using the app's own calculation
// (src/utils/attendanceSimulation.js). Automated checks: npm test.
import { simulateCourse } from './src/utils/attendanceSimulation.js';

// 8/15 attended (53.3%, shown as 54), 6 exemption hours: 14/15 = 93.3% (shown as 94).
// Physical is below 65%: attend 4 -> 12/19 = 63.2% (64), attend 5 -> 13/20 = 65% -> 5.
const course = {
    course_code: 'DEMO',
    total_hours: 15,
    present_hours: 8,
    absent_hours: 7,
    exemption_hours: 6,
    physical_attendance: '54%',
    with_exemption: '94%',
    status: 'Classes to attend',
    count: 5,
    exemption_bunks: 0
};

const summary = ({ physical_attendance, with_exemption, status, count }) => ({ physical_attendance, with_exemption, status, count });

console.log("No simulation:", summary(simulateCourse(course, {})));
console.log("Simulate 1 attend:", summary(simulateCourse(course, { attend: 1 })));
