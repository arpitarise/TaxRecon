/**
 * export.js - File Generation & Download Module
 */

const ExportModule = {
    /**
     * Generic JSON Export
     * @param {Object} data - JavaScript object to export
     * @param {string} fileName - Name of the file
     */
    downloadJSON(data, fileName = 'gst_data.json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`Exported JSON: ${fileName}`);
    },

    /**
     * Generic Excel Export using SheetJS
     * @param {Array} data - Array of objects
     * @param {string} fileName - Name of the file
     * @param {string} sheetName - Tab name in Excel
     */
    downloadExcel(data, fileName = 'report.xlsx', sheetName = 'Data') {
        if (!data || data.length === 0) {
            console.error("No data available to export to Excel");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Generates the file and triggers download
        XLSX.writeFile(workbook, fileName);
        console.log(`Exported Excel: ${fileName}`);
    },

    /**
     * Specific: Export Reconciliation Results
     * @param {Array} results - The 'details' array from ReconcileModule
     */
    exportReconciliationReport(results) {
        const fileName = `Reconciliation_Report_${this.getTimestamp()}.xlsx`;
        this.downloadExcel(results, fileName, 'Recon_Details');
    },

    /**
     * Specific: Export Validation Error Report
     * @param {Object} report - The object returned from ValidatorModule.runValidation()
     */
    exportErrorReport(report) {
        const flatErrors = [];

        // Flatten the multi-dataset report for Excel
        ['sales', 'purchase', 'gstr2b'].forEach(category => {
            report[category].errors.forEach(err => {
                flatErrors.push({ Category: category.toUpperCase(), Type: 'ERROR', Row: err.row, Message: err.msg });
            });
            report[category].warnings.forEach(warn => {
                flatErrors.push({ Category: category.toUpperCase(), Type: 'WARNING', Row: warn.row, Message: warn.msg });
            });
        });

        if (flatErrors.length === 0) {
            alert("No errors found to export!");
            return;
        }

        const fileName = `Validation_Errors_${this.getTimestamp()}.xlsx`;
        this.downloadExcel(flatErrors, fileName, 'Errors_Warnings');
    },

    /**
     * Specific: Export GSTR-1 JSON (Govt Schema format)
     * @param {Object} gstr1Data - The gstr1 object from ReportGeneratorModule
     */
    exportGSTR1(gstr1Data) {
        const fileName = `GSTR1_Returns_${this.getTimestamp()}.json`;
        this.downloadJSON(gstr1Data, fileName);
    },

    /**
     * Helper to get formatted timestamp
     */
    getTimestamp() {
        const now = new Date();
        return now.toISOString().split('T')[0] + '_' + now.getHours() + now.getMinutes();
    }
};

export default ExportModule;
