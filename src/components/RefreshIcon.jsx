import React, { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

const TURN_MS = 1000;
const DEGREES_PER_MS = 360 / TURN_MS;

// Quadratic ease-out, i.e. uniform braking. It starts at exactly 2 x distance / time,
// which lets the duration below be solved so the slowdown begins at the spinning speed.
const BRAKE = 'cubic-bezier(0.3333, 0.6667, 0.6667, 1)';

// The icon looks the same every half turn, so any multiple of 180 degrees is a clean place to stop
const REST_EVERY = 180;
const MIN_BRAKING_DEGREES = 60;

function currentAngle(icon) {
    const { a, b } = new DOMMatrixReadOnly(getComputedStyle(icon).transform);
    return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
}

function spinFrom(icon, angle) {
    return icon.animate(
        [{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${angle + 360}deg)` }],
        { duration: TURN_MS, iterations: Infinity, easing: 'linear' }
    );
}

function brakeFrom(icon, angle) {
    const target = Math.ceil((angle + MIN_BRAKING_DEGREES) / REST_EVERY) * REST_EVERY;
    return icon.animate(
        [{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${target}deg)` }],
        { duration: 2 * (target - angle) / DEGREES_PER_MS, easing: BRAKE }
    );
}

function pulse(icon) {
    return icon.animate(
        [{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }],
        { duration: 1600, iterations: Infinity, easing: 'ease-in-out' }
    );
}

function fadeBack(icon, opacity) {
    return icon.animate(
        [{ opacity }, { opacity: 1 }],
        { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
}

// The refresh icon. While `spinning` it turns steadily, and when that ends it brakes to a stop from
// wherever it is instead of snapping upright. Web Animations keep it off the main thread, so it stays
// smooth while the response renders. Reduced motion swaps the rotation for a pulse.
function RefreshIcon({ spinning, size }) {
    const iconRef = useRef(null);
    const animationRef = useRef(null);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        const icon = iconRef.current;
        const running = animationRef.current;
        if (!icon || (!spinning && !running)) return;

        // Read before cancelling: cancelling puts the icon back at rest
        const angle = currentAngle(icon);
        const opacity = parseFloat(getComputedStyle(icon).opacity);
        running?.cancel();

        if (spinning) {
            animationRef.current = reduceMotion ? pulse(icon) : spinFrom(icon, angle);
            return;
        }
        const settling = reduceMotion ? fadeBack(icon, opacity) : brakeFrom(icon, angle);
        animationRef.current = settling;
        settling.onfinish = () => {
            if (animationRef.current === settling) animationRef.current = null;
        };
    }, [spinning, reduceMotion]);

    useEffect(() => () => animationRef.current?.cancel(), []);

    return <RefreshCw ref={iconRef} size={size} aria-hidden="true" />;
}

export default RefreshIcon;
