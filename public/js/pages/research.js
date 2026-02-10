/**
 * Seller Discovery / Research Page
 * Discover and research Bol.com sellers by keywords
 */

App.Pages.research = {
    researchedSellers: [],

    async load() {
        const content = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Discover Sellers</h3>
                </div>
                <div class="card-body">
                    <form id="researchForm">
                        <div class="form-group">
                            <label for="keywords">Keywords to Search</label>
                            <input type="text" id="keywords" class="form-control" placeholder="Enter keywords separated by commas" required>
                            <small class="text-muted">Example: electronics, gadgets, computers, phones</small>
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
                    <h3 class="card-title">Discovery Progress</h3>
                    <button class="btn btn-outline btn-sm" onclick="App.Pages.research.cancelResearch()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                <div class="card-body">
                    <div class="progress mb-20">
                        <div class="progress-bar" id="researchProgressBar" style="width: 0%"></div>
                    </div>
                    <div id="researchStatus">
                        <p><strong>Status:</strong> <span id="researchStatusText">Initializing...</span></p>
                        <p><strong>Sellers Found:</strong> <span id="sellersFoundCount">0</span></p>
                        <p><strong>Current Keyword:</strong> <span id="currentKeyword">-</span></p>
                    </div>
                </div>
            </div>

            <div class="card" id="resultsCard" style="display: none;">
                <div class="card-header">
                    <h3 class="card-title">Discovered Sellers</h3>
                    <div class="card-actions">
                        <button class="btn btn-success btn-sm" onclick="App.Pages.research.exportResults()">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="App.Pages.research.createCampaign()">
                            <i class="fas fa-bullhorn"></i> Create Campaign
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table id="resultsTable">
                            <thead>
                                <tr>
                                    <th>Shop Name</th>
                                    <th>Keyword</th>
                                    <th>Rating</th>
                                    <th>Products</th>
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
                    <h3 class="card-title">Research Queue</h3>
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

        // Load queue
        this.loadQueue();
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
            maxResults: parseInt(document.getElementById('maxResults').value)
        };

        // Show progress
        document.getElementById('researchProgress').style.display = 'block';

        try {
            App.Utils.showLoading('Starting discovery...');

            // Add to research queue
            await App.API.post('/research/start', { keywords });

            App.Utils.hideLoading();

            // Simulate progress (in real implementation, this would use WebSocket or polling)
            let progress = 0;
            const totalKeywords = keywords.length;
            this.researchedSellers = [];

            for (let i = 0; i < totalKeywords; i++) {
                const keyword = keywords[i];
                document.getElementById('currentKeyword').textContent = keyword;

                // Simulate searching for sellers
                await this.simulateSearch(keyword, options);

                progress = ((i + 1) / totalKeywords) * 100;
                document.getElementById('researchProgressBar').style.width = `${progress}%`;
            }

            document.getElementById('researchStatusText').textContent = 'Completed!';
            App.Utils.showToast(`Discovery completed! Found ${this.researchedSellers.length} sellers`);

            // Show results
            this.displayResults();

        } catch (error) {
            App.Utils.hideLoading();
            document.getElementById('researchProgress').style.display = 'none';
            App.Utils.showToast('Discovery failed: ' + error.message, 'error');
        }
    },

    async simulateSearch(keyword, options) {
        // This is a simulation. In the real implementation, this would:
        // 1. Use puppeteer to search Bol.com
        // 2. Extract seller information from search results
        // 3. Navigate to seller pages
        // 4. Extract contact information
        // 5. Save to database

        const mockSellers = [
            {
                shop_name: `TechStore ${keyword}`,
                shop_url: `https://bol.com/shop/techstore-${keyword}`,
                keyword: keyword,
                seller_id: `techstore-${Math.random().toString(36).substr(2, 9)}`,
                rating: (4 + Math.random()).toFixed(1),
                total_products: Math.floor(Math.random() * 500) + 50,
                status: 'new'
            },
            {
                shop_name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} World`,
                shop_url: `https://bol.com/shop/${keyword}-world`,
                keyword: keyword,
                seller_id: `${keyword}-world-${Math.random().toString(36).substr(2, 9)}`,
                rating: (4 + Math.random()).toFixed(1),
                total_products: Math.floor(Math.random() * 500) + 50,
                status: 'new'
            }
        ];

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Add to results
        this.researchedSellers.push(...mockSellers);

        // Update UI
        document.getElementById('sellersFoundCount').textContent = this.researchedSellers.length;

        // Save to database if option is enabled
        if (options.saveToDb) {
            for (const seller of mockSellers) {
                try {
                    await App.API.post('/sellers', seller);
                } catch (error) {
                    // Seller might already exist
                    console.log('Seller already exists:', seller.shop_name);
                }
            }
        }
    },

    displayResults() {
        document.getElementById('resultsCard').style.display = 'block';

        const tbody = document.getElementById('resultsTableBody');
        tbody.innerHTML = this.researchedSellers.map(seller => `
            <tr>
                <td>
                    <div><strong>${seller.shop_name}</strong></div>
                    <small class="text-muted">${App.Utils.truncate(seller.shop_url, 40)}</small>
                </td>
                <td><span class="badge badge-info">${seller.keyword}</span></td>
                <td>
                    ${seller.rating ? `
                        <span style="color: #ffc107;">
                            <i class="fas fa-star"></i> ${seller.rating}
                        </span>
                    ` : '-'}
                </td>
                <td>${seller.total_products || '-'}</td>
                <td><span class="badge badge-${seller.status === 'new' ? 'primary' : 'success'}">${seller.status}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="App.Pages.research.viewSeller('${seller.seller_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async viewSeller(sellerId) {
        try {
            const response = await App.API.get(`/sellers/${sellerId}`);
            const seller = response.data;

            const content = `
                <div class="seller-details">
                    <h4>${seller.shop_name}</h4>
                    <p><strong>Seller ID:</strong> ${seller.seller_id}</p>
                    <p><strong>Shop URL:</strong> <a href="${seller.shop_url}" target="_blank">${seller.shop_url}</a></p>
                    <p><strong>Keyword:</strong> ${seller.keyword}</p>
                    <p><strong>Rating:</strong> ${seller.rating || '-'}</p>
                    <p><strong>Total Products:</strong> ${seller.total_products || '-'}</p>
                    <p><strong>Status:</strong> ${seller.status}</p>
                    <p><strong>Discovered:</strong> ${App.Utils.formatDate(seller.discovered_at)}</p>
                </div>
            `;

            App.Utils.showModal('Seller Details', content);
        } catch (error) {
            App.Utils.showToast('Failed to load seller details', 'error');
        }
    },

    async loadQueue() {
        try {
            const response = await App.API.get('/research/queue');
            const queue = response.data;

            if (queue.length === 0) {
                document.getElementById('researchQueue').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-list"></i>
                        <h3>No research in queue</h3>
                        <p>Start a new discovery to see results here.</p>
                    </div>
                `;
                return;
            }

            const queueHtml = queue.map(item => `
                <div class="queue-item" style="padding: 15px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${item.keyword}</strong>
                            <span class="badge badge-${item.status === 'completed' ? 'success' : item.status === 'running' ? 'primary' : 'secondary'}" style="margin-left: 10px;">${item.status}</span>
                        </div>
                        <div class="text-muted">
                            ${item.sellers_found || 0} sellers found
                        </div>
                    </div>
                </div>
            `).join('');

            document.getElementById('researchQueue').innerHTML = queueHtml;
        } catch (error) {
            console.error('Failed to load research queue:', error);
        }
    },

    cancelResearch() {
        if (confirm('Are you sure you want to cancel this discovery?')) {
            document.getElementById('researchProgress').style.display = 'none';
            this.researchedSellers = [];
            App.Utils.showToast('Discovery cancelled');
        }
    },

    exportResults() {
        if (this.researchedSellers.length === 0) {
            App.Utils.showToast('No results to export', 'warning');
            return;
        }

        const csv = [
            ['Shop Name', 'Shop URL', 'Keyword', 'Seller ID', 'Rating', 'Products', 'Status'].join(','),
            ...this.researchedSellers.map(s => [
                s.shop_name,
                s.shop_url,
                s.keyword,
                s.seller_id,
                s.rating || '',
                s.total_products || '',
                s.status
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sellers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        App.Utils.showToast('Results exported successfully!');
    },

    createCampaign() {
        if (this.researchedSellers.length === 0) {
            App.Utils.showToast('No sellers to create campaign with', 'warning');
            return;
        }

        // Store sellers and navigate to campaigns page
        sessionStorage.setItem('campaignSellers', JSON.stringify(this.researchedSellers));
        App.Router.navigateTo('campaigns');
    }
};
