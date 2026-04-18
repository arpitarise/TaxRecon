/**
 * validator.js - Data Integrity & GST Compliance Validation Module
 */

const ValidatorModule = {
    /**
     * Main Orchestrator
     */
    runValidation() {
        const report = {
            sales: this.validateDataset(window.GST_DATA.sales, 'SALES'),
            purchase: this.validateDataset(window.GST_DATA.purchase, 'PURCHASE'),
            gstr2b: this.validateDataset(window.GST_DATA.gstr2b, 'GSTR2B')
        };

        console.log("Validation Report:", report);
        return report;
    },

    /**
     * Validates a specific array of records
     */
    validateDataset(data, type) {
        const results = { errors: [], warnings: [] };
        const invoiceMap = new Set();

        if (!data || data.length === 0) return results;

        data.forEach((row, index) => {
            const rowIndex = index + 1; // 1-based indexing for user readability

            // 1. Missing Invoice Number (Error)
            if (!row.invoice_no) {
                results.errors.push({
                    row: rowIndex,
                    msg: "Missing Invoice Number"
                });
            }

            // 2. Duplicate Invoice Detection (Warning)
            if (row.invoice_no) {
                const id = `${row.invoice_no}_${row.supplier_gstin || row.gstin_customer}`;
                if (invoiceMap.has(id)) {
                    results.warnings.push({
                        row: rowIndex,
                        msg: `Duplicate Invoice Detected: ${row.invoice_no}`
                    });
                }
                invoiceMap.add(id);
            }

            // 3. GSTIN Format Check (Error)
            const gstin = row.supplier_gstin || row.gstin_customer;
            if (gstin && !this.isValidGSTIN(gstin)) {
                results.errors.push({
                    row: rowIndex,
                    msg: `Invalid GSTIN Format: ${gstin}`
                });
            }

            // 4. Invalid Date (Error)
            if (row.invoice_date && isNaN(Date.parse(row.invoice_date))) {
                results.errors.push({
                    row: rowIndex,
                    msg: `Invalid Date Format: ${row.invoice_date}`
                });
            }

            // 5. Tax Mismatch (Warning)
            // Logic: (IGST + CGST + SGST) should approximately equal Taxable Value * Rate
            // Since Rate isn't always in the file, we check if taxes exist when taxable value > 0
            const totalTax = (parseFloat(row.igst) || 0) + (parseFloat(row.cgst) || 0) + (parseFloat(row.sgst) || 0) || (parseFloat(row.tax_amount) || 0);
            const taxableVal = parseFloat(row.taxable_value) || 0;

            if (taxableVal > 0 && totalTax === 0) {
                results.warnings.push({
                    row: rowIndex,
                    msg: "Taxable value exists but tax amount is zero"
                });
            }

            // Fuzzy Rate Check (Example: check if tax is roughly 5%, 12%, 18%, or 28% of taxable)
            if (taxableVal > 0 && totalTax > 0) {
                const calculatedRate = (totalTax / taxableVal) * 100;
                const standardRates = [0, 5, 12, 18, 28];
                const isStandard = standardRates.some(rate => Math.abs(calculatedRate - rate) < 0.5);
                
                if (!isStandard) {
                    results.warnings.push({
                        row: rowIndex,
                        msg: `Non-standard tax rate detected (${calculatedRate.toFixed(2)}%)`
                    });
                }
            }
        });

        return results;
    },

    /**
     * Validates GSTIN: 15 Characters, Alphanumeric
     * Format: 22AAAAA0000A1Z5
     */
    isValidGSTIN(gstin) {
        const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstin.length === 15 && regex.test(gstin.toUpperCase());
    }
};

export default ValidatorModule;
