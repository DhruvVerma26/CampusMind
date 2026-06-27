// CampusMind Admin Portal Logic

document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    setupDragAndDrop();
    setupFormHandler();
    loadInventory();
});

// Load the active theme from chatbot settings
function loadSavedTheme() {
    const savedSettings = localStorage.getItem('campusmind_settings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.theme) {
                document.documentElement.setAttribute('data-theme', settings.theme);
                
                const themeBtn = document.getElementById('theme-toggle');
                if (themeBtn) {
                    themeBtn.innerText = settings.theme === 'light' ? 'Dark Mode' : 'Light Mode';
                }
            }
        } catch (e) {
            console.error('Failed to parse saved settings for theme.', e);
        }
    }
}

// Toggle page theme and save state
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.innerText = newTheme === 'light' ? 'Dark Mode' : 'Light Mode';
    }
    
    // Save to settings
    const savedSettings = localStorage.getItem('campusmind_settings');
    let settings = { theme: newTheme, userName: 'User', systemInstruction: 'Answer strictly using context.' };
    
    if (savedSettings) {
        try {
            settings = JSON.parse(savedSettings);
            settings.theme = newTheme;
        } catch (e) {}
    }
    
    localStorage.setItem('campusmind_settings', JSON.stringify(settings));
}

// Global variable to keep track of selected files
let selectedFiles = [];

// Drag and drop zone setup
function setupDragAndDrop() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');

    if (!dropzone || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight dropzone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('highlight'), false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Handle selected files via file dialog
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleFiles(files) {
    const pdfs = Array.from(files).filter(file => file.name.lower().endsWith('.pdf') || file.type === 'application/pdf');
    
    if (pdfs.length === 0 && files.length > 0) {
        showStatus('Only PDF files are supported.', 'error');
        return;
    }

    selectedFiles = pdfs;
    updateFileListView();
}

function updateFileListView() {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    let html = '<div class="selected-files-title">Selected PDF files:</div>';
    selectedFiles.forEach((file, index) => {
        const sizeKB = (file.size / 1024).toFixed(1);
        html += `
            <div class="file-item">
                <div class="file-info">
                    <i class="far fa-file-pdf file-icon"></i>
                    <span class="file-name">${escapeHtml(file.name)}</span>
                    <span class="file-size">(${sizeKB} KB)</span>
                </div>
                <button type="button" class="remove-file-btn" onclick="removeSelectedFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    fileList.innerHTML = html;
}

function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    updateFileListView();
}

// Load current files active in ChromaDB
async function loadInventory() {
    const tbody = document.getElementById('inventoryBody');
    if (!tbody) return;

    try {
        const response = await fetch('/documents');
        const data = await response.json();

        if (response.ok && data.documents) {
            tbody.innerHTML = '';
            
            if (data.documents.length === 0) {
                tbody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
                            <i class="fas fa-info-circle" style="margin-right: 8px;"></i> No documents uploaded yet.
                        </td>
                    </tr>
                `;
                return;
            }

            data.documents.forEach(doc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="file-cell">
                        <i class="far fa-file-pdf" style="color: #ef4444; margin-right: 8px;"></i>
                        <span class="inventory-filename" title="${escapeHtml(doc.filename)}">${escapeHtml(doc.filename)}</span>
                    </td>
                    <td>
                        <span class="category-badge category-${doc.category.toLowerCase()}">
                            ${escapeHtml(doc.category)}
                        </span>
                    </td>
                    <td style="text-align: center;">${doc.pages}</td>
                    <td style="text-align: center;">${doc.chunks}</td>
                    <td style="text-align: center;">
                        <button class="delete-btn-action" onclick="deleteDocument('${escapeJsString(doc.filename)}')" title="Delete from knowledge base">
                            <i class="far fa-trash-alt"></i> Delete
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5" style="text-align: center; color: var(--error-color); padding: 30px;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i> Failed to load database index.
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5" style="text-align: center; color: var(--error-color); padding: 30px;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i> Server connection error.
                </td>
            </tr>
        `;
    }
}

// Handle Form Submission / File Upload
function setupFormHandler() {
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!uploadForm) return;

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (selectedFiles.length === 0) {
            showStatus('Please select at least one PDF file to upload.', 'error');
            return;
        }

        const category = document.getElementById('docCategory').value;
        const formData = new FormData();
        
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('category', category);

        // Disable UI
        uploadBtn.disabled = true;
        showStatus('🧠 Compiling PDF pages and updating knowledge graph. Please wait...', 'info');

        try {
            const response = await fetch('/upload_pdfs', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showStatus(`✅ ${result.status || 'Files processed successfully!'}`, 'success');
                
                // Reset upload state
                selectedFiles = [];
                updateFileListView();
                uploadForm.reset();
                
                // Refresh table
                loadInventory();
            } else {
                showStatus(`❌ Error: ${result.error || 'Failed to process files.'}`, 'error');
            }
        } catch (err) {
            console.error(err);
            showStatus('❌ Server connection failure: Could not index files.', 'error');
        } finally {
            uploadBtn.disabled = false;
        }
    });
}

// Delete Document from Vector DB
async function deleteDocument(filename) {
    if (!confirm(`Are you sure you want to permanently remove "${filename}" from the AI knowledge base?`)) {
        return;
    }

    try {
        const response = await fetch(`/documents/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (response.ok) {
            showStatus(`🗑️ Deleted "${filename}" successfully.`, 'success');
            loadInventory(); // Reload document list
        } else {
            showStatus(`❌ Error deleting: ${result.error || 'Request failed.'}`, 'error');
        }
    } catch (err) {
        console.error(err);
        showStatus('❌ Network failure: Could not delete document.', 'error');
    }
}

// Helper to show alert status
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    statusDiv.className = `status-box ${type}`;
    statusDiv.innerText = message;
    
    // Auto-scroll to status
    statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Utilities
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJsString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// Helper polyfill/method since lowercase on endswith doesn't exist
String.prototype.lower = function() {
    return this.toLowerCase();
};
