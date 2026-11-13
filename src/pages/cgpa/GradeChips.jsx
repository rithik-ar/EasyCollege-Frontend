import React from 'react';
import { motion } from 'framer-motion';
import { smoothFade } from './motionOptions';

const MotionSpan = motion.span;

const MARKER_SPRING = { type: 'spring', duration: 0.45, bounce: 0, opacity: { duration: 0.25, ease: 'easeOut' } };

// One row of grades, best on the left, each showing its letter over its points.
// markerId keeps the highlight sliding between grades within this row.
function GradeChips({ label, scale, selected, onPick, markerId }) {
    return (
        <div className="cgpa-chips" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${scale.length}, 1fr)` }}>
            {scale.map(entry => {
                const isSelected = entry.letter === selected;
                return (
                    <button
                        key={entry.letter}
                        type="button"
                        className={isSelected ? 'cgpa-chip is-selected' : 'cgpa-chip'}
                        aria-pressed={isSelected}
                        aria-label={`${entry.letter}, ${entry.points} points`}
                        onClick={() => onPick(entry.letter)}
                    >
                        {isSelected && (
                            <MotionSpan
                                layoutId={markerId}
                                className="cgpa-chip-marker"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={MARKER_SPRING}
                                {...smoothFade}
                            />
                        )}
                        <span className="cgpa-chip-letter">{entry.letter}</span>
                        <span className="cgpa-chip-points">{entry.points}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default GradeChips;
