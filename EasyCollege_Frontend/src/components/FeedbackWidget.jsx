import React, { useState } from 'react';
import { Send, X, MessageSquarePlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

function FeedbackWidget() {
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState('General Feedback');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const location = useLocation();

    // Hide widget on the login page or if not logged in
    const isLoggedIn = !!localStorage.getItem('auth_token');
    if (!isLoggedIn || location.pathname === '/') return null;

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (!feedbackMessage.trim()) return;

        setIsSubmittingFeedback(true);
        try {
            const authToken = localStorage.getItem('auth_token');
            const SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
            const res = await fetch(`${SERVER_URL}/api/submit-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auth_token: authToken,
                    type: feedbackType,
                    message: feedbackMessage
                })
            });

            if (res.ok) {
                setFeedbackMessage('');
                setIsFeedbackModalOpen(false);
                alert('Feedback submitted successfully! Thank you.');
            } else {
                const errorData = await res.json();
                alert(`Error: ${errorData.error || 'Failed to submit feedback'}`);
            }
        } catch (err) {
            console.error('Feedback submit error:', err);
            alert('Failed to submit feedback due to a network error.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    return (
        <>
            {/* FAB */}
            <button className="fab-button" onClick={() => setIsFeedbackModalOpen(true)} title="Give Feedback">
                <MessageSquarePlus size={24} />
            </button>

            {/* Modal */}
            <AnimatePresence>
                {isFeedbackModalOpen && (
                    <div className="feedback-modal-overlay" onClick={() => setIsFeedbackModalOpen(false)}>
                        <motion.div 
                            className="feedback-modal"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="feedback-header">
                                <h2>Submit Feedback</h2>
                                <button className="feedback-close" onClick={() => setIsFeedbackModalOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleFeedbackSubmit}>
                                <select 
                                    className="feedback-type-select" 
                                    value={feedbackType}
                                    onChange={(e) => setFeedbackType(e.target.value)}
                                >
                                    <option value="Bug Report">Bug Report</option>
                                    <option value="Feature Request">Feature Request</option>
                                    <option value="General Feedback">General Feedback</option>
                                </select>
                                <textarea
                                    className="feedback-textarea"
                                    placeholder="Tell us what's on your mind..."
                                    value={feedbackMessage}
                                    onChange={(e) => setFeedbackMessage(e.target.value)}
                                    required
                                />
                                <button type="submit" className="feedback-submit" disabled={isSubmittingFeedback || !feedbackMessage.trim()}>
                                    {isSubmittingFeedback ? <Loader2 size={20} className="bunk-spinner" /> : <Send size={20} />}
                                    {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

export default FeedbackWidget;
