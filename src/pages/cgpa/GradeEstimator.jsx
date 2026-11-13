import React, { useState } from 'react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import { ChevronDown, Wand2 } from 'lucide-react';
import RegulationPrompt from '../../components/RegulationPrompt';
import ExpandReveal from './ExpandReveal';
import GradeReveal from './GradeReveal';
import GradeSummary from './GradeSummary';
import GradeWalkthrough from './GradeWalkthrough';
import TargetPlanner from './TargetPlanner';
import { smoothFade } from './motionOptions';
import { scaleFor } from '../../utils/grading';
import { startingGrade, estimateCgpa, changeFromCurrent } from '../../utils/cgpaEstimate';

const MotionDiv = motion.div;

// Off for now: opening goes straight to the editable summary. Set to true to bring the walkthrough back.
const WALKTHROUGH_ENABLED = false;
const FIRST_STAGE = WALKTHROUGH_ENABLED ? 'walkthrough' : 'summary';

const REVEAL = { height: { type: 'spring', bounce: 0, duration: 0.55 }, opacity: { duration: 0.35, ease: 'easeOut' } };
const STAGE_FADE = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.4, ease: 'easeInOut' }
};

// Picks the grades a student expects this semester and shows where that leaves their CGPA: one course at
// a time, then the result, then a list to edit. Reopening lands where they left off, so it only runs once.
// Nothing here is saved or sent. basePoints and baseCredits are the page's totals, so its exclusions apply.
function GradeEstimator({ courses, regulation, basePoints, baseCredits, currentCgpa, onRegulationSaved }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isChangingRegulation, setIsChangingRegulation] = useState(false);
    const [picks, setPicks] = useState({}); // course code -> letter
    const [leftOut, setLeftOut] = useState({}); // course code -> true when not counted
    const [targetText, setTargetText] = useState(''); // the target CGPA as typed
    const [stage, setStage] = useState(FIRST_STAGE); // 'walkthrough', 'reveal' or 'summary'
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const reduceMotion = useReducedMotion();

    const scale = scaleFor(regulation);
    const starting = startingGrade(basePoints, baseCredits, scale);
    const semesters = courses.map(course => course.sem).filter(Boolean);
    const semester = semesters.length > 0 ? `semester ${Math.max(...semesters)}` : 'this semester';

    // Picks are kept by letter, so one that doesn't exist on the current scale falls back to the starting grade
    const gradeFor = (course) => scale.find(entry => entry.letter === picks[course.course])
        || scale.find(entry => entry.letter === starting);

    // What the student has actually chosen; the walkthrough never shows a grade they didn't pick
    const answerFor = (course) => scale.find(entry => entry.letter === picks[course.course]) || null;

    const countedCourses = courses.filter(course => !leftOut[course.course]);
    const counted = countedCourses.map(course => ({ credits: course.credits, points: gradeFor(course).points }));
    const { semGpa, cgpa } = estimateCgpa(basePoints, baseCredits, counted);
    const change = changeFromCurrent(currentCgpa, cgpa);

    // Choosing a grade for a course counts it again: that's the student saying what they expect in it
    const pickGrade = (course, letter) => {
        setPicks(prev => ({ ...prev, [course.course]: letter }));
        setLeftOut(prev => ({ ...prev, [course.course]: false }));
    };

    const toggleLeftOut = (course) => {
        setLeftOut(prev => ({ ...prev, [course.course]: !prev[course.course] }));
    };

    const leaveCourseOut = (course) => setLeftOut(prev => ({ ...prev, [course.course]: true }));

    const goNext = () => {
        setDirection(1);
        if (step >= courses.length - 1) {
            setStage('reveal');
        } else {
            setStep(step + 1);
        }
    };

    const goBack = () => {
        setDirection(-1);
        setStep(Math.max(0, step - 1));
    };

    const startOver = () => {
        setPicks({});
        setLeftOut({});
        setTargetText('');
        setStep(0);
        setDirection(1);
        setStage(FIRST_STAGE);
    };

    const panelMotion = reduceMotion ? { duration: 0 } : REVEAL;
    const stepIndex = Math.min(step, Math.max(0, courses.length - 1)); // a refresh can shorten the list
    const view = stage === 'reveal' && cgpa === null ? 'summary' : stage; // nothing to reveal if every course was skipped

    return (
        <MotionConfig reducedMotion="user">
            <section className="cgpa-est" aria-label="Semester grade estimator">
                <button
                    type="button"
                    className="cgpa-est-toggle"
                    aria-expanded={isOpen}
                    aria-controls="cgpa-est-panel"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Wand2 size={20} className="cgpa-est-toggle-icon" aria-hidden="true" />
                    <span className="cgpa-est-toggle-text">
                        <span>Estimate {semester}</span>
                        <span className="cgpa-est-toggle-hint">See your CGPA after this semester, or what a target needs</span>
                    </span>
                    <ChevronDown size={20} className={isOpen ? 'cgpa-est-chevron is-open' : 'cgpa-est-chevron'} aria-hidden="true" />
                </button>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <MotionDiv
                            key="panel"
                            id="cgpa-est-panel"
                            className="cgpa-est-panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1, transition: panelMotion }}
                            exit={{ height: 0, opacity: 0, transition: panelMotion }}
                            {...smoothFade}
                        >
                            <div className="cgpa-est-body">
                                {courses.length === 0 ? (
                                    <p className="cgpa-est-note">This semester's courses aren't listed on eCampus yet.</p>
                                ) : (
                                    <AnimatePresence mode="wait" initial={false}>
                                        <MotionDiv key={view} {...STAGE_FADE} {...smoothFade}>
                                            {view === 'walkthrough' && (
                                                <GradeWalkthrough
                                                    courses={courses}
                                                    index={stepIndex}
                                                    direction={direction}
                                                    scale={scale}
                                                    answerFor={answerFor}
                                                    leftOut={leftOut}
                                                    onPick={pickGrade}
                                                    onLeaveOut={leaveCourseOut}
                                                    onNext={goNext}
                                                    onBack={goBack}
                                                />
                                            )}
                                            {view === 'reveal' && (
                                                <GradeReveal
                                                    semester={semester}
                                                    cgpa={cgpa}
                                                    semGpa={semGpa}
                                                    change={change}
                                                    currentCgpa={currentCgpa}
                                                    onContinue={() => setStage('summary')}
                                                />
                                            )}
                                            {view === 'summary' && (
                                                <TargetPlanner
                                                    text={targetText}
                                                    onTextChange={setTargetText}
                                                    counted={countedCourses}
                                                    scale={scale}
                                                    basePoints={basePoints}
                                                    baseCredits={baseCredits}
                                                    currentCgpa={currentCgpa}
                                                    cgpa={cgpa}
                                                />
                                            )}
                                            {view === 'summary' && (
                                                <GradeSummary
                                                    courses={courses}
                                                    scale={scale}
                                                    gradeFor={gradeFor}
                                                    leftOut={leftOut}
                                                    cgpa={cgpa}
                                                    semGpa={semGpa}
                                                    change={change}
                                                    currentCgpa={currentCgpa}
                                                    onPick={pickGrade}
                                                    onToggleLeftOut={toggleLeftOut}
                                                    onStartOver={startOver}
                                                    startOverLabel={WALKTHROUGH_ENABLED ? 'Start over' : 'Reset'}
                                                    canStartOver={WALKTHROUGH_ENABLED || targetText !== '' || Object.keys(picks).length > 0 || Object.values(leftOut).some(Boolean)}
                                                />
                                            )}
                                        </MotionDiv>
                                    </AnimatePresence>
                                )}

                                {regulation && view === 'summary' && (
                                    <p className="cgpa-est-regulation">
                                        {regulation === 'absolute' ? 'Absolute' : 'Relative'} grading ·{' '}
                                        <button
                                            type="button"
                                            aria-expanded={isChangingRegulation}
                                            onClick={() => setIsChangingRegulation(!isChangingRegulation)}
                                        >
                                            {isChangingRegulation ? 'Cancel' : 'Change'}
                                        </button>
                                    </p>
                                )}
                                <AnimatePresence initial={false}>
                                    {isChangingRegulation && view === 'summary' && (
                                        <ExpandReveal key="regulation-options" className="cgpa-est-reveal-gap">
                                            <div className="cgpa-est-reveal-inner">
                                                <RegulationPrompt
                                                    suggested={regulation}
                                                    suggestedLabel="Current"
                                                    onSaved={() => { setIsChangingRegulation(false); onRegulationSaved(); }}
                                                />
                                            </div>
                                        </ExpandReveal>
                                    )}
                                </AnimatePresence>
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </section>
        </MotionConfig>
    );
}

export default GradeEstimator;
