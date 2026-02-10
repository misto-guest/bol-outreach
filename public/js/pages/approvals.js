/**
 * Approval Queue Page
 * Manual approval workflow for outreach messages
 */

App.Pages.approvals = {
    currentApprovals: [],

    async load() {
        const content = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Approval Queue</h3>
                    <div class="card-actions">
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.approvals.loadApprovals()">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                        <button class="btn btn-success btn-sm" onclick="App.Pages.approvals.batchApprove()">
                            <i class="fas fa-check-double"></i> Batch Approve All
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="approvalsContainer">
                        <div class="empty-state">
                            <i class="fas fa-spinner"></i>
                            <p>Loading approval queue...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;

        await this.loadApprovals();
    },

    async loadApprovals() {
        try {
            const response = await App.API.get('/approvals');
            this.currentApprovals = response.data;
            this.displayApprovals(this.currentApprovals);
        } catch (error) {
            console.error('Failed to load approvals:', error);
            document.getElementById('approvalsContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load approval queue</p>
                </div>
            `;
        }
    },

    displayApprovals(approvals) {
        const container = document.getElementById('approvalsContainer');

        if (approvals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-double"></i>
                    <h3>No pending approvals</h3>
                    <p>All messages have been reviewed. Great job!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="approval-summary" style="margin-bottom: 20px; padding: 15px; background: var(--primary-light); border-radius: 8px;">
                <h4 style="margin: 0;">${approvals.length} message(s) awaiting approval</h4>
                <p style="margin: 5px 0 0 0; color: var(--text-secondary);">Review each message carefully before approving</p>
            </div>

            <div class="approvals-list">
                ${approvals.map(approval => this.renderApprovalCard(approval)).join('')}
            </div>
        `;
    },

    renderApprovalCard(approval) {
        return `
            <div class="approval-card" style="border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 20px; overflow: hidden;">
                <div class="card-header" style="padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="margin: 0;">${approval.shop_name || 'Unknown Seller'}</h4>
                            <small class="text-muted">Campaign: ${approval.campaign_name}</small>
                        </div>
                        <span class="badge badge-warning">Pending Review</span>
                    </div>
                </div>

                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <strong>Seller:</strong><br>
                            ${approval.shop_name || '-'}
                        </div>
                        <div>
                            <strong>Shop URL:</strong><br>
                            ${approval.shop_url ? `<a href="${approval.shop_url}" target="_blank">${App.Utils.truncate(approval.shop_url, 40)}</a>` : '-'}
                        </div>
                        <div>
                            <strong>Queued:</strong><br>
                            ${App.Utils.formatDate(approval.created_at)}
                        </div>
                        <div>
                            <strong>Status:</strong><br>
                            ${approval.status}
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <strong>Message to be sent:</strong>
                        <div style="margin-top: 10px; padding: 15px; background: var(--bg-color); border-radius: 4px; border-left: 4px solid var(--primary-color);">
                            ${this.formatMessage(approval.message_sent)}
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-success" onclick="App.Pages.approvals.approve(${approval.id})">
                            <i class="fas fa-check"></i> Approve & Send
                        </button>
                        <button class="btn btn-danger" onclick="App.Pages.approvals.reject(${approval.id})">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="btn btn-outline" onclick="App.Pages.approvals.skip(${approval.id})">
                            <i class="fas fa-forward"></i> Skip for Now
                        </button>
                        <button class="btn btn-outline" onclick="App.Pages.approvals.viewSeller(${approval.seller_id})">
                            <i class="fas fa-eye"></i> View Seller
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    formatMessage(message) {
        if (!message) return '<em class="text-muted">No message content</em>';

        // Convert line breaks to <br>
        return message.replace(/\n/g, '<br>');
    },

    async approve(id) {
        if (!confirm('Are you sure you want to approve this message? It will be sent to the seller.')) {
            return;
        }

        try {
            App.Utils.showLoading('Approving message...');
            await App.API.post(`/approvals/${id}/approve`, { approvedBy: App.State.user.name });
            App.Utils.hideLoading();
            App.Utils.showToast('Message approved and will be sent!');
            this.loadApprovals();
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to approve message', 'error');
        }
    },

    async reject(id) {
        const reason = prompt('Reason for rejection (optional):');

        if (reason === null) {
            return; // User cancelled
        }

        try {
            App.Utils.showLoading('Rejecting message...');
            await App.API.post(`/approvals/${id}/reject`, {
                rejectedBy: App.State.user.name,
                reason: reason
            });
            App.Utils.hideLoading();
            App.Utils.showToast('Message rejected');
            this.loadApprovals();
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to reject message', 'error');
        }
    },

    skip(id) {
        // Remove from current view but keep in queue
        this.currentApprovals = this.currentApprovals.filter(a => a.id !== id);
        this.displayApprovals(this.currentApprovals);
        App.Utils.showToast('Skipped - message remains in queue');
    },

    async batchApprove() {
        if (this.currentApprovals.length === 0) {
            App.Utils.showToast('No messages to approve', 'info');
            return;
        }

        const count = this.currentApprovals.length;
        if (!confirm(`Are you sure you want to approve all ${count} messages? This will send all messages immediately.`)) {
            return;
        }

        try {
            App.Utils.showLoading(`Approving ${count} messages...`);

            const promises = this.currentApprovals.map(approval =>
                App.API.post(`/approvals/${approval.id}/approve`, { approvedBy: App.State.user.name })
            );

            await Promise.all(promises);

            App.Utils.hideLoading();
            App.Utils.showToast(`All ${count} messages approved successfully!`);
            this.loadApprovals();
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to batch approve messages', 'error');
        }
    },

    async viewSeller(sellerId) {
        try {
            const response = await App.API.get(`/sellers/${sellerId}`);
            const seller = response.data;

            const content = `
                <h4>${seller.shop_name || 'Unknown Seller'}</h4>
                <p><strong>Seller ID:</strong> ${seller.seller_id || '-'}</p>
                <p><strong>Shop URL:</strong> <a href="${seller.shop_url}" target="_blank">${seller.shop_url || '-'}</a></p>
                <p><strong>Keyword:</strong> ${seller.keyword || '-'}</p>
                <p><strong>Rating:</strong> ${seller.rating || '-'}</p>
                <p><strong>Total Products:</strong> ${seller.total_products || '-'}</p>
                <p><strong>Status:</strong> ${seller.status}</p>
                <p><strong>Contact Email:</strong> ${seller.contact_email || '-'}</p>
                <p><strong>Discovered:</strong> ${App.Utils.formatDate(seller.discovered_at)}</p>
            `;

            App.Utils.showModal('Seller Details', content);
        } catch (error) {
            App.Utils.showToast('Failed to load seller details', 'error');
        }
    }
};
