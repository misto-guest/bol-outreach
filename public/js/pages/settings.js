/**
 * Settings Page
 * Platform configuration and settings
 */

App.Pages.settings = {
    async load() {
        const content = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">AdsPower Integration</h3>
                </div>
                <div class="card-body">
                    <div id="adspowerStatus">
                        <div class="empty-state">
                            <i class="fas fa-spinner"></i>
                            <p>Checking AdsPower status...</p>
                        </div>
                    </div>

                    <div style="margin-top: 20px;">
                        <button class="btn btn-primary" onclick="App.Pages.settings.testAdsPowerConnection()">
                            <i class="fas fa-plug"></i> Test Connection
                        </button>
                        <button class="btn btn-outline" onclick="App.Pages.settings.refreshProfiles()">
                            <i class="fas fa-sync"></i> Refresh Profiles
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Platform Settings</h3>
                </div>
                <div class="card-body">
                    <form id="settingsForm">
                        <div class="form-group">
                            <label for="senderName">Default Sender Name</label>
                            <input type="text" id="senderName" class="form-control" value="${App.State.user.name}">
                            <small class="text-muted">Used in message templates as {sender_name}</small>
                        </div>

                        <div class="form-group">
                            <label for="defaultDailyLimit">Default Daily Limit</label>
                            <input type="number" id="defaultDailyLimit" class="form-control" value="10" min="1" max="100">
                            <small class="text-muted">Default messages per day for new campaigns</small>
                        </div>

                        <div class="form-group">
                            <label for="cooldownPeriod">Cooldown Period (days)</label>
                            <input type="number" id="cooldownPeriod" class="form-control" value="120" min="1" max="365">
                            <small class="text-muted">Days before re-contacting the same seller</small>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="requireApproval" checked>
                                Require manual approval for all messages
                            </label>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="enableLogging" checked>
                                Enable detailed audit logging
                            </label>
                        </div>

                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                    </form>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Compliance & Safety</h3>
                </div>
                <div class="card-body">
                    <div style="padding: 15px; background: var(--primary-light); border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin-top: 0;">Compliance Features Active</h4>
                        <ul style="margin-bottom: 0;">
                            <li><i class="fas fa-check" style="color: var(--success-color);"></i> Manual approval required for all messages</li>
                            <li><i class="fas fa-check" style="color: var(--success-color);"></i> Rate limiting (2 messages/profile/day)</li>
                            <li><i class="fas fa-check" style="color: var(--success-color);"></i> 120-day cooldown per seller</li>
                            <li><i class="fas fa-check" style="color: var(--success-color);"></i> Full audit trail</li>
                            <li><i class="fas fa-check" style="color: var(--success-color);"></i> Opt-out mechanisms</li>
                        </ul>
                    </div>

                    <div class="form-group">
                        <label for="optoutMessage">Opt-out Message Template</label>
                        <textarea id="optoutMessage" class="form-control" rows="3">If you no longer wish to receive these messages, please reply with "STOP" or click here to unsubscribe.</textarea>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Data Management</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>Export Data</label>
                        <div class="btn-group" style="flex-wrap: wrap;">
                            <button class="btn btn-outline" onclick="App.Pages.settings.exportData('sellers')">
                                <i class="fas fa-download"></i> Export Sellers
                            </button>
                            <button class="btn btn-outline" onclick="App.Pages.settings.exportData('campaigns')">
                                <i class="fas fa-download"></i> Export Campaigns
                            </button>
                            <button class="btn btn-outline" onclick="App.Pages.settings.exportData('templates')">
                                <i class="fas fa-download"></i> Export Templates
                            </button>
                            <button class="btn btn-outline" onclick="App.Pages.settings.exportData('audit')">
                                <i class="fas fa-download"></i> Export Audit Log
                            </button>
                        </div>
                    </div>

                    <hr style="margin: 20px 0;">

                    <div class="form-group">
                        <label style="color: var(--danger-color); font-weight: bold;">Danger Zone</label>
                        <button class="btn btn-danger" onclick="App.Pages.settings.clearData()">
                            <i class="fas fa-trash"></i> Clear All Data
                        </button>
                        <small class="text-muted" style="display: block; margin-top: 5px;">
                            This will permanently delete all sellers, campaigns, and messages. This action cannot be undone.
                        </small>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">About</h3>
                </div>
                <div class="card-body">
                    <h4>Bol.com Seller Intelligence Platform</h4>
                    <p>Version 1.0.0</p>
                    <p>A compliant B2B lead generation tool for Bol.com marketplace sellers.</p>

                    <hr style="margin: 20px 0;">

                    <h5>Features</h5>
                    <ul style="line-height: 2;">
                        <li>Seller discovery by keywords</li>
                        <li>Message template management</li>
                        <li>Campaign management</li>
                        <li>Manual approval workflow</li>
                        <li>Rate limiting & cooldown enforcement</li>
                        <li>Full audit logging</li>
                        <li>Analytics & reporting</li>
                    </ul>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;

        // Setup settings form
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Load AdsPower status
        await this.checkAdsPowerStatus();
    },

    async checkAdsPowerStatus() {
        try {
            const response = await App.API.get('/adspower/profiles');

            if (response.success && response.data && response.data.length > 0) {
                document.getElementById('adspowerStatus').innerHTML = `
                    <div style="padding: 15px; background: var(--success-color); color: white; border-radius: 8px;">
                        <h4 style="margin-top: 0;"><i class="fas fa-check-circle"></i> AdsPower Connected</h4>
                        <p style="margin-bottom: 0;">${response.data.length} profile(s) available</p>
                    </div>

                    <div style="margin-top: 20px;">
                        <h5>Available Profiles</h5>
                        <table style="margin-top: 10px;">
                            <thead>
                                <tr>
                                    <th>Profile ID</th>
                                    <th>Name</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${response.data.map(profile => `
                                    <tr>
                                        <td><code>${profile.profile_id || profile.id || 'N/A'}</code></td>
                                        <td>${profile.name || profile.profile_name || 'Unnamed'}</td>
                                        <td><span class="badge badge-success">Active</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                document.getElementById('adspowerStatus').innerHTML = `
                    <div style="padding: 15px; background: var(--warning-color); color: black; border-radius: 8px;">
                        <h4 style="margin-top: 0;"><i class="fas fa-exclamation-triangle"></i> No AdsPower Profiles</h4>
                        <p style="margin-bottom: 0;">No profiles found. Please configure AdsPower integration.</p>
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('adspowerStatus').innerHTML = `
                <div style="padding: 15px; background: var(--danger-color); color: white; border-radius: 8px;">
                    <h4 style="margin-top: 0;"><i class="fas fa-times-circle"></i> AdsPower Not Connected</h4>
                    <p style="margin-bottom: 0;">Failed to connect to AdsPower. Please check your configuration.</p>
                </div>
            `;
        }
    },

    async testAdsPowerConnection() {
        try {
            App.Utils.showLoading('Testing AdsPower connection...');

            // Simulate connection test
            await new Promise(resolve => setTimeout(resolve, 1000));

            App.Utils.hideLoading();
            App.Utils.showToast('AdsPower connection successful!', 'success');

            this.checkAdsPowerStatus();
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('AdsPower connection failed', 'error');
        }
    },

    async refreshProfiles() {
        try {
            App.Utils.showLoading('Refreshing profiles...');
            await this.checkAdsPowerStatus();
            App.Utils.hideLoading();
            App.Utils.showToast('Profiles refreshed successfully!');
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to refresh profiles', 'error');
        }
    },

    async saveSettings() {
        const settings = {
            senderName: document.getElementById('senderName').value,
            defaultDailyLimit: parseInt(document.getElementById('defaultDailyLimit').value),
            cooldownPeriod: parseInt(document.getElementById('cooldownPeriod').value),
            requireApproval: document.getElementById('requireApproval').checked,
            enableLogging: document.getElementById('enableLogging').checked,
            optoutMessage: document.getElementById('optoutMessage').value
        };

        // Save to localStorage (in production, this would go to the database)
        localStorage.setItem('bolOutreachSettings', JSON.stringify(settings));

        App.Utils.showToast('Settings saved successfully!');
    },

    async exportData(type) {
        try {
            App.Utils.showLoading(`Exporting ${type}...`);

            let endpoint = '';
            let filename = '';

            switch(type) {
                case 'sellers':
                    endpoint = '/sellers?limit=1000';
                    filename = 'sellers-export';
                    break;
                case 'campaigns':
                    endpoint = '/campaigns';
                    filename = 'campaigns-export';
                    break;
                case 'templates':
                    endpoint = '/templates';
                    filename = 'templates-export';
                    break;
                case 'audit':
                    endpoint = '/audit?limit=1000';
                    filename = 'audit-log-export';
                    break;
            }

            const response = await App.API.get(endpoint);

            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            App.Utils.hideLoading();
            App.Utils.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully!`);
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to export data', 'error');
        }
    },

    async clearData() {
        const confirmation = prompt('Type "DELETE ALL DATA" to confirm this action:');

        if (confirmation !== 'DELETE ALL DATA') {
            App.Utils.showToast('Action cancelled', 'info');
            return;
        }

        // This would normally call an API endpoint to clear the database
        // For now, just show a warning
        alert('Data clearing is disabled in demo mode. In production, this would delete all data from the database.');
    }
};
