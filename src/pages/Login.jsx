import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

function Login() {
    return (
        <section className="outage-page" aria-labelledby="outage-title">
            <motion.div
                className="outage-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="outage-icon" aria-hidden="true">
                    <AlertTriangle size={26} />
                </div>
                <p className="outage-eyebrow">Easy College</p>
                <h1 id="outage-title">We’re having a little trouble</h1>
                <p className="outage-message">
                    Hi, we’re currently experiencing issues due to Ecampus. Please check again later :(
                </p>
            </motion.div>
        </section>
    );
}

export default Login;
