/**
 * report_generator.js - GSTR-1 and GSTR-3B Schema Generator
 */

const ReportGeneratorModule = {
    /**
     * Main function to generate the complete filing package
     * @param {Array} reconciledDetails - Results from ReconcileModule
     */
    generateFinalJSON(reconciledDetails) {
        const sales = window.GST_DATA.sales || [];
        
        return {
            metadata: {
                generated_at: new Date().toISOString(),
                software: "DataProcessor Pro v1.0"
            },
            gstr1: this.generateGSTR1(sales),
            gstr3b: this.generateGSTR3B(sales, reconciledDetails)
        };
    },

    /**
     * GSTR-1: Outward Supplies
     * B2B: Invoice level
     * B2C: Summary by State (Place of Supply)
     */
    generateGSTR1(sales) {
        const b2b = [];
        const b2cRaw = {};

        sales.forEach(inv => {
            const taxable = parseFloat(inv.taxable_value) || 0;
            const igst = parseFloat(inv.igst) || 0;
            const cgst = parseFloat(inv.cgst) || 0;
            const sgst = parseFloat(inv.sgst) || 0;

            if (inv.gstin_customer && inv.gstin_customer.length === 15) {
                // Logic for B2B
                b2b.push({
                    ctin: inv.gstin_customer,
                    inv: [{
                        inum: inv.invoice_no,
                        idt: inv.invoice_date,
                        val: taxable + igst + cgst + sgst,
                        pos: inv.place_of_supply || "00",
                        itms: [{
                            num: 1,
                            itm_det: {
                                txval: taxable,
                                iamt: igst,
                                camt: cgst,
                                samt: sgst
                            }
                        }]
                    }]
                });
            } else {
                // Logic for B2C (Summarized by Place of Supply)
                const pos = inv.place_of_supply || "Unknown";
                if (!b2cRaw[pos]) {
                    b2cRaw[pos] = { pos: pos, txval: 0, iamt: 0, camt: 0, samt: 0 };
                }
                b2cRaw[pos].txval += taxable;
                b2cRaw[pos].iamt += igst;
                b2cRaw[pos].camt += cgst;
                b2cRaw[pos].samt += sgst;
            }
        });

        return {
            b2b: b2b,
            b2cs: Object.values(b2cRaw) // B2C Small summary
        };
    },

    /**
     * GSTR-3B: Monthly Summary
     * Table 3.1: Tax on Outward Supplies
     * Table 4: Eligible ITC
     */
    generateGSTR3B(sales, reconciledDetails) {
        // Table 3.1 Calculation
        const table31 = sales.reduce((acc, curr) => {
            acc.txval += parseFloat(curr.taxable_value) || 0;
            acc.iamt += parseFloat(curr.igst) || 0;
            acc.camt += parseFloat(curr.cgst) || 0;
            acc.samt += parseFloat(curr.sgst) || 0;
            return acc;
        }, { txval: 0, iamt: 0, camt: 0, samt: 0 });

        // Table 4 Calculation (Only from Matched Invoices in Reconciliation)
        const matchedInvoices = reconciledDetails.filter(d => d.status === "MATCHED");
        
        // Note: In real scenarios, we map reconciledDetails back to original 
        // purchase records to get tax split (IGST/CGST/SGST)
        const itcTable4 = matchedInvoices.reduce((acc, curr) => {
            // We find the original purchase record to get the split
            const original = window.GST_DATA.purchase.find(p => p.invoice_no === curr.invoice_no);
            if (original) {
                acc.iamt += parseFloat(original.igst) || 0;
                acc.camt += parseFloat(original.cgst) || 0;
                acc.samt += parseFloat(original.sgst) || 0;
            }
            return acc;
        }, { iamt: 0, camt: 0, samt: 0 });

        return {
            table_3_1: {
                description: "Outward taxable supplies",
                ...this.roundValues(table31)
            },
            table_4: {
                description: "Eligible ITC",
                all_other_itc: this.roundValues(itcTable4)
            }
        };
    },

    /**
     * Utility to round all numeric values in an object to 2 decimal places
     */
    roundValues(obj) {
        const rounded = {};
        for (let key in obj) {
            if (typeof obj[key] === 'number') {
                rounded[key] = parseFloat(obj[key].toFixed(2));
            } else {
                rounded[key] = obj[key];
            }
        }
        return rounded;
    },

    /**
     * Triggers a browser download of the generated JSON
     */
    exportToJSON(data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `GST_FILING_${new Date().getTime()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
};

export default ReportGeneratorModule;
