// How long the Scheduled Feedback poster (components/FeaturePoster.jsx) stays up while a page loads.
// The time counts from when the poster appears, so a slow load is never made longer: the poster only
// lingers for whatever is left once the data is in. People can skip the rest with its Continue button.
export const POSTER_MIN_MS = 5000;

/** Milliseconds the poster should stay up after loading finishes, never negative. */
export function holdRemaining(startedAt, now, minMs = POSTER_MIN_MS) {
    if (startedAt === null || startedAt === undefined) return 0;
    return Math.max(0, minMs - (now - startedAt));
}
