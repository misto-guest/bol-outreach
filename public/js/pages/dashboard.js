/**
 * Dashboard Page
 * Main overview with stats and quick actions
 */

App.Pages.dashboard = {
    async load() {
        const content = `
            <div class="stats-grid" id="statsGrid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="totalSellers">-</div>
                        <div class="stat-label">Total Sellers</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-bullhorn"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="activeCampaigns">-</div>
                        <div class="stat-label">Active Campaigns</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-check-double"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="pendingApprovals">-</div>
                        <div class="stat-label">Pending Approvals</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon info">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value" id="messagesSent">-</div>
                        <div class="stat-label">Messages Sent</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Quick Actions</h3>
                </div>
                <div class="card-body">
                    <div class="btn-group" style="flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="App.Router.navigateTo('research')">
                            <i class="fas fa-search"></i> Discover Sellers
                        </button>
                        <button class="btn btn-success" onclick="App.Pages.dashboard.createNewCampaign()">
                            <i class="fas fa-plus"></i> New Campaign
                        </button>
                        <button class="btn btn-info" onclick="App.Router.navigateTo('approvals')">
                            <i class="fas fa-check-double"></i> Review Queue
                        </button>
                        <button class="btn btn-secondary" onclick="App.Router.navigateTo('templates')">
                            <i class="fas fa-file-alt"></i> Manage Templates
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Activity</h3>
                    <button class="btn btn-outline btn-sm" onclick="App.Router.navigateTo('analytics')">
                        View All <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="card-body">
                    <div id="recentActivity">
                        <div class="empty-state">
                            <i class="fas fa-history"></i>
                            <h3>No recent activity</h3>
                            <p>Start by discovering sellers or creating a campaign.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">System Status</h3>
                </div>
                <div class="card-body">
                    <div id="systemStatus">
                        <div class="status mb-10">
                            <span class="status-dot active"></span>
                            <span>Database: Connected</span>
                        </div>
                        <div class="status mb-10">
                            <span class="status-dot" id="adspowerStatus"></span>
                            <span>AdsPower: <span id="adspowerStatusText">Checking...</span></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;

        // Load stats
        await this.loadStats();

        // Load recent activity
        await this.loadRecentActivity();

        // Check AdsPower status
        await this.checkAdsPowerStatus();
    },

    async loadStats() {
        try {
            const response = await App.API.get('/stats');
            this.updateStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },

    updateStats(stats) {
        document.getElementById('totalSellers').textContent = App.Utils.formatNumber(stats.totalSellers || 0);
        document.getElementById('activeCampaigns').textContent = stats.activeCampaigns || 0;
        document.getElementById('pendingApprovals').textContent = stats.pendingApprovals || 0;
        document.getElementById('messagesSent').textContent = App.Utils.formatNumber(stats.messagesSent || 0);
    },

    async loadRecentActivity() {
        try {
            const response = await App.API.get('/audit?limit=10');
            const activities = response.data;

            if (activities.length === 0) {
                return;
            }

            const activityHtml = activities.map(activity => {
                const icon = this.getActivityIcon(activity.action);
                const text = this.getActivityText(activity);

                return `
                    <div class="activity-item">
                        <div class="activity-icon">${icon}</div>
                        <div class="activity-content">
                            <div class="activity-text">${text}</div>
                            <div class="activity-time">${App.Utils.formatDate(activity.created_at)}</div>
                        </div>
                    </div>
                `;
            }).join('');

            document.getElementById('recentActivity').innerHTML = activityHtml;
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    },

    getActivityIcon(action) {
        const icons = {
            'campaign_created': '<i class="fas fa-bullhorn"></i>',
            'campaign_started': '<i class="fas fa-play"></i>',
            'template_created': '<i class="fas fa-file-alt"></i>',
            'seller_created': '<i class="fas fa-store"></i>',
            'message_approved': '<i class="fas fa-check"></i>',
            'message_rejected': '<i class="fas fa-times"></i>',
            'research_started': '<i class="fas fa-search"></i>'
        };
        return icons[action] || '<i class="fas fa-circle"></i>';
    },

    getActivityText(activity) {
        const texts = {
            'campaign_created': `Campaign "${activity.details?.campaign?.name || 'Unknown'}" was created`,
            'campaign_started': `Campaign was started`,
            'template_created': `Template "${activity.details?.template || 'Unknown'}" was created`,
            'seller_created': `New seller discovered`,
            'message_approved': `Message was approved for sending`,
            'message_rejected': `Message was rejected`,
            'research_started': `Seller research was started`
        };
        return texts[action] || `${action} on ${activity.entity_type}`;
    },

    async checkAdsPowerStatus() {
        try {
            const response = await App.API.get('/adspower/profiles');
            const statusDot = document.getElementById('adspowerStatus');
            const statusText = document.getElementById('adspowerStatusText');

            if (response.success && response.data && response.data.length > 0) {
                statusDot.classList.add('active');
                statusText.textContent = `${response.data.length} profile(s) available`;
            } else {
                statusDot.classList.add('inactive');
                statusText.textContent = 'No profiles configured';
            }
        } catch (error) {
            const statusDot = document.getElementById('adspowerStatus');
            const statusText = document.getElementById('adspowerStatusText');
            statusDot.classList.add('error');
            statusText.textContent = 'Not connected';
        }
    },

    async createNewCampaign() {
        const content = `
            <form id="newCampaignForm">
                <div class="form-group">
                    <label for="campaignName">Campaign Name</label>
                    <input type="text" id="campaignName" class="form-control" placeholder="e.g., Q1 Electronics Outreach" required>
                </div>

                <div class="form-group">
                    <label for="campaignKeywords">Keywords (comma separated)</label>
                    <input type="text" id="campaignKeywords" class="form-control" placeholder="e.g., electronics, gadgets, tech">
                </div>

                <div class="form-group">
                    <label for="campaignTemplate">Message Template</label>
                    <select id="campaignTemplate" class="form-control">
                        <option value="">Select a template...</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="campaignDailyLimit">Daily Limit</label>
                    <input type="number" id="campaignDailyLimit" class="form-control" value="10" min="1" max="100">
                </div>

                <div class="form-group">
                    <label for="campaignNotes">Notes</label>
                    <textarea id="campaignNotes" class="form-control" placeholder="Additional notes..."></textarea>
                </div>
            </form>
        `;

        App.Utils.showModal('Create New Campaign', content);

        // Load templates
        try {
            const response = await App.API.get('/templates');
            const templateSelect = document.getElementById('campaignTemplate');

            response.data.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                templateSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load templates:', error);
        }

        // Handle form submission
        document.getElementById('newCampaignForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const campaignData = {
                name: document.getElementById('campaignName').value,
                keywords: document.getElementById('campaignKeywords').value,
                message_template_id: document.getElementById('campaignTemplate').value || null,
                daily_limit: parseInt(document.getElementById('campaignDailyLimit').value),
                notes: document.getElementById('campaignNotes').value,
                status: 'draft'
            };

            try {
                App.Utils.showLoading('Creating campaign...');
                await App.API.post('/campaigns', campaignData);
                App.Utils.hideLoading();
                App.Utils.hideModal();
                App.Utils.showToast('Campaign created successfully!');
                App.Router.refresh();
            } catch (error) {
                App.Utils.hideLoading();
                console.error('Failed to create campaign:', error);
            }
        });
    }
};
