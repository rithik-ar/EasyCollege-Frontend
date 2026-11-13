import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GradeChips from './GradeChips';
import { smoothFade } from './motionOptions';

const MotionDiv = motion.div;

const PROGRESS = { type: 'spring', bounce: 0, duration: 0.7 };
const SETTLE_BEFORE_NEXT = 750; // ms the chosen grade stays on screen, long enough to read it

// x and scale rather than raw transform strings, for the reason in motionOptions.js
// The question and the answer swap in the same spot, the old one fading as the new one grows in
const answerSwap = {
    enter: { opacity: 0, scale: 0.86 },
    shown: { opacity: 1, scale: 1, transition: { type: 'spring', bounce: 0, duration: 0.5 } },
    gone: { opacity: 0, scale: 1.05, transition: { duration: 0.25, ease: 'easeOut' } }
};

const card = {
    enter: (direction) => ({ opacity: 0, x: direction * 40 }),
    centre: {
        opacity: 1,
        x: 0,
        transition: { type: 'spring', bounce: 0, duration: 0.6 }
    },
    exit: (direction) => ({
        opacity: 0,
        x: direction * -40,
        transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }
    })
};

// One course at a time. Nothing is chosen until the student chooses it: the screen asks, then shows
// their answer where the question was. Only the course slides; the grades stay still under the thumb.
function GradeWalkthrough({ courses, index, direction, scale, answerFor, leftOut, onPick, onLeaveOut, onNext, onBack }) {
    const timerRef = useRef(null);
    const isSwappingRef = useRef(false); // true while one course leaves and the next arrives
    const course = courses[index];
    const answer = answerFor(course);
    const isLeftOut = Boolean(leftOut[course.course]);
    const hasResponse = isLeftOut || Boolean(answer);

    // The grade buttons belong to the course on screen, so they change when it arrives, not when it's replaced
    const [shownCode, setShownCode] = useState(course.course);
    const shownCourse = courses.find(item => item.course === shownCode) || course;
    const shownAnswer = answerFor(shownCourse);
    const shownSelection = leftOut[shownCourse.course] || !shownAnswer ? null : shownAnswer.letter;

    useEffect(() => () => clearTimeout(timerRef.current), []);

    // A tap during the change would land on a course the student can't see yet
    const isBusy = () => Boolean(timerRef.current) || isSwappingRef.current;

    const moveOn = () => {
        isSwappingRef.current = true;
        onNext();
    };

    const choose = (letter) => {
        if (isBusy()) return;
        onPick(course, letter);
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            moveOn();
        }, SETTLE_BEFORE_NEXT);
    };

    const leaveOut = () => {
        if (isBusy()) return;
        onLeaveOut(course);
        moveOn();
    };

    const next = () => {
        if (!isBusy()) moveOn();
    };

    const back = () => {
        if (isSwappingRef.current) return;
        clearTimeout(timerRef.current);
        timerRef.current = null;
        isSwappingRef.current = true;
        onBack();
    };

    return (
        <div className="cgpa-walk">
            <div className="cgpa-walk-progress">
                <div className="cgpa-walk-track">
                    {/* Counts courses finished, so it starts empty */}
                    <MotionDiv
                        className="cgpa-walk-fill"
                        initial={false}
                        animate={{ scaleX: index / courses.length }}
                        transition={PROGRESS}
                    />
                </div>
                <span className="cgpa-walk-count">{index + 1} of {courses.length}</span>
            </div>

            <div className="cgpa-walk-stage">
                <AnimatePresence
                    mode="wait"
                    initial={false}
                    custom={direction}
                    onExitComplete={() => {
                        isSwappingRef.current = false;
                        setShownCode(course.course);
                    }}
                >
                    <MotionDiv
                        key={course.course}
                        className="cgpa-walk-card"
                        custom={direction}
                        variants={card}
                        initial="enter"
                        animate="centre"
                        exit="exit"
                        {...smoothFade}
                    >
                        <h3 className="cgpa-walk-name">{course.title}</h3>
                        <p className="cgpa-walk-credits">{course.credits} {course.credits === 1 ? 'credit' : 'credits'}</p>
                        <div className="cgpa-walk-answer">
                            {/* Its own presence: the card's initial={false} would otherwise switch these animations off */}
                            <AnimatePresence initial={false}>
                                <MotionDiv
                                    key={isLeftOut ? 'left-out' : answer ? answer.letter : 'question'}
                                    className="cgpa-walk-answer-item"
                                    variants={answerSwap}
                                    initial="enter"
                                    animate="shown"
                                    exit="gone"
                                    {...smoothFade}
                                >
                                    {isLeftOut && <p className="cgpa-walk-left-out">Left out</p>}
                                    {!isLeftOut && !answer && <p className="cgpa-walk-question">What grade do you expect?</p>}
                                    {!isLeftOut && answer && (
                                        <>
                                            <p className="cgpa-walk-letter">{answer.letter}</p>
                                            <p className="cgpa-walk-points">{answer.points} points</p>
                                        </>
                                    )}
                                </MotionDiv>
                            </AnimatePresence>
                        </div>
                    </MotionDiv>
                </AnimatePresence>
            </div>

            <GradeChips
                label={`Expected grade for ${shownCourse.title}`}
                scale={scale}
                selected={shownSelection}
                onPick={choose}
                markerId="cgpa-walk-marker"
            />

            <div className="cgpa-walk-actions">
                <button type="button" onClick={back} disabled={index === 0}>‹ Back</button>
                {hasResponse ? (
                    <button type="button" onClick={next}>Next ›</button>
                ) : (
                    <button type="button" onClick={leaveOut}>Leave this course out</button>
                )}
            </div>
        </div>
    );
}

export default GradeWalkthrough;
