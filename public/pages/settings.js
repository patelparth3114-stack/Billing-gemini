const SettingsPage = {
    async render() {
        return \`
            <div class="page-header">
                <h2>Shop Configuration</h2>
            </div>

            <div class="card" style="max-width: 800px;">
                <form id="settings-form">
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label for="set-shop-name">Shop Name</label>
                            <input type="text" id="set-shop-name" required>
                        </div>
                        <div class="form-group">
                            <label for="set-tagline">Tagline / Sub-name</label>
                            <input type="text" id="set-tagline">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="set-address">Address</label>
                        <textarea id="set-address" rows="3"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="set-contact">Contact Number</label>
                            <input type="text" id="set-contact">
                        </div>
                        <div class="form-group">
                            <label for="set-gst">GST Number</label>
                            <input type="text" id="set-gst">
                        </div>
                    </div>
                    
                    <h3 style="margin: 20px 0 10px; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 5px;">Bank Details</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="set-bank">Bank Name</label>
                            <input type="text" id="set-bank">
                        </div>
                        <div class="form-group">
                            <label for="set-account">Account Number</label>
                            <input type="text" id="set-account">
                        </div>
                        <div class="form-group">
                            <label for="set-ifsc">IFSC Code</label>
                            <input type="text" id="set-ifsc">
                        </div>
                    </div>
                    
                    <h3 style="margin: 20px 0 10px; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 5px;">Logo</h3>
                    <div class="form-group">
                        <label for="set-logo">Upload Logo (Image will be resized and stored locally)</label>
                        <input type="file" id="set-logo" accept="image/*">
                        <div id="logo-preview" style="margin-top: 10px; max-height: 100px;"></div>
                        <input type="hidden" id="set-logo-base64">
                        <button type="button" id="btn-clear-logo" class="btn btn-sm btn-secondary" style="margin-top: 10px; display: none;">Clear Logo</button>
                    </div>

                    <div class="form-actions" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <button type="submit" class="btn btn-primary" id="btn-save-settings">💾 Save Settings</button>
                    </div>
                </form>
            </div>
        \`;
    },

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadSettings();
    },

    cacheDOM() {
        this.form = document.getElementById('settings-form');
        this.btnSave = document.getElementById('btn-save-settings');
        this.logoInput = document.getElementById('set-logo');
        this.logoPreview = document.getElementById('logo-preview');
        this.logoBase64 = document.getElementById('set-logo-base64');
        this.btnClearLogo = document.getElementById('btn-clear-logo');
    },

    bindEvents() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveSettings();
        });

        this.logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Basic resize to prevent massive base64 strings
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 300;
                        const MAX_HEIGHT = 300;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const dataUrl = canvas.toDataURL('image/png');
                        this.logoBase64.value = dataUrl;
                        this.logoPreview.innerHTML = \`<img src="\${dataUrl}" style="max-height: 100px; border: 1px solid #ccc; padding: 5px; background: white;">\`;
                        this.btnClearLogo.style.display = 'inline-block';
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        this.btnClearLogo.addEventListener('click', () => {
            this.logoInput.value = '';
            this.logoBase64.value = '';
            this.logoPreview.innerHTML = '';
            this.btnClearLogo.style.display = 'none';
        });
    },

    async loadSettings() {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.success) {
                const s = data.data;
                document.getElementById('set-shop-name').value = s.shop_name || '';
                document.getElementById('set-tagline').value = s.tagline || '';
                document.getElementById('set-address').value = s.address || '';
                document.getElementById('set-contact').value = s.contact_number || '';
                document.getElementById('set-gst').value = s.gst_number || '';
                document.getElementById('set-bank').value = s.bank_name || '';
                document.getElementById('set-account').value = s.account_number || '';
                document.getElementById('set-ifsc').value = s.ifsc_code || '';
                
                if (s.logo_base64) {
                    this.logoBase64.value = s.logo_base64;
                    this.logoPreview.innerHTML = \`<img src="\${s.logo_base64}" style="max-height: 100px; border: 1px solid #ccc; padding: 5px; background: white;">\`;
                    this.btnClearLogo.style.display = 'inline-block';
                }
            }
        } catch (error) {
            App.showToast('Failed to load settings', 'error');
        }
    },

    async saveSettings() {
        const payload = {
            shop_name: document.getElementById('set-shop-name').value,
            tagline: document.getElementById('set-tagline').value,
            address: document.getElementById('set-address').value,
            contact_number: document.getElementById('set-contact').value,
            gst_number: document.getElementById('set-gst').value,
            bank_name: document.getElementById('set-bank').value,
            account_number: document.getElementById('set-account').value,
            ifsc_code: document.getElementById('set-ifsc').value,
            logo_base64: this.logoBase64.value
        };

        try {
            this.btnSave.disabled = true;
            this.btnSave.textContent = 'Saving...';

            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();

            if (data.success) {
                App.showToast('Settings saved successfully');
                // Update global state and UI
                App.state.settings = payload;
                App.updateBranding();
            } else {
                App.showToast(data.error, 'error');
            }
        } catch (error) {
            App.showToast('Network error while saving', 'error');
        } finally {
            this.btnSave.disabled = false;
            this.btnSave.textContent = '💾 Save Settings';
        }
    }
};

window.SettingsPage = SettingsPage;
