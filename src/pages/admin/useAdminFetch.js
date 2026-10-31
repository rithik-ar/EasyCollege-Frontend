import { useCallback, useEffect, useRef, useState } from 'react';

export const API_URL = import.meta.env.VITE_API_BASE_URL;

// GET an admin endpoint with the admin token. Keeps the last data on screen while reloading,
// ignores responses that arrive after a newer request, and hands a 401 to onExpired.
export default function useAdminFetch(path, token, onExpired, enabled = true) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const latest = useRef(0);

    const load = useCallback(async () => {
        if (!path || !token) return;
        const id = ++latest.current;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}${path}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) {
                onExpired();
                return;
            }
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || 'Request failed');
            if (id === latest.current) setData(body);
        } catch (err) {
            if (id === latest.current) {
                setError(err instanceof TypeError ? 'Could not reach the backend' : err.message);
            }
        } finally {
            if (id === latest.current) setIsLoading(false);
        }
    }, [path, token, onExpired]);

    useEffect(() => {
        if (enabled) load();
    }, [enabled, load]);

    return { data, isLoading, error, reload: load };
}
