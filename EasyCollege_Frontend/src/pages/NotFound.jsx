import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileQuestion, Home } from 'lucide-react';
import './NotFound.css';

function NotFound() {
    return (
        <div className="not-found-container">
            <motion.div 
                className="not-found-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="not-found-icon">
                    <FileQuestion size={80} strokeWidth={1.5} />
                </div>
                <h1 className="not-found-title">404</h1>
                <p className="not-found-subtitle">Oops! The page you're looking for doesn't exist.</p>
                <Link to="/" className="back-home-btn">
                    <Home size={20} />
                    <span>Back to Home</span>
                </Link>
            </motion.div>
        </div>
    );
}

export default NotFound;
