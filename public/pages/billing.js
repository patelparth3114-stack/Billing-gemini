const BillingPage = {
    customers: [],
    inventory: [],
    billItems: [],
    currentBillId: null, // If editing
    origin: 'direct',
    grantId: null,

    async render() {
        return \`
            <div class="page-header">
                <h2 id="billing-page-title">New Bill</h2>
            </div>

            <div class="card">
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label for="bill-customer">Customer *</label>
                        <div class="searchable-dropdown">
                            <input type="text" id="bill-customer" placeholder="Type to search customer..." autocomplete="off">
                            <input type="hidden" id="bill-customer-id">
                            <div id="customer-dropdown" class="dropdown-list"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="bill-gst">Customer GST No</label>
                        <input type="text" id="bill-gst">
                    </div>
                    <div class="form-group">
                        <label for="bill-date">Bill Date *</label>
                        <input type="date" id="bill-date" required>
                    </div>
                    <div class="form-group">
                        <label>Bill Number</label>
                        <div id="bill-number-display" style="padding: 10px 12px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; font-weight: 600; color: var(--accent-saffron);">
                            Loading...
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="background-color: #fcfcfc; border: 1px solid #eee;">
                <h3 style="font-size: 1.1rem; margin-bottom: 15px;">Add Items</h3>
                <div class="form-row" style="align-items: flex-end;">
                    <div class="form-group" style="flex: 3;">
                        <label for="item-search">Item Name</label>
                        <div class="searchable-dropdown">
                            <input type="text" id="item-search" placeholder="Search inventory (Press Esc to clear)" autocomplete="off">
                            <div id="item-dropdown" class="dropdown-list"></div>
                        </div>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label for="item-qty">Quantity</label>
                        <input type="number" id="item-qty" value="1" min="1">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label for="item-rate">Rate (₹)</label>
                        <input type="number" id="item-rate" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <button id="btn-add-bill-item" class="btn btn-primary" style="width: 100%; height: 42px;">Add</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="table-responsive">
                    <table id="bill-items-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">SR</th>
                                <th>Item Description</th>
                                <th style="width: 100px; text-align: center;">Qty</th>
                                <th style="width: 150px; text-align: right;">Rate (₹)</th>
                                <th style="width: 150px; text-align: right;">Amount (₹)</th>
                                <th style="width: 80px; text-align: center;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="bill-items-tbody">
                            <tr id="empty-bill-row"><td colspan="6" style="text-align: center; color: var(--text-muted);">No items added yet. Search and add items above.</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                    <div style="width: 300px; background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Sub Total:</span>
                            <strong id="summary-subtotal">₹ 0.00</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Tax (GST):</span>
                            <strong id="summary-tax">₹ 0.00</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 10px; font-size: 1.2rem; color: var(--accent-saffron);">
                            <strong>Grand Total:</strong>
                            <strong id="summary-total">₹ 0.00</strong>
                        </div>
                    </div>
                </div>

                <div class="form-group" style="margin-top: 20px;">
                    <label for="bill-notes">Notes (Optional)</label>
                    <textarea id="bill-notes" rows="2" placeholder="Any additional notes for this bill..."></textarea>
                </div>

                <div class="form-actions" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="btn-print-bill" class="btn btn-secondary" style="display: none;">🖨️ Print</button>
                    <button id="btn-duplicate-bill" class="btn btn-secondary" style="display: none;">📋 Duplicate</button>
                    <button id="btn-save-bill" class="btn btn-primary">💾 Save Bill</button>
                </div>
            </div>
        \`;
    },

    async init() {
        this.cacheDOM();
        this.bindEvents();
        
        // Check if we have state passed (e.g., from Edit or Convert Grant)
        const state = window.history.state;
        
        document.getElementById('bill-date').value = App.getTodayDate();
        
        await Promise.all([
            this.loadCustomers(),
            this.loadInventory()
        ]);

        if (state && state.editBillId) {
            await this.loadBillForEdit(state.editBillId);
            // Clear state so refresh doesn't trigger edit again
            window.history.replaceState({}, document.title);
        } else if (state && state.grantData) {
            this.setupFromGrant(state.grantData);
            window.history.replaceState({}, document.title);
            await this.updateBillNumber();
        } else {
            await this.updateBillNumber();
            this.loadDraft();
        }

        // Start auto-save
        this.autoSaveInterval = setInterval(() => this.saveDraft(), 30000);
    },

    cacheDOM() {
        this.customerInput = document.getElementById('bill-customer');
        this.customerIdInput = document.getElementById('bill-customer-id');
        this.customerDropdown = document.getElementById('customer-dropdown');
        this.gstInput = document.getElementById('bill-gst');
        this.dateInput = document.getElementById('bill-date');
        this.billNumberDisplay = document.getElementById('bill-number-display');
        
        this.itemSearch = document.getElementById('item-search');
        this.itemDropdown = document.getElementById('item-dropdown');
        this.itemQty = document.getElementById('item-qty');
        this.itemRate = document.getElementById('item-rate');
        this.btnAddItem = document.getElementById('btn-add-bill-item');
        
        this.tbody = document.getElementById('bill-items-tbody');
        this.emptyRow = document.getElementById('empty-bill-row');
        
        this.subtotalDisplay = document.getElementById('summary-subtotal');
        this.taxDisplay = document.getElementById('summary-tax');
        this.totalDisplay = document.getElementById('summary-total');
        this.notesInput = document.getElementById('bill-notes');
        
        this.btnSave = document.getElementById('btn-save-bill');
        this.btnPrint = document.getElementById('btn-print-bill');
        this.btnDuplicate = document.getElementById('btn-duplicate-bill');
        this.pageTitle = document.getElementById('billing-page-title');
    },

    bindEvents() {
        // Date change -> update bill number
        this.dateInput.addEventListener('change', () => {
            if (!this.currentBillId) { // Only update if not editing an existing bill
                this.updateBillNumber();
            }
        });

        // Customer Search
        this.customerInput.addEventListener('input', (e) => this.handleCustomerSearch(e.target.value));
        this.customerInput.addEventListener('focus', () => {
            if (this.customerInput.value) this.handleCustomerSearch(this.customerInput.value);
        });
        
        // Item Search
        this.itemSearch.addEventListener('input', (e) => this.handleItemSearch(e.target.value));
        this.itemSearch.addEventListener('focus', () => {
            if (this.itemSearch.value) this.handleItemSearch(this.itemSearch.value);
        });

        // Keyboard shortcuts
        this.itemSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearItemSelection();
            }
        });

        this.itemQty.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addCurrentItem();
            }
        });

        this.itemRate.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addCurrentItem();
            }
        });

        this.btnAddItem.addEventListener('click', () => this.addCurrentItem());

        // Hide dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!this.customerInput.contains(e.target) && !this.customerDropdown.contains(e.target)) {
                this.customerDropdown.classList.remove('show');
            }
            if (!this.itemSearch.contains(e.target) && !this.itemDropdown.contains(e.target)) {
                this.itemDropdown.classList.remove('show');
            }
        });

        this.btnSave.addEventListener('click', () => this.saveBill());
        
        this.btnPrint.addEventListener('click', () => {
            if (this.currentBillId) {
                BillPrint.print(this.currentBillId);
            }
        });

        this.btnDuplicate.addEventListener('click', () => this.duplicateBill());

        // Cleanup interval on page leave
        const originalHandleRoute = App.handleRoute;
        App.handleRoute = () => {
            clearInterval(this.autoSaveInterval);
            App.handleRoute = originalHandleRoute; // restore
            originalHandleRoute.call(App);
        };
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

    async loadInventory() {
        try {
            const res = await fetch('/api/items');
            const data = await res.json();
            if (data.success) this.inventory = data.data;
        } catch (error) {
            console.error('Failed to load inventory');
        }
    },

    async updateBillNumber() {
        const date = this.dateInput.value;
        if (!date) return;
        
        try {
            const res = await fetch(\`/api/bills/next-number?date=\${date}\`);
            const data = await res.json();
            if (data.success) {
                this.billNumberDisplay.textContent = data.data.bill_number;
            }
        } catch (error) {
            this.billNumberDisplay.textContent = 'Error generating number';
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
                <div class="dropdown-item" onclick="BillingPage.selectCustomer(\${c.id}, '\${c.name.replace(/'/g, "\\'")}', '\${c.gst_no || ''}')">
                    <strong>\${c.name}</strong><br>
                    <small style="color: var(--text-muted);">\${c.address}</small>
                </div>
            \`).join('');
        }
        this.customerDropdown.classList.add('show');
    },

    selectCustomer(id, name, gst) {
        this.customerIdInput.value = id;
        this.customerInput.value = name;
        this.gstInput.value = gst;
        this.customerDropdown.classList.remove('show');
        this.itemSearch.focus();
    },

    handleItemSearch(query) {
        if (!query) {
            this.itemDropdown.classList.remove('show');
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matches = this.inventory.filter(i => i.name.toLowerCase().includes(lowerQuery));

        if (matches.length === 0) {
            this.itemDropdown.innerHTML = '<div class="dropdown-item" style="color: var(--text-muted);">No items found</div>';
        } else {
            this.itemDropdown.innerHTML = matches.map(i => \`
                <div class="dropdown-item" onclick="BillingPage.selectItem('\${i.name.replace(/'/g, "\\'")}', \${i.base_price})">
                    <strong>\${i.name}</strong><br>
                    <small style="color: var(--text-muted);">Base: ₹\${i.base_price} | A: ₹\${i.shop_a_price} | B: ₹\${i.shop_b_price}</small>
                </div>
            \`).join('');
        }
        this.itemDropdown.classList.add('show');
    },

    selectItem(name, price) {
        this.itemSearch.value = name;
        this.itemRate.value = price;
        this.itemQty.value = 1;
        this.itemDropdown.classList.remove('show');
        this.itemQty.focus();
        this.itemQty.select();
    },

    clearItemSelection() {
        this.itemSearch.value = '';
        this.itemRate.value = '';
        this.itemQty.value = '1';
        this.itemDropdown.classList.remove('show');
        this.itemSearch.focus();
    },

    addCurrentItem() {
        const name = this.itemSearch.value.trim();
        const qty = parseInt(this.itemQty.value);
        const rate = parseFloat(this.itemRate.value);

        if (!name || isNaN(qty) || qty <= 0 || isNaN(rate) || rate < 0) {
            App.showToast('Please enter valid item details', 'error');
            return;
        }

        // Check if item already exists in bill, if so, we could update qty, but let's just add as new row for simplicity and flexibility
        
        this.billItems.push({
            id: Date.now(), // temp id
            item_name: name,
            quantity: qty,
            rate: rate,
            amount: qty * rate
        });

        this.renderBillItems();
        this.clearItemSelection();
    },

    removeBillItem(id) {
        this.billItems = this.billItems.filter(item => item.id !== id);
        this.renderBillItems();
    },

    updateBillItem(id, field, value) {
        const item = this.billItems.find(i => i.id === id);
        if (item) {
            const numVal = parseFloat(value);
            if (!isNaN(numVal) && numVal >= 0) {
                item[field] = numVal;
                item.amount = item.quantity * item.rate;
                this.renderBillItems();
            }
        }
    },

    renderBillItems() {
        if (this.billItems.length === 0) {
            this.tbody.innerHTML = '<tr id="empty-bill-row"><td colspan="6" style="text-align: center; color: var(--text-muted);">No items added yet. Search and add items above.</td></tr>';
            this.updateTotals();
            return;
        }

        this.tbody.innerHTML = this.billItems.map((item, index) => \`
            <tr>
                <td>\${index + 1}</td>
                <td>\${item.item_name}</td>
                <td style="text-align: center;">
                    <input type="number" value="\${item.quantity}" min="1" 
                           style="width: 60px; padding: 4px; text-align: center;"
                           onchange="BillingPage.updateBillItem(\${item.id}, 'quantity', this.value)">
                </td>
                <td style="text-align: right;">
                    <input type="number" value="\${item.rate}" step="0.01" min="0" 
                           style="width: 100px; padding: 4px; text-align: right;"
                           onchange="BillingPage.updateBillItem(\${item.id}, 'rate', this.value)">
                </td>
                <td style="text-align: right; font-weight: 500;">\${App.formatCurrency(item.amount)}</td>
                <td style="text-align: center;">
                    <button class="icon-btn" style="color: var(--danger);" onclick="BillingPage.removeBillItem(\${item.id})">✕</button>
                </td>
            </tr>
        \`).join('');

        this.updateTotals();
    },

    updateTotals() {
        const subtotal = this.billItems.reduce((sum, item) => sum + item.amount, 0);
        const tax = 0; // Assuming 0 for now as per design, can be updated if needed
        const total = subtotal + tax;

        this.subtotalDisplay.textContent = App.formatCurrency(subtotal);
        this.taxDisplay.textContent = App.formatCurrency(tax);
        this.totalDisplay.textContent = App.formatCurrency(total);
    },

    async saveBill() {
        const customerId = this.customerIdInput.value;
        const date = this.dateInput.value;
        
        if (!customerId) {
            App.showToast('Please select a customer', 'error');
            return;
        }
        
        if (this.billItems.length === 0) {
            App.showToast('Please add at least one item', 'error');
            return;
        }

        const subtotal = this.billItems.reduce((sum, item) => sum + item.amount, 0);

        const payload = {
            bill_date: date,
            customer_id: customerId,
            subtotal: subtotal,
            grand_total: subtotal, // Assuming no tax
            origin: this.origin,
            grant_id: this.grantId,
            notes: this.notesInput.value,
            items: this.billItems.map(i => ({
                item_name: i.item_name,
                quantity: i.quantity,
                rate: i.rate,
                amount: i.amount
            }))
        };

        try {
            this.btnSave.disabled = true;
            this.btnSave.textContent = 'Saving...';

            let url = '/api/bills';
            let method = 'POST';

            if (this.currentBillId) {
                url = \`/api/bills/\${this.currentBillId}\`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();

            if (data.success) {
                App.showToast(this.currentBillId ? 'Bill updated successfully' : 'Bill saved successfully');
                this.clearDraft();
                
                if (!this.currentBillId) {
                    this.currentBillId = data.data.id;
                    this.billNumberDisplay.textContent = data.data.bill_number;
                }
                
                // Update UI state
                this.pageTitle.textContent = \`Edit Bill: \${this.billNumberDisplay.textContent}\`;
                this.btnPrint.style.display = 'inline-flex';
                this.btnDuplicate.style.display = 'inline-flex';
                
                // If it was a grant conversion, reset origin so future edits are just edits
                this.origin = 'direct';
                this.grantId = null;
                
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error while saving', 'error');
        } finally {
            this.btnSave.disabled = false;
            this.btnSave.textContent = '💾 Save Bill';
        }
    },

    async loadBillForEdit(id) {
        try {
            const res = await fetch(\`/api/bills/\${id}\`);
            const data = await res.json();
            
            if (data.success) {
                const bill = data.data;
                this.currentBillId = bill.id;
                this.pageTitle.textContent = \`Edit Bill: \${bill.bill_number}\`;
                
                this.dateInput.value = bill.bill_date;
                this.billNumberDisplay.textContent = bill.bill_number;
                
                this.customerIdInput.value = bill.customer_id;
                this.customerInput.value = bill.customer_name;
                this.gstInput.value = bill.customer_gst || '';
                
                this.notesInput.value = bill.notes || '';
                
                this.billItems = bill.items.map(i => ({
                    id: i.id,
                    item_name: i.item_name,
                    quantity: i.quantity,
                    rate: i.rate,
                    amount: i.amount
                }));
                
                this.renderBillItems();
                
                this.btnPrint.style.display = 'inline-flex';
                this.btnDuplicate.style.display = 'inline-flex';
            }
        } catch (error) {
            App.showToast('Failed to load bill details', 'error');
        }
    },

    setupFromGrant(grantData) {
        this.origin = 'grant';
        this.grantId = grantData.id;
        
        this.customerIdInput.value = grantData.customer_id;
        this.customerInput.value = grantData.customer_name;
        this.customerInput.readOnly = true; // Lock customer
        
        this.notesInput.value = \`Grant of ₹\${grantData.amount} on \${App.formatDate(grantData.grant_date)}\`;
        
        App.showToast('Ready to create bill from grant', 'success');
    },

    duplicateBill() {
        // Reset state to new bill but keep data
        this.currentBillId = null;
        this.origin = 'direct';
        this.grantId = null;
        
        this.dateInput.value = App.getTodayDate();
        this.pageTitle.textContent = 'New Bill (Duplicated)';
        
        this.btnPrint.style.display = 'none';
        this.btnDuplicate.style.display = 'none';
        
        // Assign new temp IDs to items
        this.billItems = this.billItems.map(i => ({...i, id: Date.now() + Math.random()}));
        
        this.updateBillNumber();
        App.showToast('Bill duplicated. Ready to save as new.', 'success');
    },

    // Draft Management
    saveDraft() {
        if (this.currentBillId) return; // Don't save draft if editing existing
        if (this.billItems.length === 0 && !this.customerIdInput.value) return;

        const draft = {
            customer_id: this.customerIdInput.value,
            customer_name: this.customerInput.value,
            date: this.dateInput.value,
            notes: this.notesInput.value,
            items: this.billItems
        };
        localStorage.setItem('aksharam_bill_draft', JSON.stringify(draft));
    },

    loadDraft() {
        const draftStr = localStorage.getItem('aksharam_bill_draft');
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                if (draft.items && draft.items.length > 0) {
                    App.confirm('Draft Found', 'You have an unsaved bill draft. Do you want to restore it?').then(yes => {
                        if (yes) {
                            this.customerIdInput.value = draft.customer_id || '';
                            this.customerInput.value = draft.customer_name || '';
                            if (draft.date) this.dateInput.value = draft.date;
                            this.notesInput.value = draft.notes || '';
                            this.billItems = draft.items;
                            this.renderBillItems();
                            this.updateBillNumber();
                        } else {
                            this.clearDraft();
                        }
                    });
                }
            } catch (e) {
                this.clearDraft();
            }
        }
    },

    clearDraft() {
        localStorage.removeItem('aksharam_bill_draft');
    }
};

window.BillingPage = BillingPage;
