/**
 * AdsPower Client
 * Integrates with AdsPower Local API for multi-profile browser automation
 * 
 * API Documentation: https://localapi-doc-en.adspower.com
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { AdsPowerProfile, AdsPowerStartOptions, AdsPowerStartResult, AdsPowerApiResponse } from './types';

class AdsPowerClient {
  private endpoint: string;
  private apiKey: string;
  private ngrokUrl: string;
  private timeout: number;

  constructor() {
    this.endpoint = process.env.ADPOWER_API_ENDPOINT || 'http://127.0.0.1:50325';
    this.apiKey = process.env.ADPOWER_API_KEY || '';
    this.ngrokUrl = process.env.ADPOWER_NGROK_URL || '';
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Make HTTP request to AdsPower API
   */
  private async _request(path: string, method: string = 'GET'): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.endpoint);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.timeout,
      };

      // Add API key if available
      if (this.apiKey) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${this.apiKey}`
        };
      }

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed: AdsPowerApiResponse = JSON.parse(data);
            if (parsed.code === 0 || parsed.ret_code === 0) {
              resolve(parsed.data || parsed);
            } else {
              reject(new Error(parsed.msg || parsed.message || 'API request failed'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${(error as Error).message}`));
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Test connection to AdsPower
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
    try {
      const response = await this._request('/api/v1/user/status');
      return { 
        success: true, 
        message: 'Connected to AdsPower',
        data: response 
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Cannot connect to AdsPower',
        error: (error as Error).message 
      };
    }
  }

  /**
   * Get all profiles
   */
  async getProfiles(): Promise<{ success: boolean; list: AdsPowerProfile[]; total: number; error?: string }> {
    try {
      const response = await this._request('/api/v1/user/list');
      return {
        success: true,
        list: response.list || response.data?.list || [],
        total: response.total || response.data?.total || 0
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        list: [],
        total: 0
      };
    }
  }

  /**
   * Start a browser profile
   */
  async startProfile(profileId: string, options: AdsPowerStartOptions = {}): Promise<AdsPowerStartResult> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('user_id', profileId);
      
      // Add options as query parameters
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.set(key, String(value));
        }
      });

      const response = await this._request(`/api/v1/browser/start?${queryParams}`);
      
      // Return wsEndpoint for Puppeteer connection
      // If ngrok URL is configured, use it for remote connections
      let wsEndpoint = response.ws?.puppeteer || response.ws_endpoint;
      
      if (this.ngrokUrl && wsEndpoint) {
        // Replace localhost with ngrok URL for remote access
        const wsUrl = new URL(wsEndpoint);
        wsEndpoint = `${this.ngrokUrl.replace('https://', 'wss://').replace('http://', 'ws://')}${wsUrl.pathname}`;
      }

      return {
        success: true,
        profileId,
        wsEndpoint,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        profileId,
        error: (error as Error).message
      };
    }
  }

  /**
   * Stop a browser profile
   */
  async stopProfile(profileId: string): Promise<{ success: boolean; profileId: string; data?: any; error?: string }> {
    try {
      const response = await this._request(`/api/v1/browser/stop?user_id=${profileId}`);
      return {
        success: true,
        profileId,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        profileId,
        error: (error as Error).message
      };
    }
  }

  /**
   * Check profile status
   */
  async getProfileStatus(profileId: string): Promise<{ success: boolean; profileId: string; status: string; data?: any; error?: string }> {
    try {
      const response = await this._request(`/api/v1/browser/status?user_id=${profileId}`);
      return {
        success: true,
        profileId,
        status: response.status || 'unknown',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        profileId,
        error: (error as Error).message,
        status: 'error'
      };
    }
  }

  /**
   * Get active profile count
   */
  async getActiveCount(): Promise<{ success: boolean; count: number; data?: any; error?: string }> {
    try {
      const response = await this._request('/api/v1/browser/active');
      return {
        success: true,
        count: response.count || 0,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        count: 0
      };
    }
  }

  /**
   * Check if a profile is currently running
   */
  async isProfileRunning(profileId: string): Promise<boolean> {
    try {
      const status = await this.getProfileStatus(profileId);
      return status.success && status.data?.status === 'Active';
    } catch (error) {
      return false;
    }
  }
}

export default AdsPowerClient;