import React, { useCallback, useEffect, useRef } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

const MotionDiv = motion.div;

// Critically damped: the thumb lands on its grade without bouncing past it
const SETTLE = { type: 'spring', bounce: 0, duration: 0.35 };
const DRAG_THRESHOLD = 6; // px of sideways travel before a touch counts as a drag
const GRAB_RADIUS = 24; // px around the thumb where a press picks it up from where it was grabbed

const clamp = (value) => Math.min(1, Math.max(0, value));

// One grade per stop, worst on the left. The thumb follows the finger freely and the grade changes as it
// crosses each stop; on release it springs to the stop from its current speed. Vertical swipes stay with
// the page (touch-action: pan-y), and a touch that turns into a scroll changes nothing.
function GradeSlider({ label, scale, value, onChange }) {
    const stops = [...scale].reverse();
    const lastStop = stops.length - 1;
    const index = Math.max(0, stops.findIndex(entry => entry.letter === value));
    const trackRef = useRef(null);
    const dragRef = useRef(null);
    const animationRef = useRef(null);
    const reduceMotion = useReducedMotion();

    const position = useMotionValue(index / lastStop);
    const carriage = useTransform(position, v => `translateX(${v * 100}%)`);
    const fill = useTransform(position, v => `scaleX(${v})`);

    const settle = useCallback((stop) => {
        animationRef.current?.stop();
        if (reduceMotion) {
            position.set(stop / lastStop);
        } else {
            animationRef.current = animate(position, stop / lastStop, SETTLE); // carries the finger's speed
        }
    }, [position, lastStop, reduceMotion]);

    // Reset, or a change of grading, moves the thumb too; never while a finger is holding it
    useEffect(() => {
        if (!dragRef.current?.isDragging) settle(index);
    }, [index, settle]);

    useEffect(() => () => animationRef.current?.stop(), []);

    const fractionAt = (clientX, offset) => {
        const { left, width } = trackRef.current.getBoundingClientRect();
        return clamp((clientX - left - offset) / width);
    };

    const pick = (stop) => {
        if (stop !== index) onChange(stops[stop].letter);
    };

    const handlePointerDown = (event) => {
        if (event.button !== 0) return;
        const { left, width } = trackRef.current.getBoundingClientRect();
        const distanceFromThumb = event.clientX - (left + position.get() * width);
        dragRef.current = {
            startX: event.clientX,
            offset: Math.abs(distanceFromThumb) <= GRAB_RADIUS ? distanceFromThumb : 0,
            isDragging: false
        };
    };

    const handlePointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag) return;
        if (!drag.isDragging) {
            if (Math.abs(event.clientX - drag.startX) < DRAG_THRESHOLD) return;
            drag.isDragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            animationRef.current?.stop();
        }
        const fraction = fractionAt(event.clientX, drag.offset);
        position.set(fraction);
        pick(Math.round(fraction * lastStop));
    };

    const handlePointerUp = (event) => {
        const drag = dragRef.current;
        if (!drag) return;
        dragRef.current = null;
        const stop = Math.round((drag.isDragging ? position.get() : fractionAt(event.clientX, drag.offset)) * lastStop);
        pick(stop);
        settle(stop);
    };

    const handlePointerCancel = () => {
        dragRef.current = null;
        settle(index);
    };

    const handleKeyDown = (event) => {
        const next = {
            ArrowRight: index + 1, ArrowUp: index + 1, ArrowLeft: index - 1, ArrowDown: index - 1, Home: 0, End: lastStop
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        pick(Math.min(lastStop, Math.max(0, next)));
    };

    return (
        <div
            className="cgpa-slider"
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={lastStop}
            aria-valuenow={index}
            aria-valuetext={`${stops[index].letter}, ${stops[index].points} points`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onKeyDown={handleKeyDown}
        >
            <div className="cgpa-slider-track" ref={trackRef}>
                <MotionDiv className="cgpa-slider-fill" style={{ transform: fill }} />
                {stops.map((entry, stop) => (
                    <span key={entry.letter} className="cgpa-slider-stop" style={{ left: `${(stop / lastStop) * 100}%` }} />
                ))}
                <MotionDiv className="cgpa-slider-carriage" style={{ transform: carriage }}>
                    <span className="cgpa-slider-thumb" />
                </MotionDiv>
            </div>
        </div>
    );
}

export default GradeSlider;
