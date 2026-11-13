// Turns the API's and proxy's error text into something a student can act on.
// Only for display: pages still compare the original text to choose which state to show.
export function friendlyError(message = '') {
    if (message.startsWith('An error occurred')) {
        return navigator.onLine === false ? 'You seem to be offline.' : 'Our server is waking up, try again in a moment.';
    }
    if (message.startsWith('Backend ')) return 'Our server is waking up, try again in a moment.';
    if (/(unavailable|not available)\.$/.test(message)) return "eCampus didn't respond.";
    return 'Something went wrong, please try again.';
}
