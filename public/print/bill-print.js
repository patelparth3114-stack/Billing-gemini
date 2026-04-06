const BillPrint = {
    async print(billId) {
        try {
            const [billRes, settingsRes] = await Promise.all([
                fetch(\`/api/bills/\${billId}\`),
                fetch('/api/settings')
            ]);
            
            const billData = await billRes.json();
            const settingsData = await settingsRes.json();
            
            if (!billData.success || !settingsData.success) {
                App.showToast('Failed to load data for printing', 'error');
                return;
            }
            
            this.renderPrintView(billData.data, settingsData.data);
            window.print();
        } catch (error) {
            App.showToast('Error preparing print view', 'error');
        }
    },

    renderPrintView(bill, settings) {
        const container = document.getElementById('print-container');
        
        const logoHtml = settings.logo_base64 
            ? \`<img src="\${settings.logo_base64}" style="max-height: 80px; max-width: 150px;">\`
            : \`<h1 style="font-family: 'Playfair Display', serif; font-size: 24px; margin: 0; color: #333;">\${settings.shop_name || 'AKSHARAM'}</h1>\`;

        const itemsHtml = bill.items.map((item, index) => \`
            <tr>
                <td style="text-align: center; border: 1px solid #000; padding: 5px;">\${index + 1}</td>
                <td style="border: 1px solid #000; padding: 5px;">\${item.item_name}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 5px;">\${item.quantity}</td>
                <td style="text-align: right; border: 1px solid #000; padding: 5px;">\${item.rate.toFixed(2)}</td>
                <td style="text-align: right; border: 1px solid #000; padding: 5px;">\${item.amount.toFixed(2)}</td>
            </tr>
        \`).join('');

        // Fill empty rows to make it look like a standard bill book
        const emptyRowsCount = Math.max(0, 15 - bill.items.length);
        let emptyRowsHtml = '';
        for (let i = 0; i < emptyRowsCount; i++) {
            emptyRowsHtml += \`
                <tr>
                    <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 12px;">&nbsp;</td>
                    <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 12px;"></td>
                    <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 12px;"></td>
                    <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 12px;"></td>
                    <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 12px;"></td>
                </tr>
            \`;
        }

        const html = \`
            <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; position: relative; width: 100%; max-width: 800px; margin: 0 auto;">
                
                <!-- Watermark -->
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(0,0,0,0.03); font-weight: bold; font-family: 'Playfair Display', serif; z-index: -1; white-space: nowrap; pointer-events: none;">
                    \${settings.shop_name || 'AKSHARAM'}
                </div>

                <div style="border: 1px solid #000;">
                    <!-- Header -->
                    <div style="display: flex; border-bottom: 1px solid #000; padding: 10px;">
                        <div style="width: 20%; display: flex; align-items: center; justify-content: center;">
                            \${logoHtml}
                        </div>
                        <div style="width: 60%; text-align: center;">
                            <h2 style="margin: 0; font-size: 22px; font-family: 'Playfair Display', serif;">\${settings.shop_name || 'AKSHARAM STATIONERY AND MART'}</h2>
                            <div style="font-size: 11px; margin-top: 5px;">\${settings.address ? settings.address.replace(/\\n/g, '<br>') : ''}</div>
                            <div style="font-size: 11px; margin-top: 2px;">Contact: \${settings.contact_number || ''}</div>
                            <div style="font-size: 11px; margin-top: 2px;"><strong>GST No: \${settings.gst_number || ''}</strong></div>
                            <div style="font-size: 10px; margin-top: 2px; font-weight: bold;">COMPOSITION TAXABLE PERSON, NOT ELIGIBLE TO COLLECT TAX ON SUPPLIES</div>
                        </div>
                        <div style="width: 20%; text-align: right; font-weight: bold; font-size: 16px;">
                            BILL OF SUPPLY
                        </div>
                    </div>

                    <!-- Customer & Bill Info -->
                    <div style="display: flex; border-bottom: 1px solid #000;">
                        <div style="width: 60%; border-right: 1px solid #000; padding: 10px;">
                            <div style="font-weight: bold; margin-bottom: 5px;">BILL TO:</div>
                            <div style="font-weight: bold; font-size: 14px;">\${bill.customer_name}</div>
                            <div>\${bill.customer_address}</div>
                            \${bill.customer_mobile ? \`<div>Mobile: \${bill.customer_mobile}</div>\` : ''}
                            \${bill.customer_gst ? \`<div style="margin-top: 5px;"><strong>Customer GST No: \${bill.customer_gst}</strong></div>\` : ''}
                        </div>
                        <div style="width: 40%; padding: 10px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 2px 0;"><strong>Invoice No:</strong></td>
                                    <td style="padding: 2px 0; font-weight: bold;">\${bill.bill_number}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><strong>Invoice Date:</strong></td>
                                    <td style="padding: 2px 0;">\${App.formatDate(bill.bill_date)}</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #000; padding: 5px; width: 5%;">SR</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 55%; text-align: left;">ITEM DESCRIPTION</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 10%;">QTY</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 15%; text-align: right;">RATE(₹)</th>
                                <th style="border: 1px solid #000; padding: 5px; width: 15%; text-align: right;">AMOUNT(₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${itemsHtml}
                            \${emptyRowsHtml}
                        </tbody>
                    </table>

                    <!-- Totals & Tax -->
                    <div style="display: flex; border-top: 1px solid #000; border-bottom: 1px solid #000;">
                        <div style="width: 65%; border-right: 1px solid #000; padding: 5px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: center;">
                                <thead>
                                    <tr>
                                        <th style="border-bottom: 1px solid #ccc;">Tax Rate</th>
                                        <th style="border-bottom: 1px solid #ccc;">Taxable</th>
                                        <th style="border-bottom: 1px solid #ccc;">SGST</th>
                                        <th style="border-bottom: 1px solid #ccc;">CGST</th>
                                        <th style="border-bottom: 1px solid #ccc;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>0.00%</td>
                                        <td>\${bill.subtotal.toFixed(2)}</td>
                                        <td>0.00</td>
                                        <td>0.00</td>
                                        <td>0.00</td>
                                    </tr>
                                </tbody>
                            </table>
                            \${bill.notes ? \`<div style="margin-top: 10px; font-size: 11px;"><strong>Notes:</strong> \${bill.notes}</div>\` : ''}
                        </div>
                        <div style="width: 35%; padding: 5px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 2px 0; text-align: right;">Sub Total:</td>
                                    <td style="padding: 2px 0; text-align: right; font-weight: bold;">₹ \${bill.subtotal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; text-align: right;">Tax(GST):</td>
                                    <td style="padding: 2px 0; text-align: right; font-weight: bold;">₹ 0.00</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0; text-align: right; font-size: 14px; font-weight: bold; border-top: 1px solid #000;">Grand Total:</td>
                                    <td style="padding: 5px 0; text-align: right; font-size: 14px; font-weight: bold; border-top: 1px solid #000;">₹ \${bill.grand_total.toFixed(2)}</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="display: flex;">
                        <div style="width: 65%; border-right: 1px solid #000; padding: 10px;">
                            <div style="font-weight: bold; text-decoration: underline; margin-bottom: 5px;">Payment Details:</div>
                            <table style="font-size: 11px;">
                                <tr><td><strong>Bank:</strong></td><td>\${settings.bank_name || ''}</td></tr>
                                <tr><td><strong>A/c:</strong></td><td>\${settings.account_number || ''}</td></tr>
                                <tr><td><strong>IFSC:</strong></td><td>\${settings.ifsc_code || ''}</td></tr>
                            </table>
                        </div>
                        <div style="width: 35%; padding: 10px; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                            <div style="font-size: 11px;">For <strong>\${settings.shop_name || 'Aksharam Stationery And Mart'}</strong></div>
                            <div style="margin-top: 40px; font-size: 11px;">Authorized Signatory</div>
                        </div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 10px; margin-top: 5px;">Page 1 of 1</div>
            </div>
        \`;

        container.innerHTML = html;
    }
};

window.BillPrint = BillPrint;
