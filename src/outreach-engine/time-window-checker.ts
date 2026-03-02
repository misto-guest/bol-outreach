/**
 * Time Window Checker
 * Enforces business hours: Mon-Sat, 9AM-8PM GMT+1
 */

export class TimeWindowChecker {
    private timezone: string;
    private startHour: number;
    private endHour: number;
    private allowedDays: number[];

    constructor(
        timezone: string = 'Europe/Amsterdam',
        startHour: number = 9,
        endHour: number = 20
    ) {
        this.timezone = timezone;
        this.startHour = startHour;  // 9 AM
        this.endHour = endHour;      // 8 PM (20:00)
        this.allowedDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat (0=Sun, 6=Sat)
    }

    /**
     * Check if current time is within allowed window
     */
    canSendNow(): { allowed: boolean; reason?: string; nextAllowedTime?: Date } {
        const now = new Date();
        const timeZoneNow = this.getTimeInTimezone(now);

        const hour = timeZoneNow.getHours();
        const day = timeZoneNow.getDay();

        // Check if day is allowed (Mon-Sat)
        if (!this.allowedDays.includes(day)) {
            const nextMonday = this.getNextAllowedDay(now);
            return {
                allowed: false,
                reason: `Outside allowed days (Mon-Sat only). Current day: ${this.getDayName(day)}`,
                nextAllowedTime: nextMonday
            };
        }

        // Check if hour is within range (9AM-8PM)
        if (hour < this.startHour) {
            const startTimeToday = this.setTimeOfDay(now, this.startHour, 0);
            return {
                allowed: false,
                reason: `Too early (before ${this.startHour}:00). Current time: ${hour}:00`,
                nextAllowedTime: startTimeToday
            };
        }

        if (hour >= this.endHour) {
            const startTimeTomorrow = this.getNextAllowedDay(now);
            startTimeTomorrow.setHours(this.startHour, 0, 0, 0);
            return {
                allowed: false,
                reason: `Too late (after ${this.endHour}:00). Current time: ${hour}:00`,
                nextAllowedTime: startTimeTomorrow
            };
        }

        return { allowed: true };
    }

    /**
     * Get next allowed time to send
     */
    getNextAllowedTime(from?: Date): Date {
        const base = from || new Date();
        const timeZoneBase = this.getTimeInTimezone(base);

        const hour = timeZoneBase.getHours();
        const day = timeZoneBase.getDay();

        // If outside allowed days, find next Monday
        if (!this.allowedDays.includes(day)) {
            const nextDay = this.getNextAllowedDay(base);
            nextDay.setHours(this.startHour, 0, 0, 0);
            return nextDay;
        }

        // If before start time, send at start time today
        if (hour < this.startHour) {
            const startTime = this.setTimeOfDay(base, this.startHour, 0);
            return startTime;
        }

        // If after end time, send at start time tomorrow
        if (hour >= this.endHour) {
            const tomorrow = new Date(base);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(this.startHour, 0, 0, 0);

            // If tomorrow is Sunday, skip to Monday
            const tomorrowTZ = this.getTimeInTimezone(tomorrow);
            if (tomorrowTZ.getDay() === 0) {
                tomorrow.setDate(tomorrow.getDate() + 1);
            }

            return tomorrow;
        }

        // Currently within window
        return base;
    }

    /**
     * Get time in configured timezone
     */
    private getTimeInTimezone(date: Date): Date {
        const options = {
            timeZone: this.timezone,
            year: 'numeric' as const,
            month: 'numeric' as const,
            day: 'numeric' as const,
            hour: 'numeric' as const,
            minute: 'numeric' as const,
            second: 'numeric' as const,
            hour12: false
        };

        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(date);

        const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
        const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
        const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

        return new Date(year, month, day, hour, minute, second);
    }

    /**
     * Get next allowed day (Mon-Sat)
     */
    private getNextAllowedDay(date: Date): Date {
        const next = new Date(date);
        let daysToAdd = 1;

        while (true) {
            next.setDate(next.getDate() + daysToAdd);
            const nextTZ = this.getTimeInTimezone(next);
            if (this.allowedDays.includes(nextTZ.getDay())) {
                return next;
            }
            daysToAdd = 1;
        }
    }

    /**
     * Set time of day for a date
     */
    private setTimeOfDay(date: Date, hour: number, minute: number): Date {
        const result = new Date(date);
        result.setHours(hour, minute, 0, 0);
        return result;
    }

    /**
     * Get day name
     */
    private getDayName(day: number): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[day];
    }

    /**
     * Format next allowed time for display
     */
    formatNextAllowedTime(date: Date): string {
        return date.toLocaleString('en-NL', {
            timeZone: this.timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    }
}

export default TimeWindowChecker;