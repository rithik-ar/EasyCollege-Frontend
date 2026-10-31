// Ends the session and sends the user to the sign-in page with a message.
// Pages call this when the API answers 401: usually eCampus rejected the saved password (changed on
// eCampus), and every retry would be another failed login towards eCampus's 5-a-day account lock.
export function signInAgain(navigate, message) {
    // Same keys as the Navbar's Logout
    ['user', 'credentials', 'auth_token', 'login_type', 'fastMode'].forEach(key => localStorage.removeItem(key));
    navigate('/', { replace: true, state: { error: message || 'Please sign in again.' } });
}
