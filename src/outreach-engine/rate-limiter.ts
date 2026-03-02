/**
 * Rate Limiter
 * Tracks and enforces message limits per profile
 */

interface ProfileStats {
    profileId: string;
    messagesSent: number;
    lastResetTime: number;
    messageHistory: number[];
}

export class RateLimiter {
    private stats: Map<string, ProfileStats> = new Map();
    private readonly maxMessagesPerHour: number;

    constructor(maxMessagesPerHour: number = 5) {
        this.maxMessagesPerHour = maxMessagesPerHour;
    }

    /**
     * Check if profile can send message (under hourly limit)
     */
    canSend(profileId: string): { allowed: boolean; reason?: string } {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);

        let stats = this.stats.get(profileId);

        if (!stats) {
            // First message from this profile
            stats = {
                profileId,
                messagesSent: 0,
                lastResetTime: now,
                messageHistory: []
            };
            this.stats.set(profileId, stats);
        }

        // Reset if more than 1 hour has passed since last reset
        if (now - stats.lastResetTime > 60 * 60 * 1000) {
            stats.messagesSent = 0;
            stats.lastResetTime = now;
            stats.messageHistory = [];
        }

        // Filter messages to only count those within last hour
        stats.messageHistory = stats.messageHistory.filter(time => time > oneHourAgo);

        // Check limit
        if (stats.messageHistory.length >= this.maxMessagesPerHour) {
            const oldestMessage = Math.min(...stats.messageHistory);
            const waitTime = Math.ceil((oldestMessage + 60 * 60 * 1000 - now) / 1000 / 60);
            return {
                allowed: false,
                reason: `Hourly limit reached (${this.maxMessagesPerHour} messages/hour). Wait ${waitTime} minutes.`
            };
        }

        return { allowed: true };
    }

    /**
     * Record a sent message
     */
    recordMessage(profileId: string): void {
        const stats = this.stats.get(profileId);
        if (stats) {
            stats.messagesSent++;
            stats.messageHistory.push(Date.now());
        }
    }

    /**
     * Get stats for a profile
     */
    getStats(profileId: string): { sent: number; limit: number; resetIn: number } | null {
        const stats = this.stats.get(profileId);
        if (!stats) return null;

        const now = Date.now();
        const resetIn = Math.max(0, 60 * 60 * 1000 - (now - stats.lastResetTime));

        return {
            sent: stats.messageHistory.filter(t => t > now - 60 * 60 * 1000).length,
            limit: this.maxMessagesPerHour,
            resetIn: Math.ceil(resetIn / 1000 / 60) // minutes
        };
    }

    /**
     * Clear all stats (for testing)
     */
    clear(): void {
        this.stats.clear();
    }

    /**
     * Get stats for all profiles
     */
    getAllStats(): Map<string, { sent: number; limit: number; resetIn: number }> {
        const allStats = new Map<string, { sent: number; limit: number; resetIn: number }>();

        for (const profileId of this.stats.keys()) {
            const stats = this.getStats(profileId);
            if (stats) {
                allStats.set(profileId, stats);
            }
        }

        return allStats;
    }
}

export default RateLimiter;