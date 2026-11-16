import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, GraduationCap, Users } from 'lucide-react';
import { motion } from 'framer-motion';

function Login() {
    const [rollNumber, setRollNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginType, setLoginType] = useState('S'); // 'S' for Student, 'P' for Parent
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.error) {
            setError(location.state.error);
            return;
        }

        if (localStorage.getItem('user')) {
            navigate('/dashboard');
        }
    }, [navigate, location]);

    const apiUrl = import.meta.env.VITE_API_BASE_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${apiUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roll_number: rollNumber.toUpperCase().trim(),
                    password: password,
                    login_type: loginType
                })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('auth_token', data.auth_token);
                navigate('/dashboard');
            } else {
                setError(data.error || 'Login failed!');
            }
        } catch (err) {
            console.error("Login API call failed:", err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-options" style={{ width: '100%', maxWidth: '1200px' }}>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton skeleton-card" style={{ height: '220px', borderRadius: '20px' }}></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="login-wrapper">
                <motion.div
                    className="login-container"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="welcome-text">Welcome Back</h1>
                    <p className="subtitle">Sign in to continue to Easy College using your Ecampus credentials</p>

                    {/* Login Type Toggle */}
                    <div className="login-type-toggle">
                        <button
                            type="button"
                            className={`login-type-btn ${loginType === 'S' ? 'active' : ''}`}
                            onClick={() => setLoginType('S')}
                        >
                            <GraduationCap size={18} />
                            Student
                        </button>
                        <button
                            type="button"
                            className={`login-type-btn ${loginType === 'P' ? 'active' : ''}`}
                            onClick={() => setLoginType('P')}
                        >
                            <Users size={18} />
                            Parent
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <div className="input-wrapper">
                                <User className="input-icon" size={20} />
                                <input
                                    type="text"
                                    value={rollNumber}
                                    onChange={e => setRollNumber(e.target.value)}
                                    placeholder="Roll Number"
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="input-field"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle-btn"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="error-message"
                                style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.9rem' }}
                            >
                                {error}
                            </motion.div>
                        )}

                        
                    </form>
                </motion.div>
            </div>
        </>
    );
}

export default Login;