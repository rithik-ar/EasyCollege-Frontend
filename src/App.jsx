import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';

function App() {
    return (
        <Router>
            <main className="container">
                <Routes>
                    <Route path="*" element={<Login />} />
                </Routes>
            </main>
        </Router>
    );
}

export default App;
