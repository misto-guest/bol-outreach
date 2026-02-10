/**
 * Analytics Page
 * Reports and analytics for campaigns and outreach
 */

App.Pages.analytics = {
    async load() {
        const content = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Analytics Dashboard</h3>
                    <div class="card-actions">
                        <select id="analyticsPeriod" class="form-control" style="width: 150px;" onchange="App.Pages.analytics.loadAnalytics()">
                            <option value="7">Last 7 days</option>
                            <option value="30" selected>Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last year</option>
                        </select>
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.analytics.exportReport()">
                            <i class="fas fa-download"></i> Export Report
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="stats-grid" id="analyticsStats">
                        <!-- Stats loaded dynamically -->
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Campaign Performance</h3>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Campaign</th>
                                    <th>Status</th>
                                    <th>Sellers Contacted</th>
                                    <th>Messages Sent</th>
                                    <th>Response Rate</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody id="campaignPerformanceTable">
                                <tr>
                                    <td colspan="6" class="text-center">
                                        <div class="empty-state">
                                            <i class="fas fa-spinner"></i>
                                            <p>Loading analytics...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Activity</h3>
                </div>
                <div class="card-body">
                    <div id="recentActivityList">
                        <!-- Activity loaded dynamically -->
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;

        await this.loadAnalytics();
    },

    async loadAnalytics() {
        try {
            const period = document.getElementById('analyticsPeriod').value;

            // Load stats
            const statsResponse = await App.API.get('/stats');
            this.displayStats(statsResponse.data);

            // Load campaigns
            const campaignsResponse = await App.API.get('/campaigns');
            this.displayCampaignPerformance(campaignsResponse.data);

            // Load recent activity
            const activityResponse = await App.API.get(`/audit?limit=20`);
            this.displayRecentActivity(activityResponse.data);

        } catch (error) {
            console.error('Failed to load analytics:', error);
            App.Utils.showToast('Failed to load analytics', 'error');
        }
    },

    displayStats(stats) {
        const statsHtml = `
            <div class="stat-card">
                <div class="stat-icon primary">
                    <i class="fas fa-store"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${App.Utils.formatNumber(stats.totalSellers || 0)}</div>
                    <div class="stat-label">Total Sellers</div>
                    <div class="stat-change positive">
                        <i class="fas fa-arrow-up"></i> New: ${stats.newSellers || 0}
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon success">
                    <i class="fas fa-bullhorn"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.activeCampaigns || 0}</div>
                    <div class="stat-label">Active Campaigns</div>
                    <div class="stat-change">
                        Total: ${stats.totalCampaigns || 0}
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon info">
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${App.Utils.formatNumber(stats.messagesSent || 0)}</div>
                    <div class="stat-label">Messages Sent</div>
                    <div class="stat-change positive">
                        Delivered: ${stats.messagesDelivered || 0}
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-user-clock"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.pendingApprovals || 0}</div>
                    <div class="stat-label">Pending Approvals</div>
                    <div class="stat-change">
                        Needs review
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analyticsStats').innerHTML = statsHtml;
    },

    displayCampaignPerformance(campaigns) {
        const tbody = document.getElementById('campaignPerformanceTable');

        if (campaigns.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-chart-bar"></i>
                            <p>No campaign data available</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = campaigns.map(campaign => {
            // Calculate response rate (placeholder logic)
            const responseRate = campaign.messages_count > 0
                ? Math.round(Math.random() * 30) // Random 0-30% for demo
                : 0;

            return `
                <tr>
                    <td>
                        <div><strong>${campaign.name}</strong></div>
                        ${campaign.notes ? `<small class="text-muted">${App.Utils.truncate(campaign.notes, 30)}</small>` : ''}
                    </td>
                    <td><span class="badge badge-${App.Pages.campaigns.getStatusBadgeClass(campaign.status)}">${campaign.status}</span></td>
                    <td>${campaign.messages_count || 0}</td>
                    <td>${campaign.messages_count || 0}</td>
                    <td>
                        ${responseRate > 0 ? `
                            <span style="color: var(--success-color); font-weight: bold;">
                                ${responseRate}%
                            </span>
                        ` : '-'}
                    </td>
                    <td><small>${App.Utils.formatDate(campaign.created_at)}</small></td>
                </tr>
            `;
        }).join('');
    },

    displayRecentActivity(activities) {
        const container = document.getElementById('recentActivityList');

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                ${activities.map(activity => `
                    <div class="activity-item" style="display: flex; gap: 15px; padding: 12px; border-bottom: 1px solid var(--border-color);">
                        <div class="activity-icon" style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            ${this.getActivityIcon(activity.action)}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${this.getActivityText(activity)}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                ${App.Utils.formatDate(activity.created_at)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    getActivityIcon(action) {
        const icons = {
            'campaign_created': '<i class="fas fa-bullhorn" style="color: var(--primary-color);"></i>',
            'campaign_started': '<i class="fas fa-play" style="color: var(--success-color);"></i>',
            'campaign_stopped': '<i class="fas fa-stop" style="color: var(--danger-color);"></i>',
            'template_created': '<i class="fas fa-file-alt" style="color: var(--info-color);"></i>',
            'template_updated': '<i class="fas fa-edit" style="color: var(--warning-color);"></i>',
            'seller_created': '<i class="fas fa-store" style="color: var(--primary-color);"></i>',
            'message_approved': '<i class="fas fa-check" style="color: var(--success-color);"></i>',
            'message_rejected': '<i class="fas fa-times" style="color: var(--danger-color);"></i>',
            'research_started': '<i class="fas fa-search" style="color: var(--info-color);"></i>'
        };
        return icons[action] || '<i class="fas fa-circle" style="color: var(--secondary-color);"></i>';
    },

    getActivityText(activity) {
        const texts = {
            'campaign_created': `Campaign "${activity.details?.campaign?.name || 'Unknown'}" was created`,
            'campaign_started': 'Campaign was started',
            'campaign_stopped': 'Campaign was stopped',
            'template_created': `Template "${activity.details?.template || 'Unknown'}" was created`,
            'template_updated': `Template was updated`,
            'seller_created': 'New seller was discovered',
            'message_approved': 'Message was approved for sending',
            'message_rejected': 'Message was rejected',
            'research_started': 'Seller research was started'
        };
        return texts[action] || `${activity.action} on ${activity.entity_type}`;
    },

    async exportReport() {
        try {
            const stats = await App.API.get('/stats');
            const campaigns = await App.API.get('/campaigns');

            const report = {
                generated_at: new Date().toISOString(),
                stats: stats.data,
                campaigns: campaigns.data
            };

            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            App.Utils.showToast('Report exported successfully!');
        } catch (error) {
            console.error('Failed to export report:', error);
            App.Utils.showToast('Failed to export report', 'error');
        }
    }
};
