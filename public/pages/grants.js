const GrantsPage = {
    grants: [],
    customers: [],

    async render() {
        return \`
            <div class="page-header">
                <h2>Grants (Advance Payments)</h2>
                <button id="btn-add-grant" class="btn btn-primary">
                    <span>+</span> Add Grant
                </button>
            </div>

            <div class="card" id="add-grant-form-container" style="display: none;">
                <h3>Add New Grant</h3>
                <form id="add-grant-form">
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label for="grant-customer">Customer *</label>
                            <div class="searchable-dropdown">
                                <input type="text" id="grant-customer" placeholder="Type to search customer..." autocomplete="off" required>
                                <input type="hidden" id="grant-customer-id" required>
                                <div id="grant-customer-dropdown" class="dropdown-list"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="grant-date">Date *</label>
                            <input type="date" id="grant-date" required>
                        </div>
                        <div class="form-group">
                            <label for="grant-amount">Amount (₹) *</label>
                            <input type="number" id="grant-amount" step="0.01" min="0" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="grant-notes">Notes</label>
                        <input type="text" id="grant-notes" placeholder="e.g., Advance for school supplies">
                    </div>
                    <div class="form-actions" style="margin-top: 16px;">
                        <button type="submit" class="btn btn-primary">Save Grant</button>
                        <button type="button" id="btn-cancel-add-grant" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>

            <div class="card">
                <div class="table-responsive">
                    <table id="grants-table">
                        <thead>
                            <tr>
                                <th>SR</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th style="text-align: right;">Amount (₹)</th>
                                <th>Notes</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="grants-tbody">
                            <!-- Grants will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        \`;
    },

    async init() {
        this.cacheDOM();
        this.bindEvents();
        document.getElementById('grant-date').value = App.getTodayDate();
        await Promise.all([
            this.loadGrants(),
            this.loadCustomers()
        ]);
    },

    cacheDOM() {
        this.tbody = document.getElementById('grants-tbody');
        this.addFormContainer = document.getElementById('add-grant-form-container');
        this.addForm = document.getElementById('add-grant-form');
        this.btnAddGrant = document.getElementById('btn-add-grant');
        this.btnCancelAdd = document.getElementById('btn-cancel-add-grant');
        
        this.customerInput = document.getElementById('grant-customer');
        this.customerIdInput = document.getElementById('grant-customer-id');
        this.customerDropdown = document.getElementById('grant-customer-dropdown');
    },

    bindEvents() {
        this.btnAddGrant.addEventListener('click', () => {
            this.addFormContainer.style.display = 'block';
            this.customerInput.focus();
        });

        this.btnCancelAdd.addEventListener('click', () => {
            this.addFormContainer.style.display = 'none';
            this.addForm.reset();
            document.getElementById('grant-date').value = App.getTodayDate();
            this.customerIdInput.value = '';
        });

        this.addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddGrant();
        });

        // Customer Search
        this.customerInput.addEventListener('input', (e) => this.handleCustomerSearch(e.target.value));
        this.customerInput.addEventListener('focus', () => {
            if (this.customerInput.value) this.handleCustomerSearch(this.customerInput.value);
        });

        document.addEventListener('click', (e) => {
            if (!this.customerInput.contains(e.target) && !this.customerDropdown.contains(e.target)) {
                this.customerDropdown.classList.remove('show');
            }
        });
    },

    async loadGrants() {
        try {
            const res = await fetch('/api/grants');
            const data = await res.json();
            if (data.success) {
                this.grants = data.data;
                this.renderTable();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Failed to load grants', 'error');
        }
    },

    async loadCustomers() {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            if (data.success) this.customers = data.data;
        } catch (error) {
            console.error('Failed to load customers');
        }
    },

    handleCustomerSearch(query) {
        if (!query) {
            this.customerDropdown.classList.remove('show');
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matches = this.customers.filter(c => 
            c.name.toLowerCase().includes(lowerQuery) || 
            c.address.toLowerCase().includes(lowerQuery)
        );

        if (matches.length === 0) {
            this.customerDropdown.innerHTML = '<div class="dropdown-item" style="color: var(--text-muted);">No customers found</div>';
        } else {
            this.customerDropdown.innerHTML = matches.map(c => \`
                <div class="dropdown-item" onclick="GrantsPage.selectCustomer(\${c.id}, '\${c.name.replace(/'/g, "\\'")}')">
                    <strong>\${c.name}</strong><br>
                    <small style="color: var(--text-muted);">\${c.address}</small>
                </div>
            \`).join('');
        }
        this.customerDropdown.classList.add('show');
    },

    selectCustomer(id, name) {
        this.customerIdInput.value = id;
        this.customerInput.value = name;
        this.customerDropdown.classList.remove('show');
    },

    renderTable() {
        if (this.grants.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No grants found</td></tr>';
            return;
        }

        this.tbody.innerHTML = this.grants.map((g, index) => {
            const isConverted = !!g.bill_id;
            const statusBadge = isConverted 
                ? '<span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; background: #d4edda; color: #155724;">Converted</span>'
                : '<span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; background: #fff3cd; color: #856404;">Pending</span>';
            
            let actions = '';
            if (isConverted) {
                actions = \`<button class="btn btn-sm btn-secondary" onclick="HistoryPage.editBill(\${g.bill_id})">View Bill</button>\`;
            } else {
                actions = \`
                    <button class="btn btn-sm btn-primary" onclick="GrantsPage.convertToBill(\${g.id})">Convert to Bill</button>
                    <button class="btn btn-sm btn-danger" onclick="GrantsPage.deleteGrant(\${g.id})">Delete</button>
                \`;
            }

            return \`
                <tr>
                    <td>\${index + 1}</td>
                    <td>\${App.formatDate(g.grant_date)}</td>
                    <td>\${g.customer_name}</td>
                    <td style="text-align: right; font-weight: 600;">\${App.formatCurrency(g.amount)}</td>
                    <td>\${g.notes || '-'}</td>
                    <td>\${statusBadge}</td>
                    <td>\${actions}</td>
                </tr>
            \`;
        }).join('');
    },

    async handleAddGrant() {
        const customerId = this.customerIdInput.value;
        if (!customerId) {
            App.showToast('Please select a valid customer from the list', 'error');
            return;
        }

        const payload = {
            customer_id: customerId,
            grant_date: document.getElementById('grant-date').value,
            amount: document.getElementById('grant-amount').value,
            notes: document.getElementById('grant-notes').value
        };

        try {
            const res = await fetch('/api/grants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                App.showToast('Grant added successfully');
                this.addForm.reset();
                this.addFormContainer.style.display = 'none';
                document.getElementById('grant-date').value = App.getTodayDate();
                this.customerIdInput.value = '';
                await this.loadGrants();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    },

    convertToBill(id) {
        const grant = this.grants.find(g => g.id === id);
        if (!grant) return;

        window.history.pushState({ grantData: grant }, '', '#/billing');
        App.handleRoute();
    },

    async deleteGrant(id) {
        const confirmed = await App.confirm('Delete Grant', 'Are you sure you want to delete this grant record?');
        if (!confirmed) return;

        try {
            const res = await fetch(\`/api/grants/\${id}\`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                App.showToast('Grant deleted successfully');
                await this.loadGrants();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    }
};

window.GrantsPage = GrantsPage;
