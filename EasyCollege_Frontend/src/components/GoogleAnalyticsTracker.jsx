import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const GoogleAnalyticsTracker = () => {
    const location = useLocation();

    useEffect(() => {
        const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
        if (measurementId) {
            ReactGA.initialize(measurementId);
        }
    }, []);

    useEffect(() => {
        // Send pageview on route change
        // We use a slight delay or just send it to ensure title is updated if using libraries that update title, 
        // but standard is just sending it.
        ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }, [location]);

    return null;
};

export default GoogleAnalyticsTracker;