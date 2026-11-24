import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, CalendarDays, Loader2 } from 'lucide-react';
import './FeaturePoster.css';

const MotionSection = motion.section;

// Announces Scheduled Feedback (the feedback portal) while a page loads, in place of its skeleton.
// Shown only on first loads: refreshes keep the page's data on screen instead. To retire the
// announcement, swap this component back out for the skeletons in the pages that render it.
const STEPS = [
    { title: 'Open the Academic Calendar', text: 'Click the link above Schedule Feedback.' },
    { title: 'See upcoming feedback forms', text: 'Know what’s due and when.' },
    { title: 'Schedule your feedback', text: 'Pick the date — it submits automatically.' }
];

function FeaturePoster({ label = 'Loading' }) {
    return (
        <div className="fp-page">
            <MotionSection
                className="fp"
                aria-labelledby="fp-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
            >
                <div className="fp-top">
                    <p className="fp-eyebrow"><span className="fp-dot" aria-hidden="true" />New in the Feedback Portal</p>
                    <p className="fp-status" role="status" aria-live="polite">
                        <Loader2 size={13} className="fp-spinner" aria-hidden="true" />
                        {label}&hellip;
                    </p>
                </div>

                <div className="fp-hero">
                    <div>
                        <h2 id="fp-title" className="fp-title">
                            Don&rsquo;t just submit.<br />
                            <span className="fp-accent">Schedule</span> your feedback.
                        </h2>
                        <p className="fp-lede">
                            Scheduled Feedback is now live. See upcoming forms on your academic calendar and
                            schedule your response ahead &mdash; it&rsquo;s submitted automatically.
                        </p>
                    </div>

                    {/* A picture of the portal's form, not a working one */}
                    <div className="fp-mock-wrap" aria-hidden="true">
                        <div className="fp-mock">
                            <p className="fp-mock-title">Schedule Feedback</p>
                            <span className="fp-mock-link">View your academic calendar here</span>
                            <p className="fp-mock-label">Feedback availability date</p>
                            <div className="fp-mock-input">2026 / 11 / 25</div>
                            <span className="fp-mock-btn"><CalendarDays size={15} />Schedule Feedback</span>
                        </div>
                        <p className="fp-note"><ArrowUp size={13} />The calendar link sits right above the date and button</p>
                    </div>
                </div>

                <p className="fp-eyebrow fp-eyebrow-accent">How it works</p>
                <ol className="fp-steps">
                    {STEPS.map((step, i) => (
                        <li key={step.title} className="fp-step">
                            <span className="fp-step-num" aria-hidden="true">{i + 1}</span>
                            <div>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                            </div>
                        </li>
                    ))}
                </ol>

                <div className="fp-footer">
                    <p className="fp-tagline">Plan ahead. Never miss a form.</p>
                    <p className="fp-live"><span className="fp-dot" aria-hidden="true" />Live now</p>
                </div>
            </MotionSection>
        </div>
    );
}

export default FeaturePoster;
