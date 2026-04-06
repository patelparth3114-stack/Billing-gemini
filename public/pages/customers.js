const CustomersPage = {
    customers: [],

    async render() {
        return \`
            <div class="page-header">
                <h2>Customers</h2>
                <button id="btn-add-customer" class="btn btn-primary">
                    <span>+</span> Add Customer
                </button>
            </div>

            <div class="card" id="add-customer-form-container" style="display: none;">
                <h3>Add New Customer</h3>
                <form id="add-customer-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="cust-name">Name *</label>
                            <input type="text" id="cust-name" required>
                        </div>
                        <div class="form-group">
                            <label for="cust-address">Address *</label>
                            <input type="text" id="cust-address" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="cust-mobile">Mobile</label>
                            <input type="text" id="cust-mobile">
                        </div>
                        <div class="form-group">
                            <label for="cust-email">Email</label>
                            <input type="email" id="cust-email">
                        </div>
                        <div class="form-group">
                            <label for="cust-gst">GST No</label>
                            <input type="text" id="cust-gst">
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top: 16px;">
                        <button type="submit" class="btn btn-primary">Save Customer</button>
                        <button type="button" id="btn-cancel-add-cust" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>

            <div class="card">
                <div class="form-group" style="max-width: 300px; margin-bottom: 20px;">
                    <input type="text" id="search-customers" placeholder="Search by name or address...">
                </div>
                
                <div class="table-responsive">
                    <table id="customers-table">
                        <thead>
                            <tr>
                                <th>SR</th>
                                <th>Name</th>
                                <th>Address</th>
                                <th>Mobile</th>
                                <th>Email</th>
                                <th>GST No</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customers-tbody">
                            <!-- Customers will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Edit Customer Modal -->
            <div id="edit-customer-modal" class="modal">
                <div class="modal-content">
                    <h3>Edit Customer</h3>
                    <form id="edit-customer-form">
                        <input type="hidden" id="edit-cust-id">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-cust-name">Name *</label>
                                <input type="text" id="edit-cust-name" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-cust-address">Address *</label>
                                <input type="text" id="edit-cust-address" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-cust-mobile">Mobile</label>
                                <input type="text" id="edit-cust-mobile">
                            </div>
                            <div class="form-group">
                                <label for="edit-cust-email">Email</label>
                                <input type="email" id="edit-cust-email">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="edit-cust-gst">GST No</label>
                            <input type="text" id="edit-cust-gst">
                        </div>
                        <div class="modal-actions">
                            <button type="button" id="btn-cancel-edit-cust" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn btn-primary">Update Customer</button>
                        </div>
                    </form>
                </div>
            </div>
        \`;
    },

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadCustomers();
    },

    cacheDOM() {
        this.tbody = document.getElementById('customers-tbody');
        this.searchInput = document.getElementById('search-customers');
        this.addFormContainer = document.getElementById('add-customer-form-container');
        this.addForm = document.getElementById('add-customer-form');
        this.btnAddCustomer = document.getElementById('btn-add-customer');
        this.btnCancelAdd = document.getElementById('btn-cancel-add-cust');
        
        // Edit Modal
        this.editModal = document.getElementById('edit-customer-modal');
        this.editForm = document.getElementById('edit-customer-form');
        this.btnCancelEdit = document.getElementById('btn-cancel-edit-cust');
    },

    bindEvents() {
        this.btnAddCustomer.addEventListener('click', () => {
            this.addFormContainer.style.display = 'block';
            document.getElementById('cust-name').focus();
        });

        this.btnCancelAdd.addEventListener('click', () => {
            this.addFormContainer.style.display = 'none';
            this.addForm.reset();
        });

        this.addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddCustomer();
        });

        this.searchInput.addEventListener('input', (e) => {
            this.renderTable(e.target.value);
        });

        this.btnCancelEdit.addEventListener('click', () => {
            this.editModal.classList.remove('show');
        });

        this.editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditCustomer();
        });
    },

    async loadCustomers() {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            if (data.success) {
                this.customers = data.data;
                const currentFilter = this.searchInput ? this.searchInput.value : '';
                this.renderTable(currentFilter);
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Failed to load customers', 'error');
        }
    },

    renderTable(filter = '') {
        const lowerFilter = filter.toLowerCase();
        const filteredCustomers = this.customers.filter(c => 
            c.name.toLowerCase().includes(lowerFilter) || 
            c.address.toLowerCase().includes(lowerFilter)
        );

        if (filteredCustomers.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No customers found</td></tr>';
            return;
        }

        this.tbody.innerHTML = filteredCustomers.map((c, index) => \`
            <tr>
                <td>\${index + 1}</td>
                <td>\${c.name}</td>
                <td>\${c.address}</td>
                <td>\${c.mobile || '-'}</td>
                <td>\${c.email || '-'}</td>
                <td>\${c.gst_no || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="CustomersPage.openEditModal(\${c.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="CustomersPage.deleteCustomer(\${c.id})">Delete</button>
                </td>
            </tr>
        \`).join('');
    },

    async handleAddCustomer() {
        const payload = {
            name: document.getElementById('cust-name').value,
            address: document.getElementById('cust-address').value,
            mobile: document.getElementById('cust-mobile').value,
            email: document.getElementById('cust-email').value,
            gst_no: document.getElementById('cust-gst').value
        };

        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                App.showToast('Customer added successfully');
                this.addForm.reset();
                this.addFormContainer.style.display = 'none';
                await this.loadCustomers();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    },

    openEditModal(id) {
        const customer = this.customers.find(c => c.id === id);
        if (!customer) return;

        document.getElementById('edit-cust-id').value = customer.id;
        document.getElementById('edit-cust-name').value = customer.name;
        document.getElementById('edit-cust-address').value = customer.address;
        document.getElementById('edit-cust-mobile').value = customer.mobile || '';
        document.getElementById('edit-cust-email').value = customer.email || '';
        document.getElementById('edit-cust-gst').value = customer.gst_no || '';

        this.editModal.classList.add('show');
    },

    async handleEditCustomer() {
        const id = document.getElementById('edit-cust-id').value;
        const payload = {
            name: document.getElementById('edit-cust-name').value,
            address: document.getElementById('edit-cust-address').value,
            mobile: document.getElementById('edit-cust-mobile').value,
            email: document.getElementById('edit-cust-email').value,
            gst_no: document.getElementById('edit-cust-gst').value
        };

        try {
            const res = await fetch(\`/api/customers/\${id}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                App.showToast('Customer updated successfully');
                this.editModal.classList.remove('show');
                await this.loadCustomers();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    },

    async deleteCustomer(id) {
        const confirmed = await App.confirm('Delete Customer', 'Are you sure you want to delete this customer?');
        if (!confirmed) return;

        try {
            const res = await fetch(\`/api/customers/\${id}\`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                App.showToast('Customer deleted successfully');
                await this.loadCustomers();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    }
};

window.CustomersPage = CustomersPage;
