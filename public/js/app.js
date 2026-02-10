/**
 * Bol.com Seller Intelligence Platform
 * Main Application JavaScript
 */

// API Base URL
const API_BASE = window.location.origin + '/api';

// App State
const AppState = {
    currentPage: 'dashboard',
    data: {},
    user: {
        name: 'Admin User',
        id: 'admin'
    }
};

// Utility Functions
const Utils = {
    // Show loading overlay
    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        overlay.classList.add('active');
    },

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    },

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');

        toastMessage.textContent = message;
        toast.className = `toast ${type} active`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toastIcon.className = `fas ${icons[type] || icons.info}`;

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    },

    // Show modal
    showModal(title, content) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.classList.add('active');

        return modal;
    },

    // Hide modal
    hideModal() {
        document.getElementById('modal').classList.remove('active');
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format number
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    },

    // Truncate text
    truncate(text, length = 50) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Confirm action
    confirm(message) {
        return window.confirm(message);
    }
};

// API Helper
const API = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const defaults = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const config = { ...defaults, ...options };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            Utils.showToast(error.message, 'error');
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint);
    },

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
};

// Page Managers
const Pages = {
    dashboard: null,
    research: null,
    sellers: null,
    campaigns: null,
    approvals: null,
    templates: null,
    analytics: null,
    settings: null
};

// Router
const Router = {
    init() {
        // Handle hash change
        window.addEventListener('hashchange', () => this.handleRoute());

        // Handle initial route
        this.handleRoute();

        // Setup navigation
        this.setupNavigation();

        // Setup modal close
        this.setupModal();

        // Setup toast close
        this.setupToast();
    },

    setupNavigation() {
        // Mobile menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('active');
        });

        document.getElementById('closeSidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('active');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menuToggle');

            if (window.innerWidth <= 768 &&
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) &&
                !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });

        // Nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);

                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('active');
                }
            });
        });
    },

    setupModal() {
        document.getElementById('closeModal').addEventListener('click', () => {
            Utils.hideModal();
        });

        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                Utils.hideModal();
            }
        });
    },

    setupToast() {
        document.getElementById('toastClose').addEventListener('click', () => {
            document.getElementById('toast').classList.remove('active');
        });
    },

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.navigateTo(hash);
    },

    async navigateTo(page) {
        if (!Pages[page]) {
            console.error('Page not found:', page);
            return;
        }

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            research: 'Seller Discovery',
            sellers: 'Sellers',
            campaigns: 'Campaigns',
            approvals: 'Approval Queue',
            templates: 'Message Templates',
            analytics: 'Analytics',
            settings: 'Settings'
        };
        document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

        // Load page content
        AppState.currentPage = page;
        await Pages[page].load();

        // Update URL hash
        window.location.hash = page;
    },

    refresh() {
        const page = AppState.currentPage;
        if (Pages[page]) {
            Pages[page].load();
        }
    }
};

// Stats Updater
const StatsUpdater = {
    interval: null,

    start() {
        this.update();
        this.interval = setInterval(() => this.update(), 30000); // Update every 30 seconds
    },

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },

    async update() {
        try {
            const response = await API.get('/stats');
            AppState.data.stats = response.data;

            // Update approval badge
            if (response.data.pendingApprovals > 0) {
                const badge = document.getElementById('approvalBadge');
                if (badge) {
                    badge.textContent = response.data.pendingApprovals;
                    badge.style.display = 'inline';
                }
            }

            // Update current page if it's dashboard
            if (AppState.currentPage === 'dashboard' && Pages.dashboard) {
                Pages.dashboard.updateStats(response.data);
            }
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Bol.com Seller Intelligence Platform...');

    // Initialize router
    Router.init();

    // Start stats updater
    StatsUpdater.start();

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC to close modal
        if (e.key === 'Escape') {
            Utils.hideModal();
        }

        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });

    console.log('Platform initialized successfully!');
});

// Export for use in other scripts
window.App = {
    State: AppState,
    Utils,
    API,
    Router,
    Pages,
    StatsUpdater
};
