/**
 * Sellers Page
 * View and manage discovered sellers
 */

App.Pages.sellers = {
    currentSellers: [],

    async load() {
        const content = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Seller Management</h3>
                    <div class="card-actions">
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.sellers.loadSellers()">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="search-bar">
                        <input type="text" id="sellerSearch" class="form-control search-input" placeholder="Search sellers...">
                        <select id="sellerStatusFilter" class="form-control" style="width: 150px;">
                            <option value="">All Status</option>
                            <option value="new">New</option>
                            <option value="researched">Researched</option>
                            <option value="contacted">Contacted</option>
                            <option value="responded">Responded</option>
                        </select>
                        <button class="btn btn-primary" onclick="App.Pages.sellers.search()">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>

                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Shop Name</th>
                                    <th>Keyword</th>
                                    <th>Rating</th>
                                    <th>Products</th>
                                    <th>Status</th>
                                    <th>Discovered</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="sellersTableBody">
                                <tr>
                                    <td colspan="7" class="text-center">
                                        <div class="empty-state">
                                            <i class="fas fa-spinner"></i>
                                            <p>Loading sellers...</p>
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

        // Setup search on Enter
        document.getElementById('sellerSearch').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.search();
            }
        });

        // Load sellers
        await this.loadSellers();
    },

    async loadSellers() {
        try {
            App.Utils.showLoading('Loading sellers...');

            const status = document.getElementById('sellerStatusFilter').value;
            const endpoint = status ? `/sellers?status=${status}&limit=100` : '/sellers?limit=100';

            const response = await App.API.get(endpoint);
            this.currentSellers = response.data;

            this.displaySellers(this.currentSellers);

            App.Utils.hideLoading();
        } catch (error) {
            App.Utils.hideLoading();
            console.error('Failed to load sellers:', error);

            document.getElementById('sellersTableBody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load sellers</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    displaySellers(sellers) {
        const tbody = document.getElementById('sellersTableBody');

        if (sellers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-store"></i>
                            <h3>No sellers found</h3>
                            <p>Try different search criteria or discover new sellers.</p>
                            <button class="btn btn-primary" onclick="App.Router.navigateTo('research')">
                                <i class="fas fa-search"></i> Discover Sellers
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sellers.map(seller => `
            <tr>
                <td>
                    <div><strong>${seller.shop_name || 'Unknown'}</strong></div>
                    <small class="text-muted">${App.Utils.truncate(seller.shop_url || '', 30)}</small>
                </td>
                <td>${seller.keyword ? `<span class="badge badge-info">${seller.keyword}</span>` : '-'}</td>
                <td>
                    ${seller.rating ? `
                        <span style="color: #ffc107;">
                            <i class="fas fa-star"></i> ${seller.rating}
                        </span>
                    ` : '-'}
                </td>
                <td>${seller.total_products || '-'}</td>
                <td><span class="badge badge-${this.getStatusBadgeClass(seller.status)}">${seller.status}</span></td>
                <td><small>${App.Utils.formatDate(seller.discovered_at)}</small></td>
                <td>
                    <div class="btn-group" style="gap: 5px;">
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.sellers.viewSeller(${seller.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.sellers.editSeller(${seller.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getStatusBadgeClass(status) {
        const classes = {
            'new': 'primary',
            'researched': 'info',
            'contacted': 'warning',
            'responded': 'success',
            'opted_out': 'danger'
        };
        return classes[status] || 'secondary';
    },

    async search() {
        const searchTerm = document.getElementById('sellerSearch').value.toLowerCase();
        const statusFilter = document.getElementById('sellerStatusFilter').value;

        let filtered = this.currentSellers;

        if (searchTerm) {
            filtered = filtered.filter(seller =>
                (seller.shop_name && seller.shop_name.toLowerCase().includes(searchTerm)) ||
                (seller.seller_id && seller.seller_id.toLowerCase().includes(searchTerm)) ||
                (seller.keyword && seller.keyword.toLowerCase().includes(searchTerm))
            );
        }

        if (statusFilter) {
            filtered = filtered.filter(seller => seller.status === statusFilter);
        }

        this.displaySellers(filtered);
    },

    async viewSeller(id) {
        try {
            const response = await App.API.get(`/sellers/${id}`);
            const seller = response.data;

            const content = `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px;">${seller.shop_name || 'Unknown Seller'}</h4>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>Seller ID:</strong><br>
                            ${seller.seller_id || '-'}
                        </div>
                        <div>
                            <strong>Status:</strong><br>
                            <span class="badge badge-${this.getStatusBadgeClass(seller.status)}">${seller.status}</span>
                        </div>
                        <div>
                            <strong>Shop URL:</strong><br>
                            ${seller.shop_url ? `<a href="${seller.shop_url}" target="_blank">${App.Utils.truncate(seller.shop_url, 40)}</a>` : '-'}
                        </div>
                        <div>
                            <strong>Keyword:</strong><br>
                            ${seller.keyword || '-'}
                        </div>
                        <div>
                            <strong>Rating:</strong><br>
                            ${seller.rating ? `<span style="color: #ffc107;"><i class="fas fa-star"></i> ${seller.rating}</span>` : '-'}
                        </div>
                        <div>
                            <strong>Total Products:</strong><br>
                            ${seller.total_products || '-'}
                        </div>
                        <div>
                            <strong>Contact Email:</strong><br>
                            ${seller.contact_email || '-'}
                        </div>
                        <div>
                            <strong>Discovered:</strong><br>
                            ${App.Utils.formatDate(seller.discovered_at)}
                        </div>
                    </div>
                </div>

                ${seller.history && seller.history.length > 0 ? `
                    <hr style="margin: 20px 0;">
                    <h5>Outreach History</h5>
                    <div style="margin-top: 10px;">
                        ${seller.history.map(h => `
                            <div style="padding: 10px; background: var(--bg-color); border-radius: 4px; margin-bottom: 10px;">
                                <div><strong>Contacted:</strong> ${App.Utils.formatDate(h.contacted_at)}</div>
                                <div><strong>Status:</strong> ${h.status}</div>
                                ${h.approval_status ? `<div><strong>Approval:</strong> ${h.approval_status}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn btn-primary" onclick="App.Pages.sellers.editSeller(${seller.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${seller.status === 'new' ? `
                        <button class="btn btn-success" onclick="App.Pages.sellers.markAsResearched(${seller.id})">
                            <i class="fas fa-check"></i> Mark as Researched
                        </button>
                    ` : ''}
                </div>
            `;

            App.Utils.showModal('Seller Details', content);
        } catch (error) {
            App.Utils.showToast('Failed to load seller details', 'error');
        }
    },

    async editSeller(id) {
        try {
            const response = await App.API.get(`/sellers/${id}`);
            const seller = response.data;

            const content = `
                <form id="editSellerForm">
                    <div class="form-group">
                        <label for="editShopName">Shop Name</label>
                        <input type="text" id="editShopName" class="form-control" value="${seller.shop_name || ''}" required>
                    </div>

                    <div class="form-group">
                        <label for="editShopUrl">Shop URL</label>
                        <input type="url" id="editShopUrl" class="form-control" value="${seller.shop_url || ''}">
                    </div>

                    <div class="form-group">
                        <label for="editContactEmail">Contact Email</label>
                        <input type="email" id="editContactEmail" class="form-control" value="${seller.contact_email || ''}">
                    </div>

                    <div class="form-group">
                        <label for="editStatus">Status</label>
                        <select id="editStatus" class="form-control">
                            <option value="new" ${seller.status === 'new' ? 'selected' : ''}>New</option>
                            <option value="researched" ${seller.status === 'researched' ? 'selected' : ''}>Researched</option>
                            <option value="contacted" ${seller.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="responded" ${seller.status === 'responded' ? 'selected' : ''}>Responded</option>
                            <option value="opted_out" ${seller.status === 'opted_out' ? 'selected' : ''}>Opted Out</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editNotes">Notes</label>
                        <textarea id="editNotes" class="form-control">${seller.notes || ''}</textarea>
                    </div>
                </form>
            `;

            App.Utils.showModal('Edit Seller', content);

            // Handle form submission
            document.getElementById('editSellerForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const updates = {
                    shop_name: document.getElementById('editShopName').value,
                    shop_url: document.getElementById('editShopUrl').value,
                    contact_email: document.getElementById('editContactEmail').value,
                    status: document.getElementById('editStatus').value,
                    notes: document.getElementById('editNotes').value
                };

                try {
                    App.Utils.showLoading('Updating seller...');
                    await App.API.patch(`/sellers/${id}/status`, { status: updates.status });
                    App.Utils.hideLoading();
                    App.Utils.hideModal();
                    App.Utils.showToast('Seller updated successfully!');
                    this.loadSellers();
                } catch (error) {
                    App.Utils.hideLoading();
                    console.error('Failed to update seller:', error);
                }
            });
        } catch (error) {
            App.Utils.showToast('Failed to load seller', 'error');
        }
    },

    async markAsResearched(id) {
        try {
            await App.API.patch(`/sellers/${id}/status`, { status: 'researched' });
            App.Utils.showToast('Seller marked as researched!');
            this.loadSellers();
        } catch (error) {
            App.Utils.showToast('Failed to update seller', 'error');
        }
    }
};
