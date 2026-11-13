import React, { useLayoutEffect, useRef } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { formatChange } from '../../utils/cgpaEstimate';
import { smoothFade } from './motionOptions';

const MotionDiv = motion.div;

const COUNT_SECONDS = 2;
const AFTER_COUNT = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 1.4, duration: 0.6, ease: [0.23, 1, 0.32, 1] }
};

// The payoff of the walkthrough: the CGPA counts from today's value to the estimate
function GradeReveal({ semester, cgpa, semGpa, change, currentCgpa, onContinue }) {
    const numberRef = useRef(null);
    const reduceMotion = useReducedMotion();
    const followUp = reduceMotion ? { transition: { duration: 0 } } : AFTER_COUNT;

    useLayoutEffect(() => {
        const element = numberRef.current;
        const current = parseFloat(currentCgpa);
        const start = current > 0 ? current : Math.max(0, cgpa - 1);
        if (reduceMotion) {
            element.textContent = cgpa.toFixed(2);
            return undefined;
        }
        element.textContent = start.toFixed(2);
        const count = animate(start, cgpa, {
            duration: COUNT_SECONDS,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (value) => { element.textContent = value.toFixed(2); }
        });
        return () => count.stop();
    }, [cgpa, currentCgpa, reduceMotion]);

    return (
        <div className="cgpa-reveal" role="status" aria-label={`Estimated CGPA after ${semester}: ${cgpa.toFixed(2)}`}>
            <p className="cgpa-reveal-label">Your CGPA after {semester}</p>
            <p className="cgpa-reveal-value" ref={numberRef} aria-hidden="true">{cgpa.toFixed(2)}</p>
            <MotionDiv className="cgpa-reveal-details" {...followUp} {...smoothFade}>
                {change !== null && (
                    <p className={`cgpa-est-change cgpa-reveal-change ${change > 0 ? 'is-up' : change < 0 ? 'is-down' : ''}`}>{formatChange(change)}</p>
                )}
                <p className="cgpa-reveal-sem">This semester {semGpa.toFixed(2)}</p>
                {currentCgpa === 'RA' && <p className="cgpa-est-note">Arrears aren't included in this estimate.</p>}
                <button type="button" className="cgpa-reveal-continue" onClick={onContinue}>Review courses</button>
            </MotionDiv>
        </div>
    );
}

export default GradeReveal;
