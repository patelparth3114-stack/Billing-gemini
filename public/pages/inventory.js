const InventoryPage = {
    items: [],

    async render() {
        return \`
            <div class="page-header">
                <h2>Inventory</h2>
                <button id="btn-add-item" class="btn btn-primary">
                    <span>+</span> Add Item
                </button>
            </div>

            <div class="card" id="add-item-form-container" style="display: none;">
                <h3>Add New Item</h3>
                <form id="add-item-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-name">Item Name *</label>
                            <input type="text" id="item-name" required>
                        </div>
                        <div class="form-group">
                            <label for="item-base-price">Base Price (₹) *</label>
                            <input type="number" id="item-base-price" step="0.01" min="0" required>
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top: 16px;">
                        <button type="submit" class="btn btn-primary">Save Item</button>
                        <button type="button" id="btn-cancel-add" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>

            <div class="card">
                <div class="form-group" style="max-width: 300px; margin-bottom: 20px;">
                    <input type="text" id="search-inventory" placeholder="Search items...">
                </div>
                
                <div class="table-responsive">
                    <table id="inventory-table">
                        <thead>
                            <tr>
                                <th>SR</th>
                                <th>Item Name</th>
                                <th>Base Price</th>
                                <th>Shop A Price</th>
                                <th>Shop B Price</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-tbody">
                            <!-- Items will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Edit Item Modal -->
            <div id="edit-item-modal" class="modal">
                <div class="modal-content">
                    <h3>Edit Item</h3>
                    <form id="edit-item-form">
                        <input type="hidden" id="edit-item-id">
                        <input type="hidden" id="original-base-price">
                        <div class="form-group">
                            <label for="edit-item-name">Item Name *</label>
                            <input type="text" id="edit-item-name" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-item-base-price">Base Price (₹) *</label>
                            <input type="number" id="edit-item-base-price" step="0.01" min="0" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-item-shop-a">Shop A Price (₹)</label>
                                <input type="number" id="edit-item-shop-a" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-item-shop-b">Shop B Price (₹)</label>
                                <input type="number" id="edit-item-shop-b" step="0.01" min="0" required>
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button type="button" id="btn-cancel-edit" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn btn-primary">Update Item</button>
                        </div>
                    </form>
                </div>
            </div>
        \`;
    },

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadItems();
    },

    cacheDOM() {
        this.tbody = document.getElementById('inventory-tbody');
        this.searchInput = document.getElementById('search-inventory');
        this.addFormContainer = document.getElementById('add-item-form-container');
        this.addForm = document.getElementById('add-item-form');
        this.btnAddItem = document.getElementById('btn-add-item');
        this.btnCancelAdd = document.getElementById('btn-cancel-add');
        
        // Edit Modal
        this.editModal = document.getElementById('edit-item-modal');
        this.editForm = document.getElementById('edit-item-form');
        this.btnCancelEdit = document.getElementById('btn-cancel-edit');
    },

    bindEvents() {
        this.btnAddItem.addEventListener('click', () => {
            this.addFormContainer.style.display = 'block';
            document.getElementById('item-name').focus();
        });

        this.btnCancelAdd.addEventListener('click', () => {
            this.addFormContainer.style.display = 'none';
            this.addForm.reset();
        });

        this.addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddItem();
        });

        this.searchInput.addEventListener('input', (e) => {
            this.renderTable(e.target.value);
        });

        this.btnCancelEdit.addEventListener('click', () => {
            this.editModal.classList.remove('show');
        });

        this.editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditItem();
        });
    },

    async loadItems() {
        try {
            const res = await fetch('/api/items');
            const data = await res.json();
            if (data.success) {
                this.items = data.data;
                const currentFilter = this.searchInput ? this.searchInput.value : '';
                this.renderTable(currentFilter);
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Failed to load inventory', 'error');
        }
    },

    renderTable(filter = '') {
        const filteredItems = this.items.filter(item => 
            item.name.toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredItems.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No items found</td></tr>';
            return;
        }

        this.tbody.innerHTML = filteredItems.map((item, index) => \`
            <tr>
                <td>\${index + 1}</td>
                <td>\${item.name}</td>
                <td>\${App.formatCurrency(item.base_price)}</td>
                <td>\${App.formatCurrency(item.shop_a_price)}</td>
                <td>\${App.formatCurrency(item.shop_b_price)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="InventoryPage.openEditModal(\${item.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="InventoryPage.deleteItem(\${item.id})">Delete</button>
                </td>
            </tr>
        \`).join('');
    },

    async handleAddItem() {
        const name = document.getElementById('item-name').value;
        const basePrice = document.getElementById('item-base-price').value;

        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, base_price: basePrice })
            });
            const data = await res.json();

            if (data.success) {
                App.showToast('Item added successfully');
                this.addForm.reset();
                this.addFormContainer.style.display = 'none';
                await this.loadItems();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    },

    openEditModal(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        document.getElementById('edit-item-id').value = item.id;
        document.getElementById('original-base-price').value = item.base_price;
        document.getElementById('edit-item-name').value = item.name;
        document.getElementById('edit-item-base-price').value = item.base_price;
        document.getElementById('edit-item-shop-a').value = item.shop_a_price;
        document.getElementById('edit-item-shop-b').value = item.shop_b_price;

        this.editModal.classList.add('show');
    },

    async handleEditItem() {
        const id = document.getElementById('edit-item-id').value;
        const originalBasePrice = document.getElementById('original-base-price').value;
        const name = document.getElementById('edit-item-name').value;
        const basePrice = document.getElementById('edit-item-base-price').value;
        const shopA = document.getElementById('edit-item-shop-a').value;
        const shopB = document.getElementById('edit-item-shop-b').value;

        let regenerate = false;
        if (parseFloat(basePrice) !== parseFloat(originalBasePrice)) {
            regenerate = await App.confirm(
                'Base Price Changed', 
                'Do you want to auto-regenerate Shop A and Shop B prices based on the new base price?'
            );
        }

        try {
            const res = await fetch(\`/api/items/\${id}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    base_price: basePrice, 
                    shop_a_price: shopA, 
                    shop_b_price: shopB,
                    regenerate 
                })
            });
            const data = await res.json();

            if (data.success) {
                App.showToast('Item updated successfully');
                this.editModal.classList.remove('show');
                await this.loadItems();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    },

    async deleteItem(id, force = false) {
        if (!force) {
            const confirmed = await App.confirm('Delete Item', 'Are you sure you want to delete this item?');
            if (!confirmed) return;
        }

        try {
            const url = force ? \`/api/items/\${id}?force=true\` : \`/api/items/\${id}\`;
            const res = await fetch(url, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                App.showToast('Item deleted successfully');
                await this.loadItems();
            } else if (data.requiresForce) {
                const confirmed = await App.confirm('Warning', data.error);
                if (confirmed) {
                    await this.deleteItem(id, true);
                }
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error', 'error');
        }
    }
};

window.InventoryPage = InventoryPage;
