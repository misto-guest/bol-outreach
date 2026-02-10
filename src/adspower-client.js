/**
 * AdsPower Client
 * Integrates with AdsPower Local API for multi-profile browser automation
 * 
 * API Documentation: https://localapi-doc-en.adspower.com
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class AdsPowerClient {
  constructor() {
    this.endpoint = process.env.ADSPOWER_API_ENDPOINT || 'http://127.0.0.1:50325';
    this.apiKey = process.env.ADSPOWER_API_KEY || '';
    this.ngrokUrl = process.env.ADSPOWER_NGROK_URL || '';
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Make HTTP request to AdsPower API
   */
  async _request(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.endpoint);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
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
        options.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.code === 0 || parsed.ret_code === 0) {
              resolve(parsed.data || parsed);
            } else {
              reject(new Error(parsed.msg || parsed.message || 'API request failed'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
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
  async testConnection() {
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
        error: error.message 
      };
    }
  }

  /**
   * Get all profiles
   */
  async getProfiles() {
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
        error: error.message,
        list: [],
        total: 0
      };
    }
  }

  /**
   * Start a browser profile
   */
  async startProfile(profileId, options = {}) {
    try {
      const queryParams = new URLSearchParams({
        user_id: profileId,
        ...options
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
        error: error.message
      };
    }
  }

  /**
   * Stop a browser profile
   */
  async stopProfile(profileId) {
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
        error: error.message
      };
    }
  }

  /**
   * Check profile status
   */
  async getProfileStatus(profileId) {
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
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * Get active profile count
   */
  async getActiveCount() {
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
        error: error.message,
        count: 0
      };
    }
  }

  /**
   * Check if a profile is currently running
   */
  async isProfileRunning(profileId) {
    try {
      const status = await this.getProfileStatus(profileId);
      return status.success && status.data?.status === 'Active';
    } catch (error) {
      return false;
    }
  }
}

module.exports = AdsPowerClient;
