import React, { useRef } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';

const MotionDiv = motion.div;

const OPENING = { height: { type: 'spring', bounce: 0, duration: 0.5 }, opacity: { duration: 0.3, ease: 'easeOut' } };
const VIEWPORT_MARGIN = 16; // px kept between the opened content and the bottom of the screen

// Grows open on a soft spring inside an AnimatePresence. While opening, the page scrolls with it on
// every frame, so content that would open below the fold comes into view as one motion.
function ExpandReveal({ className = '', children }) {
    const elementRef = useRef(null);
    const isPresent = useIsPresent();
    const reduceMotion = useReducedMotion();
    const transition = reduceMotion ? { duration: 0 } : OPENING;

    const keepInView = () => {
        if (!isPresent || !elementRef.current) return;
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const overflow = elementRef.current.getBoundingClientRect().bottom + VIEWPORT_MARGIN - viewportHeight;
        if (overflow > 0) window.scrollBy({ top: overflow, behavior: 'instant' });
    };

    return (
        <MotionDiv
            ref={elementRef}
            className={`cgpa-est-reveal ${className}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition }}
            exit={{ height: 0, opacity: 0, transition }}
            onUpdate={keepInView}
            onAnimationComplete={keepInView}
        >
            {children}
        </MotionDiv>
    );
}

export default ExpandReveal;
