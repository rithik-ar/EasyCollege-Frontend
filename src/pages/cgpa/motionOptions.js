// Framer Motion normally hands opacity and transform-string animations to the browser's animation
// engine. In the version we use, that shows the starting value for one frame when an animation ends:
// a visible flicker, measured frame by frame on 2026-11-09. A component with an onUpdate handler is kept
// on Motion's own loop, which has no such gap. Spread this on any motion element that fades.
export const smoothFade = { onUpdate: () => {} };
