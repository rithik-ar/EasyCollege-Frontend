import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, RotateCcw } from 'lucide-react';
import ExpandReveal from './ExpandReveal';
import GradeChips from './GradeChips';
import { formatChange } from '../../utils/cgpaEstimate';

// Every course after the walkthrough, with one open for editing at a time. The result updates at once.
function GradeSummary({ courses, scale, gradeFor, leftOut, cgpa, semGpa, change, currentCgpa, onPick, onToggleLeftOut, onStartOver, startOverLabel, canStartOver }) {
    const [openCode, setOpenCode] = useState(null);

    return (
        <div className="cgpa-sum">
            <div className="cgpa-est-bar">
                <div className="cgpa-est-results" aria-live="polite">
                    <div className="cgpa-est-result">
                        <span className="cgpa-est-result-label">Estimated CGPA</span>
                        <span className="cgpa-est-result-value">
                            {cgpa === null ? '–' : cgpa.toFixed(2)}
                            {change !== null && (
                                <span className={`cgpa-est-change ${change > 0 ? 'is-up' : change < 0 ? 'is-down' : ''}`}>{formatChange(change)}</span>
                            )}
                        </span>
                    </div>
                    <div className="cgpa-est-result">
                        <span className="cgpa-est-result-label">Sem GPA</span>
                        <span className="cgpa-est-result-value is-small">{semGpa === null ? '–' : semGpa.toFixed(2)}</span>
                    </div>
                </div>
                <button type="button" className="cgpa-est-reset" onClick={onStartOver} disabled={!canStartOver}>
                    <RotateCcw size={14} aria-hidden="true" /> {startOverLabel}
                </button>
            </div>

            {currentCgpa === 'RA' && <p className="cgpa-est-note">Arrears aren't included in this estimate.</p>}

            <ul className="cgpa-sum-list">
                {courses.map(course => {
                    const grade = gradeFor(course);
                    const isLeftOut = Boolean(leftOut[course.course]);
                    const isOpen = openCode === course.course;
                    return (
                        <li key={course.course} className={isLeftOut ? 'cgpa-sum-course is-off' : 'cgpa-sum-course'}>
                            <button
                                type="button"
                                className="cgpa-sum-row"
                                aria-expanded={isOpen}
                                onClick={() => setOpenCode(isOpen ? null : course.course)}
                            >
                                <span className="cgpa-sum-name">{course.title}</span>
                                <span className="cgpa-sum-credits">{course.credits} cr</span>
                                <span className="cgpa-sum-grade">{isLeftOut ? 'Off' : grade.letter}</span>
                                <ChevronDown size={16} className={isOpen ? 'cgpa-est-chevron is-open' : 'cgpa-est-chevron'} aria-hidden="true" />
                            </button>
                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <ExpandReveal key="grades">
                                        <div className="cgpa-sum-edit">
                                            <GradeChips
                                                label={`Expected grade for ${course.title}`}
                                                scale={scale}
                                                selected={isLeftOut ? null : grade.letter}
                                                onPick={(letter) => { onPick(course, letter); setOpenCode(null); }}
                                                markerId={`cgpa-sum-marker-${course.course}`}
                                            />
                                            <button type="button" className="cgpa-sum-leave" onClick={() => onToggleLeftOut(course)}>
                                                {isLeftOut ? 'Count this course' : 'Leave this course out'}
                                            </button>
                                        </div>
                                    </ExpandReveal>
                                )}
                            </AnimatePresence>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default GradeSummary;
