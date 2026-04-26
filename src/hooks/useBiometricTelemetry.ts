// src/hooks/useBiometricTelemetry.ts
import { useEffect, useRef, useCallback } from 'react';

// Custom debounce utility to replace lodash/debounce
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function (...args: Parameters<T>) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export interface BiometricTelemetryEvent {
    type: 'mousemove' | 'click' | 'focus' | 'blur';
    timestamp: number;
    x?: number;
    y?: number;
}

export function useBiometricTelemetry(sessionId: string | null) {
    const trackingRef = useRef<HTMLDivElement>(null);
    const eventBuffer = useRef<BiometricTelemetryEvent[]>([]);

    // Determine the base URL depending on the environment
    const getBaseUrl = () => {
        if (typeof window !== 'undefined') return window.location.origin;
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
        return 'http://localhost:3000';
    };

    // Async dispatch function using the absolute URL
    const dispatchBuffer = useCallback(
        debounce(async (eventsToDispatch: BiometricTelemetryEvent[], currentSessionId: string) => {
            if (eventsToDispatch.length === 0) return;

            try {
                await fetch(`${getBaseUrl()}/api/v2/assessment/telemetry`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: currentSessionId,
                        events: eventsToDispatch
                    }),
                    // Attempt to keep the request alive if the user navigates away
                    keepalive: true
                });
            } catch (error) {
                console.error('[Telemetry Error]', error);
            }
        }, 2000), // Flush every 2 seconds of inactivity
        []
    );

    useEffect(() => {
        const element = trackingRef.current;
        if (!element || !sessionId) return;

        const recordEvent = (e: MouseEvent | FocusEvent, type: BiometricTelemetryEvent['type']) => {
            const ev: BiometricTelemetryEvent = {
                type,
                timestamp: Date.now()
            };
            if (e instanceof MouseEvent) {
                ev.x = e.clientX;
                ev.y = e.clientY;
            }

            eventBuffer.current.push(ev);

            // Dispatch asynchronously without blocking the UI thread
            if (eventBuffer.current.length >= 10) {
                const batch = [...eventBuffer.current];
                eventBuffer.current = [];
                dispatchBuffer(batch, sessionId);
            }
        };

        const handleMouseMove = debounce((e: MouseEvent) => recordEvent(e, 'mousemove'), 100);
        const handleClick = (e: MouseEvent) => recordEvent(e, 'click');
        const handleFocus = (e: FocusEvent) => recordEvent(e, 'focus');
        const handleBlur = (e: FocusEvent) => recordEvent(e, 'blur');

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('click', handleClick);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('click', handleClick);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);

            // Flush remaining buffer on unmount
            if (eventBuffer.current.length > 0) {
                dispatchBuffer([...eventBuffer.current], sessionId);
            }
        };
    }, [sessionId, dispatchBuffer]);

    return trackingRef;
}
