// src/lib/domain/assessment/biometrics.ts
// Pure logic for analyzing behavioral telemetry (dwell times, jitter)

export interface BiometricEvent {
    type: 'mousemove' | 'click' | 'focus' | 'blur';
    timestamp: number;
    x?: number;
    y?: number;
}

export interface BiometricAnalysis {
    hesitationIndex: number; // 0.0 to 1.0 (How long they paused before doing anything)
    agitationIndex: number;  // 0.0 to 1.0 (Erratic mouse movements)
    timeToFirstInteraction: number; // ms
}

/**
 * Analyzes raw biometric events to extract cognitive states.
 */
export function analyzeBiometrics(events: BiometricEvent[], expectedTimeMs: number): BiometricAnalysis {
    if (events.length === 0) {
        return { hesitationIndex: 0, agitationIndex: 0, timeToFirstInteraction: 0 };
    }

    const start = events[0].timestamp;

    // Find first interaction (click or initial movement)
    const firstAction = events.find(e => e.type === 'click' || (e.type === 'mousemove' && (e.timestamp - start > 100)));
    const tti = firstAction ? firstAction.timestamp - start : expectedTimeMs;

    // Normalize hesitation (e.g., waiting > 10 seconds is high hesitation, 1.0)
    const hesitationIndex = Math.min(1.0, tti / 10000);

    // Calculate mouse jitter (total distance covered)
    let totalDistance = 0;
    for (let i = 1; i < events.length; i++) {
        const prev = events[i - 1];
        const curr = events[i];
        if (prev.x && prev.y && curr.x && curr.y) {
            totalDistance += Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
        }
    }

    // Normalize agitation (e.g., > 2000px moved on a single question is high agitation)
    const agitationIndex = Math.min(1.0, totalDistance / 2000);

    return {
        hesitationIndex,
        agitationIndex,
        timeToFirstInteraction: tti
    };
}
