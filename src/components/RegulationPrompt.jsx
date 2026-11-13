import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAgain } from '../utils/session';
import { friendlyError } from '../utils/friendlyError';
import './RegulationPrompt.css';

const OPTIONS = [
    { value: 'absolute', name: 'Absolute' },
    { value: 'relative', name: 'Relative' }
];

// Asks which grading regulation the student is on and saves the answer.
// suggested marks what we believe, under suggestedLabel.
function RegulationPrompt({ suggested, suggestedLabel, onSaved }) {
    const navigate = useNavigate();
    const questionId = useId();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const choose = async (regulation) => {
        setIsSaving(true);
        setError('');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
        try {
            const response = await fetch(`${apiUrl}/api/settings/regulation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auth_token: localStorage.getItem('auth_token'), regulation })
            });
            const data = await response.json();
            if (response.status === 401) return signInAgain(navigate, data.error);
            if (response.ok) {
                onSaved();
            } else {
                setError(data.error || 'Failed to save.');
            }
        } catch (err) {
            console.error("Regulation save failed:", err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="reg-prompt" role="group" aria-labelledby={questionId}>
            <p className="reg-prompt-question" id={questionId}>Which grading are you on?</p>
            <div className="reg-prompt-options">
                {OPTIONS.map(({ value, name }) => {
                    const isSuggested = suggested === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            className={isSuggested ? 'reg-prompt-option is-suggested' : 'reg-prompt-option'}
                            onClick={() => choose(value)}
                            disabled={isSaving}
                        >
                            <span className="reg-prompt-name">
                                {name}
                                {isSuggested && <span className="reg-prompt-badge">{suggestedLabel}</span>}
                            </span>
                        </button>
                    );
                })}
            </div>
            {error && <p className="refresh-error" role="alert">Couldn't save. {friendlyError(error)}</p>}
        </div>
    );
}

export default RegulationPrompt;
