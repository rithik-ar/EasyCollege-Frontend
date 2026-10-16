import React, { useEffect } from 'react';

function Feedback() {
    useEffect(() => {
        // Redirect to the Streamlit feedback app (same as Easy-College Flask version)
        window.location.href = "https://feedbackauto.streamlit.app/";
    }, []);

    return (
        <div className="feedback-container">
            <div className="page-header">
                <h1>Feedback Automation</h1>
                <p>Redirecting to feedback automation tool...</p>
            </div>
            <div className="loading-text">
                Please wait, you are being redirected to the feedback automation tool...
            </div>
        </div>
    );
}

export default Feedback;