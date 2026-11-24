import { useCallback, useEffect, useRef, useState } from 'react';
import { POSTER_MIN_MS, holdRemaining } from '../utils/posterHold';

/**
 * Keeps the loading poster up for at least POSTER_MIN_MS from when it first appears.
 *   loading: the page would show the poster anyway (still loading, nothing to show yet)
 *   release: drop the poster at once when loading ends, e.g. on an error, so it isn't held back
 * Returns { show, ready, skip }: show the poster; the data is ready (offer Continue); skip the rest.
 */
export default function usePosterHold(loading, release = false, minMs = POSTER_MIN_MS) {
    const startedAt = useRef(null);
    const [holding, setHolding] = useState(loading);

    const skip = useCallback(() => {
        startedAt.current = null;
        setHolding(false);
    }, []);

    useEffect(() => {
        if (loading) {
            if (startedAt.current === null) startedAt.current = Date.now();
            setHolding(true);
            return undefined;
        }
        if (startedAt.current === null) return undefined;
        const remaining = release ? 0 : holdRemaining(startedAt.current, Date.now(), minMs);
        if (remaining === 0) {
            skip();
            return undefined;
        }
        const timer = setTimeout(skip, remaining);
        return () => clearTimeout(timer);
    }, [loading, release, minMs, skip]);

    const held = holding && !release;
    return { show: loading || held, ready: !loading && held, skip };
}
