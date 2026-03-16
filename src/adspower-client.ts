/**
 * AdsPower Client
 * Integrates with AdsPower Local API for multi-profile browser automation
 * 
 * API Documentation: https://localapi-doc-en.adspower.com
 */
import fetch from 'node-fetch';
import puppeteer from 'puppeteer-core';
import { AdsPowerProfile, AdsPowerStartResult } from './types';

export interface AdsPowerConfig {
    host: string;
    port: string;
    apiKey: string;
    timeout: number;
}

const adsPowerProfiles: AdsPowerProfile[] = [];

class AdsPowerClient {
    private readonly endpoint: string;

    constructor(private readonly config: AdsPowerConfig) {
        this.endpoint = `http://${this.config.host}:${this.config.port}/api/v2/`;
    }

    async loadProfiles() {
        let page = 1;
        const offset = 200;
        while(true) {
            const profiles = await this.__getProfiles(page, offset);
            if (!profiles.success) throw new Error(profiles.error || 'Failed to get profiles');
            adsPowerProfiles.push(...profiles.list);
            if (profiles.list.length < offset) {
                break;
            }
            page++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    /**
     * Get all profiles
     */
    async getProfiles(): Promise<{ success: boolean; list: AdsPowerProfile[]; error?: string }> {
        return {
            success: true,
            list: adsPowerProfiles
        };
    }

    private async __getProfiles(page: number = 1, limit: number = 50): Promise<{ success: boolean; list: AdsPowerProfile[]; error?: string }> {
        try {
            const listResponse = await fetch(`${this.endpoint}browser-profile/list`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({page, limit})
            });
            const response = await listResponse.json() as any;
            if (response.code !== 0) throw new Error(response.msg)
            return {
                success: true,
                list: response.data.list,
            };
        } catch (error) {
            return {
                success: false,
                error: (error as Error).message,
                list: []
            };
        }
    }

    /**
     * Start a browser profile
     */
    async startProfile(profileId: string): Promise<AdsPowerStartResult> {
        const startResponse = await fetch(`${this.endpoint}browser-profile/start`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                profile_id: profileId,
                launch_args: [
                    "--remote-allow-origins=*",
                    "--disable-web-security",
                    "--disable-site-isolation-trials"
                ]
            })
        });
        const startData = await startResponse.json() as any;
        if (startData.code !== 0) throw new Error(startData.msg)

        try {
            const wsUrl = startData.data.ws.puppeteer;
            console.log('Original CDP URL:', wsUrl);
            
            // Extract port and GUID for remote connection
            // Original URL format: ws://127.0.0.1:port/devtools/browser/guid
            const port = wsUrl.match(/:(\d+)\//)[1];
            const guid = wsUrl.match(/\/browser\/([0-9a-f\-]+)/)[1];
            
            // Reconstruct URL for remote AdsPower server
            // New format: ws://server:8080/port/port/devtools/browser/guid
            let wsUrlModified: string;
            if (this.config.host !== '127.0.0.1') {
                wsUrlModified = `ws://${this.config.host}:8080/port/${port}/devtools/browser/${guid}`;
                console.log('Modified URL for remote connection:', wsUrlModified);
            } else {
                wsUrlModified = wsUrl;
                console.log('Using original URL for local connection:', wsUrlModified);
            }
            
            // Connect Puppeteer to AdsPower browser
            const headers: Record<string, string> = {
                Host: "localhost",
                "X-Api-Key": this.config.apiKey
            };
            wsUrlModified += `?api_key=${this.config.apiKey}`;

            const browser = await puppeteer.connect({
                browserWSEndpoint: wsUrlModified,
                defaultViewport: null,
                headers
            });

            console.log('Successfully connected to AdsPower!');

            return {
                browser,
                wsEndpoint: wsUrlModified,
                puppeteerEndpoint: wsUrlModified
            };
            
        } catch (error) {
            await this.stopProfile(profileId);
            throw error;
        }
    }

    /**
     * Stop a browser profile
     */
    async stopProfile(profileId: string): Promise<void> {
        await fetch(`${this.endpoint}browser-profile/stop`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({profile_id: profileId})
        });
    }
}

export default AdsPowerClient;