const HistoryPage = {
    bills: [],

    async render() {
        return \`
            <div class="page-header">
                <h2>Bill History</h2>
            </div>

            <div class="card">
                <div class="form-row" style="margin-bottom: 20px; align-items: flex-end;">
                    <div class="form-group">
                        <label for="filter-date-start">From Date</label>
                        <input type="date" id="filter-date-start">
                    </div>
                    <div class="form-group">
                        <label for="filter-date-end">To Date</label>
                        <input type="date" id="filter-date-end">
                    </div>
                    <div class="form-group" style="flex: 2;">
                        <label for="filter-customer">Customer Search</label>
                        <input type="text" id="filter-customer" placeholder="Search by name...">
                    </div>
                    <div class="form-group">
                        <label for="filter-origin">Origin</label>
                        <select id="filter-origin">
                            <option value="all">All</option>
                            <option value="direct">Direct</option>
                            <option value="grant">From Grant</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button id="btn-clear-filters" class="btn btn-secondary" style="height: 42px;">Clear</button>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table id="history-table">
                        <thead>
                            <tr>
                                <th>Bill No</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th style="text-align: right;">Grand Total</th>
                                <th>Origin</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="history-tbody">
                            <!-- Bills will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        \`;
    },

    async init() {
        this.cacheDOM();
        this.bindEvents();
        
        // Set default dates (last 30 days)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        this.dateEnd.value = App.getTodayDate();
        this.dateStart.value = thirtyDaysAgo.toISOString().split('T')[0];
        
        await this.loadBills();
    },

    cacheDOM() {
        this.tbody = document.getElementById('history-tbody');
        this.dateStart = document.getElementById('filter-date-start');
        this.dateEnd = document.getElementById('filter-date-end');
        this.customerSearch = document.getElementById('filter-customer');
        this.originFilter = document.getElementById('filter-origin');
        this.btnClear = document.getElementById('btn-clear-filters');
    },

    bindEvents() {
        const applyFilters = () => this.renderTable();
        
        this.dateStart.addEventListener('change', applyFilters);
        this.dateEnd.addEventListener('change', applyFilters);
        this.customerSearch.addEventListener('input', applyFilters);
        this.originFilter.addEventListener('change', applyFilters);
        
        this.btnClear.addEventListener('click', () => {
            this.dateStart.value = '';
            this.dateEnd.value = '';
            this.customerSearch.value = '';
            this.originFilter.value = 'all';
            this.renderTable();
        });
    },

    async loadBills() {
        try {
            const res = await fetch('/api/bills');
            const data = await res.json();
            if (data.success) {
                this.bills = data.data;
                this.renderTable();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Failed to load bills', 'error');
        }
    },

    renderTable() {
        const start = this.dateStart.value;
        const end = this.dateEnd.value;
        const custFilter = this.customerSearch.value.toLowerCase();
        const originFilter = this.originFilter.value;

        const filteredBills = this.bills.filter(b => {
            let match = true;
            if (start && b.bill_date < start) match = false;
            if (end && b.bill_date > end) match = false;
            if (custFilter && !b.customer_name.toLowerCase().includes(custFilter)) match = false;
            if (originFilter !== 'all' && b.origin !== originFilter) match = false;
            return match;
        });

        if (filteredBills.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No bills found matching criteria</td></tr>';
            return;
        }

        this.tbody.innerHTML = filteredBills.map(b => \`
            <tr>
                <td style="font-weight: 500;">\${b.bill_number}</td>
                <td>\${App.formatDate(b.bill_date)}</td>
                <td>\${b.customer_name}</td>
                <td style="text-align: right; font-weight: 600;">\${App.formatCurrency(b.grand_total)}</td>
                <td>
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; background: \${b.origin === 'grant' ? '#e8f4fd' : '#f0f0f0'}; color: \${b.origin === 'grant' ? '#0056b3' : '#666'};">
                        \${b.origin === 'grant' ? 'From Grant' : 'Direct'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="HistoryPage.editBill(\${b.id})" title="Edit">✏️</button>
                    <button class="btn btn-sm btn-secondary" onclick="BillPrint.print(\${b.id})" title="Print Bill">🖨️</button>
                    <button class="btn btn-sm btn-primary" onclick="QuotationPrint.print(\${b.id})" title="Generate Quotation">📄 Quote</button>
                    <button class="btn btn-sm btn-danger" onclick="HistoryPage.deleteBill(\${b.id})" title="Delete">✕</button>
                </td>
            </tr>
        \`).join('');
    },

    editBill(id) {
        // Use history API to pass state to billing page
        window.history.pushState({ editBillId: id }, '', '#/billing');
        App.handleRoute();
    },

    async deleteBill(id) {
        const confirmed = await App.confirm('Delete Bill', 'Are you sure you want to delete this bill? This action cannot be undone.');
        if (!confirmed) return;

        try {
            const res = await fetch(\`/api/bills/\${id}\`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                App.showToast('Bill deleted successfully');
                await this.loadBills();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    }
};

window.HistoryPage = HistoryPage;
