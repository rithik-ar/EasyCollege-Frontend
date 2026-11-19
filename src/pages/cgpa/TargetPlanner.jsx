import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Minus, Plus } from 'lucide-react';
import ExpandReveal from './ExpandReveal';
import { smoothFade } from './motionOptions';
import { targetNeed, parseTarget, cgpaFromSemGpa, changeFromCurrent, formatChange, MAX_TARGET } from '../../utils/cgpaEstimate';

const MotionDiv = motion.div;
const MotionSpan = motion.span;

const STEP = 0.05;
const STATUS_FADE = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25, ease: 'easeOut' }
};
// The swap icon turns half a circle per switch, on a critically damped spring so a quick double tap just reverses
const SWAP_SPRING = { type: 'spring', bounce: 0, duration: 0.45 };

// The next 0.05 mark above or below value, so stepping from 8.37 lands on 8.40 or 8.35
const stepFrom = (value, direction) => {
    const marks = value / STEP;
    const next = direction > 0 ? Math.floor(marks + 1e-6) + 1 : Math.ceil(marks - 1e-6) - 1;
    return Math.min(MAX_TARGET, Math.max(0, next * STEP));
};

// Two questions on one row, switched with ⇄. 'target': a CGPA to aim for and the semester GPA it takes.
// 'sem': a semester GPA and the CGPA it gives. Each mode keeps its own typed text.
// counted: the courses being counted, as { course, credits }. cgpa and semGpa: the estimate, a starting point for the steppers.
function TargetPlanner({ mode, onModeChange, showSwapHint, text, onTextChange, counted, scale, basePoints, baseCredits, currentCgpa, cgpa, semGpa }) {
    const isSem = mode === 'sem';
    const typed = parseTarget(text);
    const semCredits = counted.reduce((sum, course) => sum + course.credits, 0);

    const nudge = (direction) => {
        const estimate = isSem ? semGpa : (parseFloat(currentCgpa) > 0 ? parseFloat(currentCgpa) : cgpa);
        const from = typed ?? estimate ?? 8;
        onTextChange(stepFrom(from, direction).toFixed(2));
    };

    const handleInput = (event) => {
        const value = event.target.value.replace(/[^\d.]/g, '').slice(0, 5);
        onTextChange(value);
    };

    // The figure on the right, and an optional line under the row when the figure needs a word of context
    let inputLabel = 'Target CGPA';
    let answerLabel = 'Sem GPA needed';
    let answerValue = '–';
    let answerTone = '';
    let change = null;
    let noteKey = null;
    let note = null;
    if (text !== '' && typed === null) {
        noteKey = 'invalid';
        note = isSem ? 'Enter a GPA up to 10' : 'Enter a CGPA up to 10';
    } else if (typed !== null && semCredits === 0) {
        noteKey = 'none';
        note = isSem ? 'Count at least one course to see your CGPA' : 'Count at least one course to see what you need';
    }
    if (isSem) {
        inputLabel = 'Sem GPA';
        answerLabel = 'CGPA after sem';
        const result = typed === null ? null : cgpaFromSemGpa(basePoints, baseCredits, semCredits, typed);
        if (result !== null) {
            answerValue = result.toFixed(2);
            change = changeFromCurrent(currentCgpa, result);
        }
    } else if (typed !== null && semCredits > 0) {
        const need = targetNeed(basePoints, baseCredits, semCredits, typed, scale);
        if (need.status === 'unreachable') {
            answerLabel = 'Best you can reach';
            answerValue = need.bestCgpa.toFixed(2);
            answerTone = 'is-bad';
            noteKey = 'unreachable';
            note = `${typed.toFixed(2)} is out of reach this semester`;
        } else if (need.status === 'secured') {
            answerValue = 'Any pass';
            answerTone = 'is-good is-word';
        } else {
            answerValue = need.neededGpa.toFixed(2);
        }
    }

    // Until ⇄ has been tried, the row says what it does. Any other note takes the line first.
    const showHint = !note && showSwapHint;

    const noun = isSem ? 'Sem GPA' : 'target';
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
            aria-label={`Lower the ${noun} by 0.05`}
            onClick={() => nudge(-1)}
            disabled={typed !== null && typed <= STEP}
        >
            <Minus size={16} aria-hidden="true" />
        </button>
    );
    const raiseButton = (
        <button
            type="button"
            className="cgpa-target-step"
            aria-label={`Raise the ${noun} by 0.05`}
            onClick={() => nudge(1)}
            disabled={typed !== null && typed >= MAX_TARGET}
        >
            <Plus size={16} aria-hidden="true" />
        </button>
    );

    return (
        <div className="cgpa-target">
            <div className="cgpa-target-row">
                <div className="cgpa-target-figure">
                    <AnimatePresence mode="wait" initial={false}>
                        <MotionSpan key={mode} className="cgpa-target-label" {...STATUS_FADE} {...smoothFade}>
                            <label htmlFor="cgpa-target-input" className="cgpa-est-result-label">{inputLabel}</label>
                        </MotionSpan>
                    </AnimatePresence>
                    {/* −, + and ⇄ stay together after the number, so it lines up under its label like the figures below */}
                    <div className="cgpa-target-field">
                        {input}
                        <div className="cgpa-target-steps">
                            {lowerButton}
                            {raiseButton}
                            <button
                                type="button"
                                className="cgpa-target-step is-swap"
                                aria-label={isSem ? 'Switch to: enter a target CGPA' : 'Switch to: enter a Sem GPA'}
                                onClick={() => onModeChange(isSem ? 'target' : 'sem')}
                            >
                                <MotionSpan className="cgpa-target-swap-icon" animate={{ rotate: isSem ? 180 : 0 }} transition={SWAP_SPRING}>
                                    <ArrowLeftRight size={16} aria-hidden="true" />
                                </MotionSpan>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="cgpa-target-figure is-need" aria-live="polite">
                    <AnimatePresence mode="wait" initial={false}>
                        <MotionDiv key={mode} className="cgpa-target-answer" {...STATUS_FADE} {...smoothFade}>
                            <span className="cgpa-est-result-label">{answerLabel}</span>
                            <span className={`cgpa-target-need ${answerTone}`}>
                                {answerValue}
                                {change !== null && (
                                    <span className={`cgpa-est-change ${change > 0 ? 'is-up' : change < 0 ? 'is-down' : ''}`}>{formatChange(change)}</span>
                                )}
                            </span>
                        </MotionDiv>
                    </AnimatePresence>
                </div>
            </div>
            <AnimatePresence initial={false}>
                {(note || showHint) && (
                    <ExpandReveal key="note">
                        <AnimatePresence mode="wait" initial={false}>
                            <MotionDiv key={note ? `${mode}-${noteKey}` : 'hint'} {...STATUS_FADE} {...smoothFade}>
                                {note ? (
                                    <p id="cgpa-target-note" className="cgpa-target-note">{note}</p>
                                ) : (
                                    <p className="cgpa-target-note is-hint">
                                        Tap <ArrowLeftRight size={12} className="cgpa-target-hint-icon" role="img" aria-label="the swap button" /> to see the CGPA a Sem GPA gives
                                    </p>
                                )}
                            </MotionDiv>
                        </AnimatePresence>
                    </ExpandReveal>
                )}
            </AnimatePresence>
        </div>
    );
}

export default TargetPlanner;
