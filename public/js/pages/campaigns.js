/**
 * Campaigns Page
 * Create and manage outreach campaigns
 */

App.Pages.campaigns = {
    currentCampaigns: [],

    async load() {
        const content = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Campaign Management</h3>
                    <button class="btn btn-primary" onclick="App.Pages.campaigns.createNewCampaign()">
                        <i class="fas fa-plus"></i> New Campaign
                    </button>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Campaign Name</th>
                                    <th>Status</th>
                                    <th>Template</th>
                                    <th>Messages Sent</th>
                                    <th>Daily Limit</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="campaignsTableBody">
                                <tr>
                                    <td colspan="7" class="text-center">
                                        <div class="empty-state">
                                            <i class="fas fa-spinner"></i>
                                            <p>Loading campaigns...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;

        await this.loadCampaigns();
    },

    async loadCampaigns() {
        try {
            const response = await App.API.get('/campaigns');
            this.currentCampaigns = response.data;
            this.displayCampaigns(this.currentCampaigns);
        } catch (error) {
            console.error('Failed to load campaigns:', error);
            document.getElementById('campaignsTableBody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load campaigns</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    displayCampaigns(campaigns) {
        const tbody = document.getElementById('campaignsTableBody');

        if (campaigns.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-bullhorn"></i>
                            <h3>No campaigns yet</h3>
                            <p>Create your first outreach campaign to get started.</p>
                            <button class="btn btn-primary" onclick="App.Pages.campaigns.createNewCampaign()">
                                <i class="fas fa-plus"></i> Create Campaign
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = campaigns.map(campaign => `
            <tr>
                <td>
                    <div><strong>${campaign.name}</strong></div>
                    ${campaign.notes ? `<small class="text-muted">${App.Utils.truncate(campaign.notes, 40)}</small>` : ''}
                </td>
                <td><span class="badge badge-${this.getStatusBadgeClass(campaign.status)}">${campaign.status}</span></td>
                <td>${campaign.template_name || '-'}</td>
                <td>${campaign.messages_count || 0}</td>
                <td>${campaign.daily_limit || 10}/day</td>
                <td><small>${App.Utils.formatDate(campaign.created_at)}</small></td>
                <td>
                    <div class="btn-group" style="gap: 5px;">
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.campaigns.viewCampaign(${campaign.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${campaign.status === 'draft' ? `
                            <button class="btn btn-success btn-sm" onclick="App.Pages.campaigns.startCampaign(${campaign.id})" title="Start">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                        ${campaign.status === 'active' ? `
                            <button class="btn btn-warning btn-sm" onclick="App.Pages.campaigns.stopCampaign(${campaign.id})" title="Stop">
                                <i class="fas fa-stop"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.campaigns.deleteCampaign(${campaign.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getStatusBadgeClass(status) {
        const classes = {
            'draft': 'secondary',
            'active': 'success',
            'paused': 'warning',
            'stopped': 'danger',
            'completed': 'info'
        };
        return classes[status] || 'secondary';
    },

    async createNewCampaign() {
        const content = `
            <form id="newCampaignForm">
                <div class="form-group">
                    <label for="campaignName">Campaign Name *</label>
                    <input type="text" id="campaignName" class="form-control" placeholder="e.g., Q1 Electronics Outreach" required>
                </div>

                <div class="form-group">
                    <label for="campaignKeywords">Keywords</label>
                    <input type="text" id="campaignKeywords" class="form-control" placeholder="e.g., electronics, gadgets, tech">
                    <small class="text-muted">Comma-separated keywords to target sellers</small>
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
                    <small class="text-muted">Maximum messages per day (rate limiting)</small>
                </div>

                <div class="form-group">
                    <label for="campaignNotes">Notes</label>
                    <textarea id="campaignNotes" class="form-control" placeholder="Campaign notes, goals, etc."></textarea>
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
                this.loadCampaigns();
            } catch (error) {
                App.Utils.hideLoading();
                console.error('Failed to create campaign:', error);
            }
        });
    },

    async viewCampaign(id) {
        try {
            const response = await App.API.get(`/campaigns/${id}`);
            const campaign = response.data;

            const content = `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px;">${campaign.name}</h4>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>Status:</strong><br>
                            <span class="badge badge-${this.getStatusBadgeClass(campaign.status)}">${campaign.status}</span>
                        </div>
                        <div>
                            <strong>Template:</strong><br>
                            ${campaign.template_name || 'None'}
                        </div>
                        <div>
                            <strong>Keywords:</strong><br>
                            ${campaign.keywords || '-'}
                        </div>
                        <div>
                            <strong>Daily Limit:</strong><br>
                            ${campaign.daily_limit || 10} messages/day
                        </div>
                        <div>
                            <strong>Created:</strong><br>
                            ${App.Utils.formatDate(campaign.created_at)}
                        </div>
                        <div>
                            <strong>Messages Sent:</strong><br>
                            ${campaign.messages_count || 0}
                        </div>
                        <div style="grid-column: span 2;">
                            <strong>Notes:</strong><br>
                            ${campaign.notes || 'No notes'}
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                    ${campaign.status === 'draft' ? `
                        <button class="btn btn-success" onclick="App.Pages.campaigns.startCampaign(${campaign.id})">
                            <i class="fas fa-play"></i> Start Campaign
                        </button>
                    ` : ''}
                    ${campaign.status === 'active' ? `
                        <button class="btn btn-warning" onclick="App.Pages.campaigns.stopCampaign(${campaign.id})">
                            <i class="fas fa-stop"></i> Stop Campaign
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="App.Pages.campaigns.editCampaign(${campaign.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>

                ${campaign.outreach && campaign.outreach.length > 0 ? `
                    <hr style="margin: 20px 0;">
                    <h5>Recent Outreach</h5>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${campaign.outreach.slice(0, 10).map(o => `
                            <div style="padding: 10px; background: var(--bg-color); border-radius: 4px; margin-bottom: 10px;">
                                <div><strong>Seller:</strong> ${o.shop_name}</div>
                                <div><strong>Contacted:</strong> ${App.Utils.formatDate(o.contacted_at)}</div>
                                <div><strong>Status:</strong> ${o.status}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;

            App.Utils.showModal('Campaign Details', content);
        } catch (error) {
            App.Utils.showToast('Failed to load campaign details', 'error');
        }
    },

    async startCampaign(id) {
        if (!confirm('Are you sure you want to start this campaign?')) {
            return;
        }

        try {
            App.Utils.showLoading('Starting campaign...');
            await App.API.post(`/campaigns/${id}/start`);
            App.Utils.hideLoading();
            App.Utils.hideModal();
            App.Utils.showToast('Campaign started successfully!');
            this.loadCampaigns();
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to start campaign', 'error');
        }
    },

    async stopCampaign(id) {
        if (!confirm('Are you sure you want to stop this campaign?')) {
            return;
        }

        try {
            App.Utils.showLoading('Stopping campaign...');
            await App.API.post(`/campaigns/${id}/stop`);
            App.Utils.hideLoading();
            App.Utils.hideModal();
            App.Utils.showToast('Campaign stopped successfully!');
            this.loadCampaigns();
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to stop campaign', 'error');
        }
    },

    async editCampaign(id) {
        try {
            const response = await App.API.get(`/campaigns/${id}`);
            const campaign = response.data;

            const content = `
                <form id="editCampaignForm">
                    <div class="form-group">
                        <label for="editCampaignName">Campaign Name</label>
                        <input type="text" id="editCampaignName" class="form-control" value="${campaign.name}" required>
                    </div>

                    <div class="form-group">
                        <label for="editCampaignKeywords">Keywords</label>
                        <input type="text" id="editCampaignKeywords" class="form-control" value="${campaign.keywords || ''}">
                    </div>

                    <div class="form-group">
                        <label for="editCampaignDailyLimit">Daily Limit</label>
                        <input type="number" id="editCampaignDailyLimit" class="form-control" value="${campaign.daily_limit || 10}" min="1" max="100">
                    </div>

                    <div class="form-group">
                        <label for="editCampaignNotes">Notes</label>
                        <textarea id="editCampaignNotes" class="form-control">${campaign.notes || ''}</textarea>
                    </div>
                </form>
            `;

            App.Utils.showModal('Edit Campaign', content);

            document.getElementById('editCampaignForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const updates = {
                    name: document.getElementById('editCampaignName').value,
                    keywords: document.getElementById('editCampaignKeywords').value,
                    daily_limit: parseInt(document.getElementById('editCampaignDailyLimit').value),
                    notes: document.getElementById('editCampaignNotes').value
                };

                try {
                    App.Utils.showLoading('Updating campaign...');
                    await App.API.patch(`/campaigns/${id}`, updates);
                    App.Utils.hideLoading();
                    App.Utils.hideModal();
                    App.Utils.showToast('Campaign updated successfully!');
                    this.loadCampaigns();
                } catch (error) {
                    App.Utils.hideLoading();
                    App.Utils.showToast('Failed to update campaign', 'error');
                }
            });
        } catch (error) {
            App.Utils.showToast('Failed to load campaign', 'error');
        }
    },

    async deleteCampaign(id) {
        if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            return;
        }

        try {
            App.Utils.showLoading('Deleting campaign...');
            await App.API.delete(`/campaigns/${id}`);
            App.Utils.hideLoading();
            App.Utils.showToast('Campaign deleted successfully!');
            this.loadCampaigns();
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to delete campaign', 'error');
        }
    }
};
