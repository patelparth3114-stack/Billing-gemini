const QuotationPrint = {
    async print(billId) {
        try {
            const [billRes, inventoryRes, settingsRes] = await Promise.all([
                fetch(\`/api/bills/\${billId}\`),
                fetch('/api/items'),
                fetch('/api/settings')
            ]);
            
            const billData = await billRes.json();
            const inventoryData = await inventoryRes.json();
            const settingsData = await settingsRes.json();
            
            if (!billData.success || !inventoryData.success || !settingsData.success) {
                App.showToast('Failed to load data for quotation', 'error');
                return;
            }
            
            this.renderPrintView(billData.data, inventoryData.data, settingsData.data);
            window.print();
        } catch (error) {
            App.showToast('Error preparing quotation view', 'error');
        }
    },

    shuffleArray(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },

    renderPrintView(bill, inventory, settings) {
        const container = document.getElementById('print-container');
        container.innerHTML = ''; // Clear previous
        
        // Prepare items with prices from inventory
        const itemsWithPrices = bill.items.map(billItem => {
            const invItem = inventory.find(i => i.name === billItem.item_name);
            return {
                name: billItem.item_name,
                base: invItem ? invItem.base_price : billItem.rate,
                shopA: invItem ? invItem.shop_a_price : billItem.rate + 5,
                shopB: invItem ? invItem.shop_b_price : billItem.rate + 10
            };
        });

        // Generate 3 versions
        const v1Html = this.generateQuotationHTML(
            itemsWithPrices, 
            'base', 
            settings.shop_name || 'AKSHARAM STATIONERY AND MART', 
            "'Playfair Display', serif",
            bill.bill_number,
            bill.bill_date
        );

        const shuffledA = this.shuffleArray(itemsWithPrices);
        const v2Html = this.generateQuotationHTML(
            shuffledA, 
            'shopA', 
            'STATIONERY SUPPLIERS CO.', 
            "'Courier New', monospace",
            \`Q-\${Math.floor(Math.random() * 10000)}\`,
            bill.bill_date
        );

        const shuffledB = this.shuffleArray(itemsWithPrices);
        const v3Html = this.generateQuotationHTML(
            shuffledB, 
            'shopB', 
            'PREMIER OFFICE SOLUTIONS', 
            "Georgia, serif",
            \`EST-\${Math.floor(Math.random() * 10000)}\`,
            bill.bill_date
        );

        // Append all 3 with page breaks
        container.innerHTML = \`
            <div class="quote-page" style="page-break-after: always;">\${v1Html}</div>
            <div class="quote-page" style="page-break-after: always;">\${v2Html}</div>
            <div class="quote-page">\${v3Html}</div>
        \`;
    },

    generateQuotationHTML(items, priceKey, shopName, font, refNo, date) {
        let total = 0;
        
        const itemsHtml = items.map((item, index) => {
            const price = item[priceKey];
            total += price;
            return \`
                <tr>
                    <td style="text-align: center; border: 1px solid #000; padding: 8px;">\${index + 1}</td>
                    <td style="border: 1px solid #000; padding: 8px;">\${item.name}</td>
                    <td style="text-align: right; border: 1px solid #000; padding: 8px;">\${price.toFixed(2)}</td>
                </tr>
            \`;
        }).join('');

        return \`
            <div style="font-family: \${font}; font-size: 14px; line-height: 1.5; width: 100%; max-width: 800px; margin: 0 auto; padding-top: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="margin: 0; font-size: 28px; text-transform: uppercase;">\${shopName}</h1>
                    <h2 style="margin: 10px 0 0 0; font-size: 18px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">QUOTATION</h2>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div><strong>Ref No:</strong> \${refNo}</div>
                    <div><strong>Date:</strong> \${App.formatDate(date)}</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; width: 10%;">SR</th>
                            <th style="border: 1px solid #000; padding: 8px; width: 70%; text-align: left;">ITEM DESCRIPTION</th>
                            <th style="border: 1px solid #000; padding: 8px; width: 20%; text-align: right;">UNIT PRICE (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        \${itemsHtml}
                        <tr>
                            <td colspan="2" style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">TOTAL ESTIMATE:</td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">₹ \${total.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 50px; text-align: right;">
                    <div>For <strong>\${shopName}</strong></div>
                    <div style="margin-top: 40px;">Authorized Signatory</div>
                </div>
            </div>
        \`;
    }
};

window.QuotationPrint = QuotationPrint;
