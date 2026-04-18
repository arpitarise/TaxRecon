/**
 * reconcile.js - Purchase vs GSTR-2B Reconciliation Module
 */

const ReconcileModule = {
    /**
     * Main Reconciliation Logic
     */
    runReconciliation() {
        const books = window.GST_DATA.purchase || [];
        const portal = window.GST_DATA.gstr2b || [];

        const results = [];
        const portalMap = new Map();
        const matchedPortalIndices = new Set();

        // 1. Create a lookup map for Portal (GSTR-2B) data for O(1) access
        // Key: GSTIN + Invoice Number (normalized)
        portal.forEach((item, index) => {
            const key = this.generateKey(item.supplier_gstin, item.invoice_no);
            portalMap.set(key, { data: item, index: index });
        });

        // 2. Iterate through Books (Purchase Register)
        books.forEach(bookItem => {
            const key = this.generateKey(bookItem.supplier_gstin, bookItem.invoice_no);
            const portalMatch = portalMap.get(key);

            let status = "MISSING_IN_2B";
            let diff = 0;
            let portalTax = 0;

            if (portalMatch) {
                matchedPortalIndices.add(portalMatch.index);
                const portalVal = parseFloat(portalMatch.data.taxable_value) || 0;
                const bookVal = parseFloat(bookItem.taxable_value) || 0;
                diff = bookVal - portalVal;
                portalTax = parseFloat(portalMatch.data.tax_amount) || 0;

                if (Math.abs(diff) <= 5) {
                    status = "MATCHED";
                    diff = 0; // Ignore negligible difference
                } else {
                    status = "MISMATCH";
                }
            }

            results.push({
                invoice_no: bookItem.invoice_no,
                supplier_gstin: bookItem.supplier_gstin,
                status: status,
                difference_amount: diff.toFixed(2),
                book_taxable: bookItem.taxable_value,
                portal_taxable: portalMatch ? portalMatch.data.taxable_value : 0,
                itc_available: portalTax
            });
        });

        // 3. Identify records present on Portal but missing in Books
        portal.forEach((portalItem, index) => {
            if (!matchedPortalIndices.has(index)) {
                results.push({
                    invoice_no: portalItem.invoice_no,
                    supplier_gstin: portalItem.supplier_gstin,
                    status: "MISSING_IN_BOOKS",
                    difference_amount: 0,
                    book_taxable: 0,
                    portal_taxable: portalItem.taxable_value,
                    itc_available: portalItem.tax_amount
                });
            }
        });

        const summary = this.generateSummary(results);
        
        console.log("Reconciliation Complete:", { summary, details: results });
        return { summary, details: results };
    },

    /**
     * Normalizes keys to ensure matching works despite casing or leading zeros
     */
    generateKey(gstin, inv) {
        const cleanGst = String(gstin || "").trim().toUpperCase();
        const cleanInv = String(inv || "").trim().toUpperCase().replace(/^0+/, '');
        return `${cleanGst}_${cleanInv}`;
    },

    /**
     * Calculates summary statistics
     */
    generateSummary(results) {
        const summary = {
            total_matched: 0,
            total_mismatched: 0,
            missing_in_2b: 0,
            missing_in_books: 0,
            total_itc_eligible: 0
        };

        results.forEach(item => {
            if (item.status === "MATCHED") {
                summary.total_matched++;
                summary.total_itc_eligible += parseFloat(item.itc_available || 0);
            } else if (item.status === "MISMATCH") {
                summary.total_mismatched++;
                // In case of mismatch, usually the lower of the two or portal value is considered
                summary.total_itc_eligible += parseFloat(item.itc_available || 0);
            } else if (item.status === "MISSING_IN_2B") {
                summary.missing_in_2b++;
            } else if (item.status === "MISSING_IN_BOOKS") {
                summary.missing_in_books++;
            }
        });

        // Format for display
        summary.total_itc_eligible = summary.total_itc_eligible.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR'
        });

        return summary;
    }
};

export default ReconcileModule;
