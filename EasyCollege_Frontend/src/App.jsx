import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layout and Authentication
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import GoogleAnalyticsTracker from './components/GoogleAnalyticsTracker';


// Page Components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Gpa from './pages/Gpa';
import Cgpa from './pages/Cgpa';
import Feedback from './pages/Feedback';
import About from './pages/About';
import Admin from './pages/Admin';
import Internals from './pages/Internals';
import AimlDashboard from './pages/AimlDashboard';
import NotFound from './pages/NotFound';

function App() {
    return (
        <Router>
            <Navbar />
            <GoogleAnalyticsTracker />

            <main className="container">
                <Routes>
                    {/* Public Route */}
                    <Route path="/" element={<Login />} />

                    {/* Private Routes */}
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
                    <Route path="/gpa" element={<PrivateRoute><Gpa /></PrivateRoute>} />
                    <Route path="/cgpa" element={<PrivateRoute><Cgpa /></PrivateRoute>} />
                    <Route path="/internals" element={<PrivateRoute><Internals /></PrivateRoute>} />
                    <Route path="/feedback" element={<PrivateRoute><Feedback /></PrivateRoute>} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/aiml-dashboard" element={<AimlDashboard />} />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
        </Router>
    );
}

export default App;