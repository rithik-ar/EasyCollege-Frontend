import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import ExpandReveal from './ExpandReveal';
import { smoothFade } from './motionOptions';
import { targetNeed, parseTarget, MAX_TARGET } from '../../utils/cgpaEstimate';

const MotionDiv = motion.div;

const STEP = 0.05;
const STATUS_FADE = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25, ease: 'easeOut' }
};

// The next 0.05 mark above or below value, so stepping from 8.37 lands on 8.40 or 8.35
const stepFrom = (value, direction) => {
    const marks = value / STEP;
    const next = direction > 0 ? Math.floor(marks + 1e-6) + 1 : Math.ceil(marks - 1e-6) - 1;
    return Math.min(MAX_TARGET, Math.max(0, next * STEP));
};

// The reverse of the estimate: a CGPA to aim for and the semester GPA it takes.
// counted: the courses being counted, as { course, credits }. cgpa: the estimate, a starting point for the steppers.
function TargetPlanner({ text, onTextChange, counted, scale, basePoints, baseCredits, currentCgpa, cgpa }) {
    const target = parseTarget(text);
    const semCredits = counted.reduce((sum, course) => sum + course.credits, 0);
    const need = target === null ? null : targetNeed(basePoints, baseCredits, semCredits, target, scale);

    const nudge = (direction) => {
        const from = target ?? (parseFloat(currentCgpa) > 0 ? parseFloat(currentCgpa) : cgpa ?? 8);
        onTextChange(stepFrom(from, direction).toFixed(2));
    };

    const handleInput = (event) => {
        const value = event.target.value.replace(/[^\d.]/g, '').slice(0, 5);
        onTextChange(value);
    };

    // The figure on the right, and an optional line under the row when the figure needs a word of context
    let needLabel = 'Sem GPA needed';
    let needValue = '–';
    let needTone = '';
    let noteKey = null;
    let note = null;
    if (text !== '' && target === null) {
        noteKey = 'invalid';
        note = 'Enter a CGPA up to 10';
    } else if (target !== null && semCredits === 0) {
        noteKey = 'none';
        note = 'Count at least one course to see what you need';
    } else if (need?.status === 'unreachable') {
        needLabel = 'Best you can reach';
        needValue = need.bestCgpa.toFixed(2);
        needTone = 'is-bad';
        noteKey = 'unreachable';
        note = `${target.toFixed(2)} is out of reach this semester`;
    } else if (need?.status === 'secured') {
        needValue = 'Any pass';
        needTone = 'is-good is-word';
    } else if (need) {
        needValue = need.neededGpa.toFixed(2);
    }

    const input = (
        <input
            id="cgpa-target-input"
            className="cgpa-target-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Set"
            value={text}
            onChange={handleInput}
            aria-invalid={noteKey === 'invalid'}
            aria-describedby={note ? 'cgpa-target-note' : undefined}
        />
    );
    const lowerButton = (
        <button
            type="button"
            className="cgpa-target-step"
            aria-label="Lower the target by 0.05"
            onClick={() => nudge(-1)}
            disabled={target !== null && target <= STEP}
        >
            <Minus size={16} aria-hidden="true" />
        </button>
    );
    const raiseButton = (
        <button
            type="button"
            className="cgpa-target-step"
            aria-label="Raise the target by 0.05"
            onClick={() => nudge(1)}
            disabled={target !== null && target >= MAX_TARGET}
        >
            <Plus size={16} aria-hidden="true" />
        </button>
    );

    return (
        <div className="cgpa-target">
            <div className="cgpa-target-row">
                <div className="cgpa-target-figure">
                    <label htmlFor="cgpa-target-input" className="cgpa-est-result-label">Target CGPA</label>
                    {/* − and + stay together after the number, so it lines up under its label like the figures below */}
                    <div className="cgpa-target-field">
                        {input}
                        <div className="cgpa-target-steps">
                            {lowerButton}
                            {raiseButton}
                        </div>
                    </div>
                </div>
                <div className="cgpa-target-figure is-need" aria-live="polite">
                    <span className="cgpa-est-result-label">{needLabel}</span>
                    <span className={`cgpa-target-need ${needTone}`}>{needValue}</span>
                </div>
            </div>
            <AnimatePresence initial={false}>
                {note && (
                    <ExpandReveal key="note">
                        <AnimatePresence mode="wait" initial={false}>
                            <MotionDiv key={noteKey} {...STATUS_FADE} {...smoothFade}>
                                <p id="cgpa-target-note" className="cgpa-target-note">{note}</p>
                            </MotionDiv>
                        </AnimatePresence>
                    </ExpandReveal>
                )}
            </AnimatePresence>
        </div>
    );
}

export default TargetPlanner;
