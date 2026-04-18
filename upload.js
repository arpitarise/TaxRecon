/**
 * upload.js - Data Parsing & Classification Module
 */

// Initialize Global State
window.GST_DATA = {
    sales: [],
    purchase: [],
    gstr2b: []
};

const UploadModule = {
    /**
     * Entry point for processing files
     * @param {FileList} files 
     */
    async processFiles(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            const extension = file.name.split('.').pop().toLowerCase();
            
            try {
                if (extension === 'xlsx' || extension === 'xls') {
                    await this.parseExcel(file);
                } else if (extension === 'json') {
                    await this.parseJSON(file);
                }
            } catch (error) {
                console.error(`Error parsing ${file.name}:`, error);
                throw error;
            }
        }
        return window.GST_DATA;
    },

    /**
     * Parses Excel files using SheetJS
     */
    async parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert to JSON (raw:false treats dates/numbers as strings)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                
                this.identifyAndStore(jsonData, file.name);
                resolve();
            };
            
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Parses native JSON files
     */
    async parseJSON(file) {
        const text = await file.text();
        try {
            const jsonData = JSON.parse(text);
            this.identifyAndStore(jsonData, file.name);
        } catch (e) {
            console.error("Invalid JSON format");
        }
    },

    /**
     * Auto-detects data type based on common column headers
     */
    identifyAndStore(data, fileName) {
        if (!data || (Array.isArray(data) && data.length === 0)) return;

        // Extract first row to check headers
        const sample = Array.isArray(data) ? data[0] : data;
        const headers = Object.keys(sample).join(" ").toLowerCase();

        // 1. GSTR-2B Detection (JSON or Excel)
        // Look for common GSTR2B markers like "itclist", "b2b", or specific Govt headers
        if (headers.includes('itclist') || headers.includes('rtn_period') || headers.includes('gstr2b')) {
            console.log(`Detected GSTR-2B: ${fileName}`);
            
            // If it's the raw Govt JSON structure, extract the B2B array
            if (data.data && data.data.docdata) {
                window.GST_DATA.gstr2b = data.data.docdata; 
            } else {
                window.GST_DATA.gstr2b = Array.isArray(data) ? data : [data];
            }
            return;
        }

        // 2. Tally Sales Register Detection
        // Common Tally headers: Voucher No, Particulars, GSTIN/UIN, Voucher Type
        if (headers.includes('voucher no') || headers.includes('particulars') || headers.includes('vch no')) {
            console.log(`Detected Sales Register: ${fileName}`);
            window.GST_DATA.sales = data;
            return;
        }

        // 3. Purchase Register Detection
        // Common Purchase headers: Supplier Name, Invoice Number, Purchase Value
        if (headers.includes('supplier') || headers.includes('purchase') || headers.includes('inv no')) {
            console.log(`Detected Purchase Register: ${fileName}`);
            window.GST_DATA.purchase = data;
            return;
        }

        console.warn(`File ${fileName} could not be auto-categorized.`);
    }
};

export default UploadModule;
