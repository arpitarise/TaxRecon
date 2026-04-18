/**
 * cleaner.js - Data Standardization & Normalization Module
 */

const CleanerModule = {
    // Dictionary for standardizing common accounting headers
    columnMap: {
        "invoice_no": ["inv no", "invoice no", "invoice number", "vch no", "voucher no", "doc no"],
        "date": ["inv date", "invoice date", "voucher date", "date", "doc date"],
        "gstin": ["gstin", "uin", "gstin/uin", "registration no", "ctin"],
        "party_name": ["particulars", "party name", "supplier name", "customer name", "name"],
        "taxable_value": ["taxable value", "taxable amt", "taxable amount", "assessable value"],
        "cgst": ["cgst", "central tax", "central tax amount"],
        "sgst": ["sgst", "state tax", "state tax amount", "utgst"],
        "igst": ["igst", "integrated tax", "integrated tax amount"],
        "total_amount": ["total", "invoice amount", "grand total", "inv amt"]
    },

    /**
     * Main function to clean a specific dataset (array of objects)
     */
    cleanData(dataset) {
        if (!Array.isArray(dataset) || dataset.length === 0) return [];

        return dataset
            .filter(row => !this.isRowEmpty(row)) // Remove empty rows
            .map(row => {
                const cleanRow = {};
                
                for (let key in row) {
                    const value = row[key];
                    const standardKey = this.getStandardKey(key);
                    
                    // Clean the value based on the standardized key type
                    let cleanValue = value;

                    if (typeof value === 'string') {
                        cleanValue = value.trim();
                    }

                    if (standardKey === 'date') {
                        cleanValue = this.formatDate(value);
                    } else if (['taxable_value', 'cgst', 'sgst', 'igst', 'total_amount'].includes(standardKey)) {
                        cleanValue = this.formatNumber(value);
                    }

                    cleanRow[standardKey] = cleanValue;
                }
                return cleanRow;
            });
    },

    /**
     * Matches messy headers against the columnMap
     */
    getStandardKey(key) {
        const normalizedKey = key.toLowerCase().trim();
        for (const [standard, aliases] of Object.entries(this.columnMap)) {
            if (standard === normalizedKey || aliases.includes(normalizedKey)) {
                return standard;
            }
        }
        // If no match found, return slugified original key
        return normalizedKey.replace(/\s+/g, '_');
    },

    /**
     * Converts various date formats (Excel serial, Strings) to YYYY-MM-DD
     */
    formatDate(val) {
        if (!val) return "";
        
        let d;
        // Handle Excel Serial Dates (numbers)
        if (typeof val === 'number') {
            d = new Date(Math.round((val - 25569) * 86400 * 1000));
        } else {
            // Handle string dates (e.g., 01-04-2023 or 2023/04/01)
            d = new Date(val);
        }

        if (isNaN(d.getTime())) return val; // Return original if parsing fails

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Sanitizes numbers (removes commas, handles strings)
     */
    formatNumber(val) {
        if (val === null || val === undefined || val === "") return 0;
        if (typeof val === 'number') return val;
        
        // Remove commas and other non-numeric chars except decimal and minus
        const cleaned = val.toString().replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    },

    /**
     * Checks if a row is effectively empty
     */
    isRowEmpty(row) {
        return Object.values(row).every(v => v === null || v === undefined || v === "");
    },

    /**
     * Cleans the entire global state
     */
    cleanAll() {
        console.log("Starting Data Clean...");
        
        if (window.GST_DATA.sales.length > 0) {
            window.GST_DATA.sales = this.cleanData(window.GST_DATA.sales);
        }
        
        if (window.GST_DATA.purchase.length > 0) {
            window.GST_DATA.purchase = this.cleanData(window.GST_DATA.purchase);
        }

        if (window.GST_DATA.gstr2b.length > 0) {
            window.GST_DATA.gstr2b = this.cleanData(window.GST_DATA.gstr2b);
        }

        console.log("Data Cleaning Complete", window.GST_DATA);
        return window.GST_DATA;
    }
};

export default CleanerModule;
