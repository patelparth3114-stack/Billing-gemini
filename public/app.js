// Main App Logic

const App = {
    state: {
        currentPage: 'billing',
        settings: {}
    },

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadSettings();
        this.handleRoute();
        
        // Listen for hash changes for routing
        window.addEventListener('hashchange', () => this.handleRoute());
    },

    cacheDOM() {
        this.sidebar = document.getElementById('sidebar');
        this.mobileMenuOpen = document.getElementById('mobile-menu-open');
        this.mobileMenuClose = document.getElementById('mobile-menu-close');
        this.navItems = document.querySelectorAll('.nav-item');
        this.pageContainer = document.getElementById('page-container');
        this.toastContainer = document.getElementById('toast-container');
        
        // Modal
        this.confirmModal = document.getElementById('confirm-modal');
        this.confirmTitle = document.getElementById('confirm-title');
        this.confirmMessage = document.getElementById('confirm-message');
        this.confirmOkBtn = document.getElementById('confirm-ok');
        this.confirmCancelBtn = document.getElementById('confirm-cancel');
    },

    bindEvents() {
        if (this.mobileMenuOpen) {
            this.mobileMenuOpen.addEventListener('click', () => {
                this.sidebar.classList.add('open');
            });
        }
        
        if (this.mobileMenuClose) {
            this.mobileMenuClose.addEventListener('click', () => {
                this.sidebar.classList.remove('open');
            });
        }

        // Close sidebar on mobile when a nav item is clicked
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.sidebar.classList.remove('open');
                }
            });
        });

        if (this.confirmCancelBtn) {
            this.confirmCancelBtn.addEventListener('click', () => this.closeConfirmModal());
        }
    },

    async loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.success) {
                this.state.settings = data.data;
                this.updateBranding();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },

    updateBranding() {
        const logoArea = document.getElementById('sidebar-logo-area');
        if (this.state.settings.logo_base64) {
            logoArea.innerHTML = \`<img src="\${this.state.settings.logo_base64}" alt="Logo" style="max-height: 40px; max-width: 100%;">\`;
        } else if (this.state.settings.shop_name) {
            logoArea.innerHTML = \`<h1 class="logo-text">\${this.state.settings.shop_name.split(' ')[0]}</h1>\`;
        }
    },

    handleRoute() {
        const hash = window.location.hash || '#/billing';
        const page = hash.replace('#/', '').split('?')[0]; // Get base page name
        
        if (this.state.currentPage !== page) {
            this.state.currentPage = page;
        }

        this.updateNav(page);
        this.loadPage(page);
    },

    updateNav(page) {
        this.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
    },

    async loadPage(page) {
        this.pageContainer.innerHTML = '<div class="loading-skeleton"></div><div class="loading-skeleton" style="width: 80%"></div><div class="loading-skeleton" style="width: 90%"></div>';
        
        try {
            // Call the specific page module's render function
            // Assuming each page module exposes a global object like InventoryPage, BillingPage, etc.
            const pageModuleName = page.charAt(0).toUpperCase() + page.slice(1) + 'Page';
            
            if (window[pageModuleName] && typeof window[pageModuleName].render === 'function') {
                const html = await window[pageModuleName].render();
                this.pageContainer.innerHTML = html;
                
                if (typeof window[pageModuleName].init === 'function') {
                    // Slight delay to ensure DOM is updated
                    setTimeout(() => window[pageModuleName].init(), 0);
                }
            } else {
                this.pageContainer.innerHTML = \`
                    <div class="card">
                        <h2>Page Not Found</h2>
                        <p>The requested module \${pageModuleName} is not available.</p>
                    </div>
                \`;
            }
        } catch (error) {
            console.error('Error loading page:', error);
            this.pageContainer.innerHTML = \`
                <div class="card">
                    <h2 style="color: var(--danger)">Error Loading Page</h2>
                    <p>\${error.message}</p>
                </div>
            \`;
        }
    },

    // Utilities
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = \`toast \${type}\`;
        toast.innerHTML = \`
            <span>\${type === 'success' ? '✅' : '❌'}</span>
            <span>\${message}</span>
        \`;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    confirm(title, message) {
        return new Promise((resolve) => {
            this.confirmTitle.textContent = title;
            this.confirmMessage.textContent = message;
            this.confirmModal.classList.add('show');
            
            const handleOk = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                this.confirmModal.classList.remove('show');
                this.confirmOkBtn.removeEventListener('click', handleOk);
                this.confirmCancelBtn.removeEventListener('click', handleCancel);
            };
            
            this.confirmOkBtn.addEventListener('click', handleOk);
            this.confirmCancelBtn.addEventListener('click', handleCancel);
        });
    },

    closeConfirmModal() {
        this.confirmModal.classList.remove('show');
    },

    formatCurrency(amount) {
        return '₹ ' + parseFloat(amount).toFixed(2);
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return \`\${day}-\${month}-\${year}\`;
    },
    
    getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return \`\${year}-\${month}-\${day}\`;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
