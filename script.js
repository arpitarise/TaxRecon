/**
 * UI MODULE
 * Handles DOM updates
 */
const UIModule = {
    updateFileList(files) {
        const list = document.getElementById('file-list');
        if (files.length === 0) {
            list.innerHTML = '<li class="empty-msg">No files uploaded yet.</li>';
            return;
        }

        list.innerHTML = '';
        files.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
                <span>📄 ${file.name} <small>(${(file.size / 1024).toFixed(1)} KB)</small></span>
                <span style="color: var(--success)">✓ Ready</span>
            `;
            list.appendChild(li);
        });
    },

    log(message) {
        const logger = document.getElementById('status-log');
        const timestamp = new Date().toLocaleTimeString();
        logger.innerText = `[${timestamp}] ${message}`;
    }
};

/**
 * FILE HANDLING MODULE
 */
const FileModule = {
    uploadedFiles: [],

    handleFiles(files) {
        const validExtensions = ['json', 'xlsx'];
        
        Array.from(files).forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (validExtensions.includes(ext)) {
                this.uploadedFiles.push(file);
                UIModule.log(`Uploaded: ${file.name}`);
            } else {
                UIModule.log(`Error: ${file.name} is not a valid format.`);
            }
        });

        UIModule.updateFileList(this.uploadedFiles);
    }
};

/**
 * ACTION MODULE
 * Orchestrates processing logic
 */
const ActionModule = {
    init() {
        document.getElementById('btn-clean').onclick = () => this.process('Cleaning data sets...');
        document.getElementById('btn-map').onclick = () => this.process('Mapping schema columns...');
        document.getElementById('btn-validate').onclick = () => this.process('Validating data integrity...');
        document.getElementById('btn-reconcile').onclick = () => this.process('Reconciling accounts...');
        document.getElementById('btn-gst').onclick = () => this.process('Generating GST reports...');
        document.getElementById('btn-export').onclick = () => this.process('Exporting processed JSON...');
    },

    process(actionName) {
        if (FileModule.uploadedFiles.length === 0) {
            UIModule.log('Error: Please upload files first');
            return;
        }
        UIModule.log(`Action: ${actionName}`);
        // Here you would typically call a backend or a heavy parsing library
    }
};

/**
 * CORE APP INITIALIZATION
 */
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    // Trigger file dialog
    dropZone.onclick = () => fileInput.click();

    // Drag and Drop listeners
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    };

    dropZone.ondragleave = () => {
        dropZone.classList.remove('drag-over');
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        FileModule.handleFiles(e.dataTransfer.files);
    };

    // Manual file input listener
    fileInput.onchange = (e) => {
        FileModule.handleFiles(e.target.files);
    };

    // Initialize button actions
    ActionModule.init();
});
