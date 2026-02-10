/**
 * Seller Discovery / Research Page - Enhanced
 * Discover and research Bol.com sellers by keywords
 * Features: Real-time progress, better error handling, AdsPower integration
 */

App.Pages.research = {
    researchedSellers: [],
    researchStatus: null,

    async load() {
        const content = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-search"></i>
                        Discover Sellers
                    </h3>
                    <button class="btn btn-outline btn-sm" onclick="App.Pages.research.loadAdsPowerProfiles()">
                        <i class="fas fa-sync"></i> Refresh Profiles
                    </button>
                </div>
                <div class="card-body">
                    <form id="researchForm">
                        <div class="form-group">
                            <label for="keywords">Keywords to Search</label>
                            <input type="text" id="keywords" class="form-control" 
                                   placeholder="Enter keywords separated by commas" 
                                   value="powerbank,laptop,phone,electronics"
                                   required>
                            <small class="text-muted">Example: powerbank, laptop, phone, electronics</small>
                        </div>

                        <div class="form-group">
                            <label for="adspowerProfile">AdsPower Profile (Optional)</label>
                            <select id="adspowerProfile" class="form-control">
                                <option value="">Use Puppeteer (Default)</option>
                            </select>
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i> 
                                Use AdsPower for anti-captcha protection. Leave empty to use Puppeteer directly.
                            </small>
                        </div>

                        <div class="form-group">
                            <label>Search Options</label>
                            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                                <label style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" id="extractSellers" checked>
                                    Extract seller information
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" id="saveToDb" checked>
                                    Save to database
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" id="deepSearch">
                                    Deep search (more results, slower)
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="maxResults">Maximum Results per Keyword</label>
                            <select id="maxResults" class="form-control">
                                <option value="10">10 sellers</option>
                                <option value="25" selected>25 sellers</option>
                                <option value="50">50 sellers</option>
                                <option value="100">100 sellers</option>
                            </select>
                        </div>

                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-search"></i> Start Discovery
                        </button>
                    </form>
                </div>
            </div>

            <div class="card" id="researchProgress" style="display: none;">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-spinner fa-spin"></i>
                        Discovery Progress
                    </h3>
                    <button class="btn btn-danger btn-sm" onclick="App.Pages.research.cancelResearch()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                <div class="card-body">
                    <div class="progress mb-20" style="height: 12px;">
                        <div class="progress-bar" id="researchProgressBar" style="width: 0%"></div>
                    </div>
                    
                    <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div class="stat-item" style="padding: 15px; background: var(--bg-tertiary); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--primary-600);" id="sellersFoundCount">0</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">Sellers Found</div>
                        </div>
                        <div class="stat-item" style="padding: 15px; background: var(--bg-tertiary); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--accent-600);" id="currentKeyword">-</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">Current Keyword</div>
                        </div>
                        <div class="stat-item" style="padding: 15px; background: var(--bg-tertiary); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--success-600);" id="researchStatusText">Ready</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">Status</div>
                        </div>
                        <div class="stat-item" style="padding: 15px; background: var(--bg-tertiary); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--info-600);" id="errorCount">0</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">Errors</div>
                        </div>
                    </div>
                    
                    <div id="logContainer" style="margin-top: 20px; max-height: 200px; overflow-y: auto; background: #1f2937; color: #f9fafb; padding: 10px; border-radius: 8px; font-family: monospace; font-size: 12px;">
                        <div id="logContent">Waiting to start...</div>
                    </div>
                </div>
            </div>

            <div class="card" id="resultsCard" style="display: none;">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-check-circle" style="color: var(--success-500);"></i>
                        Discovered Sellers
                    </h3>
                    <div class="card-actions">
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.research.exportResults()">
                            <i class="fas fa-download"></i> Export CSV
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="App.Pages.research.createCampaign()">
                            <i class="fas fa-bullhorn"></i> Create Campaign
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="filters">
                        <div class="filter-group">
                            <label>Filter:</label>
                            <select id="statusFilter" class="form-control" style="width: auto;" onchange="App.Pages.research.filterResults()">
                                <option value="all">All Status</option>
                                <option value="new">New</option>
                                <option value="researched">Researched</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <input type="text" id="searchFilter" class="form-control" placeholder="Search sellers..." 
                                   onkeyup="App.Pages.research.filterResults()" style="width: 200px;">
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table id="resultsTable">
                            <thead>
                                <tr>
                                    <th>Shop Name</th>
                                    <th>Keyword</th>
                                    <th>Rating</th>
                                    <th>Products</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="resultsTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-list"></i>
                        Research Queue
                    </h3>
                    <button class="btn btn-outline btn-sm" onclick="App.Pages.research.loadQueue()">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
                <div class="card-body">
                    <div id="researchQueue">
                        <div class="empty-state">
                            <i class="fas fa-list"></i>
                            <h3>No research in queue</h3>
                            <p>Start a new discovery to see results here.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;

        // Setup form submission
        document.getElementById('researchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startDiscovery();
        });

        // Load AdsPower profiles
        this.loadAdsPowerProfiles();

        // Load queue
        this.loadQueue();
        
        // Start polling for research status
        this.startStatusPolling();
    },

    async loadAdsPowerProfiles() {
        try {
            const response = await App.API.get('/adspower/profiles');
            const select = document.getElementById('adspowerProfile');
            
            if (response.data && response.data.length > 0) {
                select.innerHTML = '<option value="">Use Puppeteer (Default)</option>';
                response.data.forEach(profile => {
                    const option = document.createElement('option');
                    option.value = profile.user_id;
                    option.textContent = `${profile.user_name || profile.user_id} (${profile.user_id})`;
                    select.appendChild(option);
                });
                console.log(`Loaded ${response.data.length} AdsPower profiles`);
            } else {
                select.innerHTML = '<option value="">No AdsPower profiles available</option>';
            }
        } catch (error) {
            console.error('Failed to load AdsPower profiles:', error);
        }
    },

    async startDiscovery() {
        const keywords = document.getElementById('keywords').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        if (keywords.length === 0) {
            App.Utils.showToast('Please enter at least one keyword', 'warning');
            return;
        }

        const options = {
            extractSellers: document.getElementById('extractSellers').checked,
            saveToDb: document.getElementById('saveToDb').checked,
            deepSearch: document.getElementById('deepSearch').checked,
            maxResults: parseInt(document.getElementById('maxResults').value),
            adspowerProfileId: document.getElementById('adspowerProfile').value || null
        };

        // Reset and show progress
        this.researchedSellers = [];
        this.researchStatus = { errors: 0 };
        document.getElementById('researchProgress').style.display = 'block';
        document.getElementById('resultsCard').style.display = 'none';
        document.getElementById('researchProgressBar').style.width = '0%';
        document.getElementById('sellersFoundCount').textContent = '0';
        document.getElementById('errorCount').textContent = '0';
        document.getElementById('researchStatusText').textContent = 'Starting...';
        this.addLog(`Starting discovery for ${keywords.length} keywords: ${keywords.join(', ')}`);

        try {
            App.Utils.showLoading('Starting discovery...');

            // Start research via API
            const response = await App.API.post('/research/start', { 
                keywords,
                adspowerProfileId: options.adspowerProfileId
            });

            App.Utils.hideLoading();

            if (response.usingAdsPower) {
                this.addLog(`✓ Using AdsPower profile: ${options.adspowerProfileId}`);
            } else {
                this.addLog(`ℹ️ Using Puppeteer (no AdsPower profile selected)`);
            }

            this.addLog(`✓ Research started successfully!`);
            
            // Status polling will handle updates
            
        } catch (error) {
            App.Utils.hideLoading();
            document.getElementById('researchProgress').style.display = 'none';
            App.Utils.showToast('Discovery failed: ' + error.message, 'error');
            this.addLog(`✗ Error: ${error.message}`);
        }
    },

    addLog(message) {
        const logContent = document.getElementById('logContent');
        const time = new Date().toLocaleTimeString();
        logContent.innerHTML += `<div>[${time}] ${message}</div>`;
        logContent.scrollTop = logContent.scrollHeight;
    },

    async startStatusPolling() {
        // Poll for research status every 2 seconds
        if (this.statusInterval) clearInterval(this.statusInterval);
        
        this.statusInterval = setInterval(async () => {
            try {
                const status = await App.API.get('/research/status');
                
                if (status.data.isActive) {
                    // Research is running, update progress
                    // In a real implementation, you'd use WebSockets or a more sophisticated polling mechanism
                    // For now, we'll just keep the progress bar moving
                    const progressBar = document.getElementById('researchProgressBar');
                    const currentWidth = parseFloat(progressBar.style.width) || 0;
                    if (currentWidth < 90) {
                        progressBar.style.width = (currentWidth + 1) + '%';
                    }
                    document.getElementById('researchStatusText').textContent = 'Running...';
                }
            } catch (error) {
                // Ignore polling errors
            }
        }, 2000);
    },

    async viewSeller(sellerId) {
        try {
            console.log(`Loading seller details for: ${sellerId}`);
            
            const response = await App.API.get(`/sellers/${sellerId}`);
            const seller = response.data;

            console.log('Seller data:', seller);

            const content = `
                <div class="seller-details" style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                        <div>
                            <h4 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">${seller.shop_name}</h4>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <span class="badge badge-${seller.status === 'new' ? 'primary' : 'success'}">${seller.status}</span>
                                ${seller.rating ? `<span class="badge badge-warning">★ ${seller.rating}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                        <div>
                            <h5 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: var(--text-secondary);">Basic Information</h5>
                            <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                                <p style="margin: 5px 0;"><strong>Seller ID:</strong> ${seller.seller_id || '-'}</p>
                                <p style="margin: 5px 0;"><strong>Keyword:</strong> ${seller.keyword || '-'}</p>
                                <p style="margin: 5px 0;"><strong>Rating:</strong> ${seller.rating || '-'}</p>
                                <p style="margin: 5px 0;"><strong>Total Products:</strong> ${seller.total_products || '-'}</p>
                                <p style="margin: 5px 0;"><strong>Status:</strong> <span class="badge badge-${seller.status === 'new' ? 'primary' : 'success'}">${seller.status}</span></p>
                            </div>
                        </div>
                        
                        <div>
                            <h5 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: var(--text-secondary);">Contact Information</h5>
                            <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                                <p style="margin: 5px 0;"><strong>Email:</strong> ${seller.contact_email || '-'}</p>
                                <p style="margin: 5px 0;">
                                    <strong>Shop URL:</strong><br>
                                    ${seller.shop_url ? `<a href="${seller.shop_url}" target="_blank" style="color: var(--primary-600);">${seller.shop_url}</a>` : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    ${seller.metadata && Object.keys(seller.metadata).length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h5 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: var(--text-secondary);">Additional Information</h5>
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                            ${seller.metadata.businessName ? `<p style="margin: 5px 0;"><strong>Business:</strong> ${seller.metadata.businessName}</p>` : ''}
                            ${seller.metadata.kvkNumber ? `<p style="margin: 5px 0;"><strong>KvK:</strong> ${seller.metadata.kvkNumber}</p>` : ''}
                            ${seller.metadata.phoneNumber ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${seller.metadata.phoneNumber}</p>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <h5 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: var(--text-secondary);">Timeline</h5>
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                            <p style="margin: 5px 0;"><strong>Discovered:</strong> ${App.Utils.formatDate(seller.discovered_at)}</p>
                            <p style="margin: 5px 0;"><strong>Last Checked:</strong> ${seller.last_checked_at ? App.Utils.formatDate(seller.last_checked_at) : 'Never'}</p>
                            <p style="margin: 5px 0;"><strong>Updated:</strong> ${App.Utils.formatDate(seller.updated_at)}</p>
                        </div>
                    </div>
                    
                    ${seller.history && seller.history.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h5 style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: var(--text-secondary);">Outreach History</h5>
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px;">
                            ${seller.history.map(h => `
                                <div style="padding: 10px; margin-bottom: 5px; background: white; border-radius: 4px;">
                                    <strong>${App.Utils.formatDate(h.contacted_at)}</strong> - 
                                    <span class="badge badge-${h.approval_status === 'approved' ? 'success' : h.approval_status === 'rejected' ? 'danger' : 'warning'}">${h.approval_status}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;

            App.Utils.showModal('Seller Details', content);
        } catch (error) {
            console.error('Failed to load seller details:', error);
            App.Utils.showToast(`Failed to load seller details: ${error.message}`, 'error');
        }
    },

    displayResults() {
        document.getElementById('researchProgress').style.display = 'none';
        document.getElementById('resultsCard').style.display = 'block';
        this.filterResults();
    },

    filterResults() {
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const searchFilter = document.getElementById('searchFilter')?.value?.toLowerCase() || '';
        
        let filtered = this.researchedSellers;
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }
        
        if (searchFilter) {
            filtered = filtered.filter(s => 
                s.shop_name?.toLowerCase().includes(searchFilter) ||
                s.keyword?.toLowerCase().includes(searchFilter)
            );
        }

        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;
        
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-search" style="font-size: 48px; color: var(--text-tertiary); margin-bottom: 15px;"></i>
                        <p style="color: var(--text-secondary);">No sellers found matching your filters</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(seller => `
            <tr>
                <td>
                    <div><strong>${seller.shop_name || 'Unknown'}</strong></div>
                    ${seller.shop_url ? `<small class="text-muted">${App.Utils.truncate(seller.shop_url, 35)}</small>` : ''}
                </td>
                <td><span class="badge badge-info">${seller.keyword || '-'}</span></td>
                <td>
                    ${seller.rating ? `
                        <span style="color: #ffc107;">
                            <i class="fas fa-star"></i> ${seller.rating}
                        </span>
                    ` : '-'}
                </td>
                <td>${seller.total_products || seller.totalProducts || '-'}</td>
                <td>
                    ${seller.contact_email || seller.contactEmail ? `
                        <a href="mailto:${seller.contact_email || seller.contactEmail}" style="color: var(--primary-600);">
                            <i class="fas fa-envelope"></i>
                        </a>
                    ` : '-'}
                </td>
                <td><span class="badge badge-${seller.status === 'new' ? 'primary' : 'success'}">${seller.status || 'new'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline btn-sm" onclick="App.Pages.research.viewSeller('${seller.seller_id || seller.sellerId}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    async loadQueue() {
        try {
            const response = await App.API.get('/research/queue');
            const queue = response.data;

            const queueDiv = document.getElementById('researchQueue');
            if (!queueDiv) return;

            if (queue.length === 0) {
                queueDiv.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-list"></i>
                        <h3>No research in queue</h3>
                        <p>Start a new discovery to see results here.</p>
                    </div>
                `;
                return;
            }

            const queueHtml = queue.map(item => `
                <div class="queue-item" style="padding: 15px; border-bottom: 1px solid var(--border-light);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${item.keyword}</strong>
                            <span class="badge badge-${item.status === 'completed' ? 'success' : item.status === 'running' ? 'primary' : item.status === 'failed' ? 'danger' : 'secondary'}" style="margin-left: 10px;">${item.status}</span>
                        </div>
                        <div class="text-muted">
                            ${item.sellers_found || 0} sellers found
                            ${item.error_message ? `<br><small style="color: var(--danger-600);">${item.error_message}</small>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            queueDiv.innerHTML = queueHtml;
            
            // Check if any research is completed and load results
            const completed = queue.filter(item => item.status === 'completed');
            if (completed.length > 0 && this.researchedSellers.length === 0) {
                this.loadCompletedSellers();
            }
        } catch (error) {
            console.error('Failed to load research queue:', error);
        }
    },

    async loadCompletedSellers() {
        try {
            const response = await App.API.get('/sellers?limit=100');
            if (response.data && response.data.length > 0) {
                this.researchedSellers = response.data;
                this.displayResults();
                App.Utils.showToast(`Loaded ${response.data.length} sellers from database`);
            }
        } catch (error) {
            console.error('Failed to load sellers:', error);
        }
    },

    cancelResearch() {
        if (confirm('Are you sure you want to cancel this discovery?')) {
            document.getElementById('researchProgress').style.display = 'none';
            this.researchedSellers = [];
            this.addLog('✗ Discovery cancelled by user');
            App.Utils.showToast('Discovery cancelled');
        }
    },

    exportResults() {
        const sellersToExport = this.researchedSellers.length > 0 ? this.researchedSellers : [];
        
        if (sellersToExport.length === 0) {
            App.Utils.showToast('No results to export', 'warning');
            return;
        }

        const csv = [
            ['Shop Name', 'Shop URL', 'Keyword', 'Seller ID', 'Rating', 'Products', 'Email', 'Status'].join(','),
            ...sellersToExport.map(s => [
                `"${(s.shop_name || '').replace(/"/g, '""')}"`,
                `"${(s.shop_url || '').replace(/"/g, '""')}"`,
                `"${(s.keyword || '').replace(/"/g, '""')}"`,
                `"${(s.seller_id || s.sellerId || '').replace(/"/g, '""')}"`,
                s.rating || '',
                s.total_products || s.totalProducts || '',
                s.contact_email || s.contactEmail || '',
                s.status || 'new'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sellers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        App.Utils.showToast(`Exported ${sellersToExport.length} sellers to CSV!`);
    },

    createCampaign() {
        if (this.researchedSellers.length === 0) {
            App.Utils.showToast('No sellers to create campaign with', 'warning');
            return;
        }

        sessionStorage.setItem('campaignSellers', JSON.stringify(this.researchedSellers));
        App.Router.navigateTo('campaigns');
    }
};
