/**
 * Profile Rotator
 * Manages rotation between multiple AdsPower profiles
 */

export interface ProfileConfig {
    server: string;
    port: number;
    profileId: string;
}

export class ProfileRotator {
    private profiles: ProfileConfig[] = [];
    private currentIndex: number = 0;

    constructor(profiles: ProfileConfig[]) {
        this.profiles = profiles;
    }

    /**
     * Get next available profile
     * @returns Next profile in rotation
     */
    getNextProfile(): ProfileConfig {
        const profile = this.profiles[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.profiles.length;
        return profile;
    }

    /**
     * Get profile by ID
     */
    getProfile(profileId: string): ProfileConfig | undefined {
        return this.profiles.find(p => p.profileId === profileId);
    }

    /**
     * Get all profiles
     */
    getAllProfiles(): ProfileConfig[] {
        return [...this.profiles];
    }

    /**
     * Get number of profiles
     */
    getProfileCount(): number {
        return this.profiles.length;
    }

    /**
     * Add a profile to rotation
     */
    addProfile(profile: ProfileConfig): void {
        this.profiles.push(profile);
    }

    /**
     * Remove profile from rotation
     */
    removeProfile(profileId: string): boolean {
        const index = this.profiles.findIndex(p => p.profileId === profileId);
        if (index !== -1) {
            this.profiles.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Reset rotation to first profile
     */
    reset(): void {
        this.currentIndex = 0;
    }

    /**
     * Check if rotation is enabled (multiple profiles)
     */
    isRotationEnabled(): boolean {
        return this.profiles.length > 1;
    }
}

export default ProfileRotator;