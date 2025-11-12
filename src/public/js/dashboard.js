// Dashboard JavaScript for Telegram File Upload System

// API base URL
const API_BASE = '/api';

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginBtn = document.getElementById('login-btn');
const verifyBtn = document.getElementById('verify-btn');
const apiIdInput = document.getElementById('api-id');
const apiHashInput = document.getElementById('api-hash');
const phoneNumberInput = document.getElementById('phone-number');
const codeSection = document.getElementById('code-section');
const codeInput = document.getElementById('code');
const uploadForm = document.getElementById('upload-form');
const filesList = document.getElementById('files-list');
const chatMappingsList = document.getElementById('chat-mappings-list');
const refreshFilesBtn = document.getElementById('refresh-files');
const refreshMappingsBtn = document.getElementById('refresh-mappings');
const logoutBtn = document.getElementById('logout-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const uploadProgressChartElement = document.getElementById('upload-progress-chart');
const statusChartElement = document.getElementById('status-chart');
const mappingForm = document.getElementById('chat-mapping-form');
const mappingMessage = document.getElementById('mapping-message');
const mappingChatIdInput = document.getElementById('mapping-chat-id');
const mappingChatNameInput = document.getElementById('mapping-chat-name');
const mappingSubmitBtn = document.getElementById('mapping-submit-btn');
const cancelMappingBtn = document.getElementById('cancel-mapping-btn');
const loginMessage = document.getElementById('login-message');
const uploadProgressCard = document.getElementById('upload-progress-card');
const uploadProgressLabel = document.getElementById('upload-progress-label');
const uploadProgressText = document.getElementById('upload-progress-text');
const filterChatIdInput = document.getElementById('file-filter-chat-id');
const filterStartDateInput = document.getElementById('file-filter-start-date');
const filterEndDateInput = document.getElementById('file-filter-end-date');
const filterApplyBtn = document.getElementById('file-filter-apply');
const filterResetBtn = document.getElementById('file-filter-reset');

let uploadProgressChart;
let statusChart;
let chartsInitialized = false;
const mappingCache = new Map();
let isMappingEditMode = false;
let editingMappingId = null;
let originalMappingChatId = null;
let allFiles = [];
let filteredFiles = [];
let chatMappingsData = [];
let filesCurrentPage = 1;
const FILES_PAGE_SIZE = 50;
const chatMappingByChatId = new Map();
const fileFilters = {
    chatId: '',
    startDate: '',
    endDate: ''
};

const loginContext = {
    apiId: null,
    apiHash: null,
    phoneNumber: null
};

const toastStyles = {
    success: 'rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 shadow-sm shadow-green-200/50',
    error: 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 shadow-sm shadow-rose-200/50',
    info: 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm shadow-slate-200/50'
};

// Initialise dashboard when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (loginBtn) {
        loginBtn.addEventListener('click', handleSendCode);
    }
    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerifyCode);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleAdminLogout);
    }
    if (mappingForm) {
        mappingForm.addEventListener('submit', handleCreateMapping);
    }
    if (cancelMappingBtn) {
        cancelMappingBtn.addEventListener('click', exitMappingEditMode);
    }
    checkExistingSession();
});

async function checkExistingSession() {
    try {
        const response = await fetch(`${API_BASE}/auth/session`);
        if (response.ok) {
            showDashboard();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Error checking session:', error);
        showLogin();
    }
}

function showLogin() {
    loginSection?.classList.remove('hidden');
    dashboardSection?.classList.add('hidden');
    logoutBtn?.classList.add('hidden');
    if (chartsInitialized) {
        updateUploadProgressChart(0);
        updateStatusChart([]);
    }
    clearMappingMessage();
}

function showDashboard() {
    loginSection?.classList.add('hidden');
    dashboardSection?.classList.remove('hidden');
    logoutBtn?.classList.remove('hidden');

    initializeChartsIfNeeded();
    updateUploadProgressChart(0);

    loadFiles();
    loadChatMappings();
    setupDashboardEventListeners();
}

// Authentication Flow
async function handleSendCode(event) {
    event.preventDefault();

    if (!apiIdInput || !apiHashInput || !phoneNumberInput) {
        return;
    }

    const apiId = apiIdInput.value.trim();
    const apiHash = apiHashInput.value.trim();
    const phoneNumber = phoneNumberInput.value.trim();

    if (!apiId || !apiHash || !phoneNumber) {
        showMessage('Please fill in API ID, API Hash, and phone number.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_id: apiId,
                api_hash: apiHash,
                phone_number: phoneNumber
            })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send verification code.');
        }

        loginContext.apiId = apiId;
        loginContext.apiHash = apiHash;
        loginContext.phoneNumber = phoneNumber;

        showMessage('Verification code sent. Please check your Telegram client.', 'success');
        if (codeSection) {
            codeSection.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage(`Login failed: ${error.message}`, 'error');
    }
}

async function handleVerifyCode(event) {
    event.preventDefault();

    if (!codeInput) {
        return;
    }

    const code = codeInput.value.trim();
    if (!code) {
        showMessage('Please enter the verification code sent to Telegram.', 'error');
        return;
    }

    if (!loginContext.apiId || !loginContext.apiHash || !loginContext.phoneNumber) {
        showMessage('Missing login context. Please restart the login process.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/confirm-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_id: loginContext.apiId,
                api_hash: loginContext.apiHash,
                phone_number: loginContext.phoneNumber,
                code
            })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Verification failed');
        }

        showMessage('Login successful! Preparing the dashboard...', 'success');
        setTimeout(() => showDashboard(), 1200);
    } catch (error) {
        console.error('Verification error:', error);
        showMessage(`Verification failed: ${error.message}`, 'error');
    }
}

function setupDashboardEventListeners() {
    if (uploadForm && !uploadForm.dataset.listenerAttached) {
        uploadForm.addEventListener('submit', handleFileUpload);
        uploadForm.dataset.listenerAttached = 'true';
    }
    if (refreshFilesBtn && !refreshFilesBtn.dataset.listenerAttached) {
        refreshFilesBtn.addEventListener('click', loadFiles);
        refreshFilesBtn.dataset.listenerAttached = 'true';
    }
    if (refreshMappingsBtn && !refreshMappingsBtn.dataset.listenerAttached) {
        refreshMappingsBtn.addEventListener('click', () => {
            clearMappingMessage();
            exitMappingEditMode();
            loadChatMappings();
        });
        refreshMappingsBtn.dataset.listenerAttached = 'true';
    }
    if (filterApplyBtn && !filterApplyBtn.dataset.listenerAttached) {
        filterApplyBtn.addEventListener('click', handleApplyFileFilters);
        filterApplyBtn.dataset.listenerAttached = 'true';
    }
    if (filterResetBtn && !filterResetBtn.dataset.listenerAttached) {
        filterResetBtn.addEventListener('click', handleResetFileFilters);
        filterResetBtn.dataset.listenerAttached = 'true';
    }
    if (filesList && !filesList.dataset.paginationListenerAttached) {
        filesList.addEventListener('click', handleFilesPaginationClick);
        filesList.dataset.paginationListenerAttached = 'true';
    }
    if (filterChatIdInput && !filterChatIdInput.dataset.keyListenerAttached) {
        filterChatIdInput.addEventListener('keydown', handleFileFilterKeydown);
        filterChatIdInput.dataset.keyListenerAttached = 'true';
    }
    if (filterStartDateInput && !filterStartDateInput.dataset.changeListenerAttached) {
        filterStartDateInput.addEventListener('change', () => handleApplyFileFilters());
        filterStartDateInput.dataset.changeListenerAttached = 'true';
    }
    if (filterEndDateInput && !filterEndDateInput.dataset.changeListenerAttached) {
        filterEndDateInput.addEventListener('change', () => handleApplyFileFilters());
        filterEndDateInput.dataset.changeListenerAttached = 'true';
    }
}

function initializeChartsIfNeeded() {
    if (chartsInitialized) {
        return;
    }

    if (uploadProgressChartElement) {
        uploadProgressChart = new ApexCharts(uploadProgressChartElement, {
            chart: {
                type: 'bar',
                height: 200,
                sparkline: { enabled: true },
                toolbar: { show: false },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 600
                }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '45%',
                    distributed: true,
                    rangeBarOverlap: false,
                    dataLabels: {
                        position: 'bottom'
                    }
                }
            },
            colors: ['#6366f1'],
            grid: { show: false },
            xaxis: {
                max: 100,
                tickAmount: 4,
                labels: { show: false }
            },
            yaxis: {
                labels: { show: false }
            },
            dataLabels: {
                enabled: true,
                formatter: val => `${Math.round(val)}%`,
                offsetX: -6,
                style: {
                    fontSize: '14px',
                    fontWeight: '700',
                    colors: ['#ffffff']
                }
            },
            tooltip: { enabled: false },
            series: [{ data: [0] }]
        });
        uploadProgressChart.render();
    }

    if (statusChartElement) {
        statusChart = new ApexCharts(statusChartElement, {
            chart: {
                type: 'donut',
                height: 320,
                toolbar: { show: false }
            },
            labels: ['Uploaded', 'Pending', 'Failed'],
            series: [0, 0, 0],
            colors: ['#22c55e', '#f59e0b', '#ef4444'],
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '13px',
                    fontWeight: 600
                }
            },
            stroke: {
                width: 6,
                colors: ['#ffffff']
            },
            legend: {
                position: 'bottom',
                fontSize: '12px'
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            name: {
                                offsetY: 12,
                                fontSize: '12px'
                            },
                            value: {
                                fontSize: '28px',
                                fontWeight: '700',
                                formatter: val => `${val}`
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                fontSize: '14px',
                                fontWeight: '600',
                                formatter: w => {
                                    const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                    return `${sum}`;
                                }
                            }
                        }
                    }
                }
            }
        });
        statusChart.render();
    }

    chartsInitialized = true;
}

function updateUploadProgressChart(progress) {
    if (!uploadProgressChart) {
        return;
    }
    const safeProgress = Math.min(Math.max(progress, 0), 100);
    uploadProgressChart.updateSeries([{ data: [safeProgress] }]);
    if (uploadProgressLabel) {
        uploadProgressLabel.textContent = `${safeProgress}%`;
    }
}

function updateStatusChart(files) {
    if (!statusChart) {
        return;
    }
    const summary = { uploaded: 0, pending: 0, failed: 0 };
    if (Array.isArray(files)) {
        files.forEach(file => {
            if (summary[file.status] !== undefined) {
                summary[file.status] += 1;
            }
        });
    }
    statusChart.updateSeries([
        summary.uploaded,
        summary.pending,
        summary.failed
    ]);
}

// UI Helpers
function showMessage(text, type = 'info') {
    if (!loginMessage) {
        return;
    }
    loginMessage.className = toastStyles[type] || toastStyles.info;
    loginMessage.textContent = text;
    loginMessage.style.display = 'block';
    setTimeout(() => {
        loginMessage.style.display = 'none';
    }, 4000);
}

function showMappingMessage(text, type = 'info') {
    if (!mappingMessage) return;
    mappingMessage.className = toastStyles[type] || toastStyles.info;
    mappingMessage.textContent = text;
    mappingMessage.style.display = 'block';
}

function clearMappingMessage() {
    if (!mappingMessage) return;
    mappingMessage.style.display = 'none';
}

function exitMappingEditMode() {
    isMappingEditMode = false;
    editingMappingId = null;
    originalMappingChatId = null;
    mappingForm?.reset();
    if (mappingChatIdInput) {
        mappingChatIdInput.readOnly = false;
        mappingChatIdInput.classList.remove('bg-slate-100');
    }
    if (mappingSubmitBtn) {
        mappingSubmitBtn.textContent = 'Add Mapping';
    }
    if (cancelMappingBtn) {
        cancelMappingBtn.classList.add('hidden');
    }
}

function enterMappingEditMode(mapping) {
    isMappingEditMode = true;
    editingMappingId = mapping.id;
    originalMappingChatId = mapping.chat_id;

    if (mappingChatIdInput) {
        mappingChatIdInput.value = mapping.chat_id;
        mappingChatIdInput.readOnly = true;
        mappingChatIdInput.classList.add('bg-slate-100');
    }
    if (mappingChatNameInput) {
        mappingChatNameInput.value = mapping.chat_name;
    }
    if (mappingSubmitBtn) {
        mappingSubmitBtn.textContent = 'Update Mapping';
    }
    if (cancelMappingBtn) {
        cancelMappingBtn.classList.remove('hidden');
    }
    clearMappingMessage();
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(1)} ${units[index]}`;
}

function formatDateTime(value) {
    if (!value) {
        return 'ไม่ทราบเวลา';
    }
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'ไม่ทราบเวลา';
        }
        return date.toLocaleString();
    } catch (error) {
        return 'ไม่ทราบเวลา';
    }
}

const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

function escapeHtml(value) {
    if (typeof value !== 'string') {
        return value == null ? '' : String(value);
    }
    return value.replace(/[&<>"']/g, match => htmlEscapeMap[match]);
}

// File Upload
async function handleFileUpload(event) {
    event.preventDefault();

    const formData = new FormData(uploadForm);
    const file = formData.get('file');
    const chatId = (formData.get('chat_id') || '').toString().trim();
    const chatName = (formData.get('chat_name') || '').toString().trim();
    const messageThreadId = (formData.get('message_thread_id') || '').toString().trim();
    const tokenUpload = (formData.get('token_upload') || '').toString().trim();
    const captionRaw = (formData.get('caption') || '').toString();
    const caption = captionRaw.trim();

    if (!file) {
        alert('Please select a file to upload');
        return;
    }

    if (!chatId) {
        alert('Please enter a chat ID');
        return;
    }

    if (!tokenUpload) {
        alert('Please enter the upload token.');
        return;
    }

    if (caption.length > 1024) {
        alert('Caption must be 1024 characters or less.');
        return;
    }

    formData.set('chat_id', chatId);
    formData.set('chat_name', chatName);
    formData.set('message_thread_id', messageThreadId);
    formData.set('token_upload', tokenUpload);
    formData.set('caption', caption);

    uploadProgressCard?.classList.remove('hidden');
    updateUploadProgressChart(0);
    if (uploadProgressText) {
        uploadProgressText.textContent = 'Preparing upload...';
    }

    try {
        if (chatName) {
            await setChatName(chatId, chatName);
        }

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                updateUploadProgressChart(percentComplete);
                if (uploadProgressText) {
                    uploadProgressText.textContent = `${formatBytes(e.loaded)} of ${formatBytes(e.total)} uploaded`;
                }
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                updateUploadProgressChart(100);
                if (uploadProgressText) {
                    uploadProgressText.textContent = 'Upload complete!';
                }
                uploadForm.reset();
                setTimeout(() => {
                    uploadProgressCard?.classList.add('hidden');
                }, 1800);

                loadFiles();
                alert('File uploaded successfully!');
            } else {
                const response = JSON.parse(xhr.responseText);
                uploadProgressCard?.classList.add('hidden');
                alert(`Upload failed: ${response.error}`);
            }
        });

        xhr.addEventListener('error', () => {
            uploadProgressCard?.classList.add('hidden');
            alert('Upload failed. Please try again.');
        });

        xhr.open('POST', `${API_BASE}/upload`);
        xhr.send(formData);
    } catch (error) {
        uploadProgressCard?.classList.add('hidden');
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
    }
}

// File Table
async function loadFiles() {
    try {
        const response = await fetch(`${API_BASE}/files`);
        const files = await response.json();

        allFiles = Array.isArray(files) ? files : [];
        filteredFiles = [...allFiles];
        filesCurrentPage = 1;
        updateStatusChart(allFiles);
        renderFilesView({ resetPage: true });
    } catch (error) {
        console.error('Error loading files:', error);
        filesList.innerHTML = '<p class="p-4 text-sm text-rose-500">Error loading files. Please try again.</p>';
        updateStatusChart([]);
    }
}

// Chat Mappings
async function loadChatMappings() {
    try {
        const response = await fetch(`${API_BASE}/chat-mappings`);
        const mappings = await response.json();

        chatMappingsData = Array.isArray(mappings) ? mappings : [];
        chatMappingByChatId.clear();
        chatMappingsData.forEach(mapping => {
            if (mapping && typeof mapping.chat_id !== 'undefined') {
                chatMappingByChatId.set(mapping.chat_id, mapping);
            }
        });

        if (!chatMappingsData.length) {
            chatMappingsList.innerHTML = '<p class="p-4 text-sm text-slate-500">No chat mappings found.</p>';
        } else {
            renderChatMappingsTable(chatMappingsData);
        }

        if (allFiles.length) {
            renderFilesView({ keepPage: true });
        }
    } catch (error) {
        console.error('Error loading chat mappings:', error);
        chatMappingsList.innerHTML = '<p class="p-4 text-sm text-rose-500">Error loading chat mappings. Please try again.</p>';
    }
}

function renderChatMappingsTable(mappings) {
    mappingCache.clear();
    const mappingCards = mappings.map(mapping => {
        mappingCache.set(mapping.id, mapping);
        const date = formatDateTime(mapping.updated_at || mapping.created_at);
        const filesMapped = allFiles.filter(file => file.chat_id === mapping.chat_id).length;
        return `
            <div class="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-lg">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-indigo-500">Chat Mapping</p>
                        <h4 class="mt-1 text-base font-semibold text-slate-900">${escapeHtml(mapping.chat_name)}</h4>
                    </div>
                    <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">${filesMapped} file${filesMapped === 1 ? '' : 's'}</span>
                </div>
                <dl class="grid gap-2 text-sm text-slate-600">
                    <div class="flex items-center justify-between gap-3">
                        <dt class="text-slate-500">Chat ID</dt>
                        <dd class="font-mono text-xs text-slate-500">${escapeHtml(String(mapping.chat_id))}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                        <dt class="text-slate-500">Updated</dt>
                        <dd class="text-xs text-slate-400">${escapeHtml(date)}</dd>
                    </div>
                </dl>
                <div class="flex flex-wrap gap-2">
                    <button onclick="editMapping(${mapping.id})" class="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">Edit</button>
                    <button onclick="deleteMapping(${mapping.id})" class="inline-flex items-center rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-200">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    chatMappingsList.innerHTML = `
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            ${mappingCards}
        </div>
    `;
}

function handleApplyFileFilters(event) {
    if (event) {
        event.preventDefault();
    }
    fileFilters.chatId = filterChatIdInput?.value.trim() || '';
    fileFilters.startDate = filterStartDateInput?.value || '';
    fileFilters.endDate = filterEndDateInput?.value || '';
    applyFileFilters({ resetPage: true });
}

function handleResetFileFilters(event) {
    if (event) {
        event.preventDefault();
    }
    if (filterChatIdInput) {
        filterChatIdInput.value = '';
    }
    if (filterStartDateInput) {
        filterStartDateInput.value = '';
    }
    if (filterEndDateInput) {
        filterEndDateInput.value = '';
    }
    fileFilters.chatId = '';
    fileFilters.startDate = '';
    fileFilters.endDate = '';
    applyFileFilters({ resetPage: true });
}

function handleFileFilterKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleApplyFileFilters();
    }
}

function handleFilesPaginationClick(event) {
    const target = event.target.closest('[data-pagination]');
    if (!target) {
        return;
    }
    event.preventDefault();
    const totalPages = Math.max(1, Math.ceil(filteredFiles.length / FILES_PAGE_SIZE));
    const action = target.dataset.pagination;

    if (action === 'prev' && filesCurrentPage > 1) {
        filesCurrentPage -= 1;
        renderFilesView();
        return;
    }

    if (action === 'next' && filesCurrentPage < totalPages) {
        filesCurrentPage += 1;
        renderFilesView();
        return;
    }

    if (action === 'page') {
        const page = Number(target.dataset.page);
        if (!Number.isNaN(page) && page >= 1 && page <= totalPages && page !== filesCurrentPage) {
            filesCurrentPage = page;
            renderFilesView();
        }
    }
}

function applyFileFilters({ resetPage = false } = {}) {
    if (resetPage) {
        filesCurrentPage = 1;
    }
    if (!Array.isArray(allFiles)) {
        allFiles = [];
    }

    filteredFiles = allFiles.filter(file => {
        if (!file) {
            return false;
        }

        const chatIdMatch = fileFilters.chatId
            ? String(file.chat_id || '').toLowerCase().includes(fileFilters.chatId.toLowerCase())
            : true;

        const fileDate = file.created_at ? new Date(file.created_at) : null;
        const startDate = fileFilters.startDate ? new Date(fileFilters.startDate) : null;
        const endDate = fileFilters.endDate ? new Date(fileFilters.endDate) : null;

        let dateMatch = true;
        if (startDate && fileDate) {
            startDate.setHours(0, 0, 0, 0);
            dateMatch = dateMatch && fileDate >= startDate;
        }
        if (endDate && fileDate) {
            endDate.setHours(23, 59, 59, 999);
            dateMatch = dateMatch && fileDate <= endDate;
        }

        return chatIdMatch && dateMatch;
    });

    updateStatusChart(filteredFiles);
    renderFilesView({ keepPage: !resetPage });
}

function renderFilesView({ resetPage = false, keepPage = false } = {}) {
    if (!filesList) {
        return;
    }

    if (resetPage) {
        filesCurrentPage = 1;
    }

    if (!filteredFiles.length) {
        filesList.innerHTML = `
            <div class="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500">
                <span class="text-base font-semibold text-slate-700">ไม่พบข้อมูล</span>
                <p>ลองปรับตัวกรอง หรือรีเซ็ตตัวกรองเพื่อดูข้อมูลทั้งหมดอีกครั้ง</p>
            </div>
        `;
        return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredFiles.length / FILES_PAGE_SIZE));
    if (!keepPage || filesCurrentPage > totalPages) {
        filesCurrentPage = Math.min(filesCurrentPage, totalPages);
    }

    const startIndex = (filesCurrentPage - 1) * FILES_PAGE_SIZE;
    const currentItems = filteredFiles.slice(startIndex, startIndex + FILES_PAGE_SIZE);

    const cardsHtml = currentItems.map(file => renderFileCard(file)).join('');

    filesList.innerHTML = `
        <div class="space-y-6">
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                ${cardsHtml}
            </div>
            ${renderPaginationControls(totalPages, filteredFiles.length)}
        </div>
    `;
}

function renderFileCard(file) {
    const fileDate = formatDateTime(file.created_at);
    const statusBadge = buildFileStatusBadge(file);
    const storageBadge = buildStorageBadge(file);
    const mapping = chatMappingByChatId.get(file.chat_id);
    const mappingName = file.chat_name || mapping?.chat_name || 'ไม่มีการตั้งชื่อ';
    const hasMapping = Boolean(mapping || file.chat_name);

    const verifyButton = file.local_deleted
        ? `<button disabled class="inline-flex items-center rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-300">Verify</button>`
        : `<button onclick="verifyFile(${file.id})" class="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">Verify</button>`;

    return `
        <article class="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-lg">
            <div class="space-y-4">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">ไฟล์</p>
                        <h4 class="mt-1 text-base font-semibold text-slate-900">${escapeHtml(file.filename)}</h4>
                        <p class="text-xs text-slate-500">${escapeHtml(fileDate)}</p>
                    </div>
                    ${statusBadge}
                </div>
                <dl class="space-y-3 text-sm text-slate-600">
                    <div class="flex items-center justify-between gap-3">
                        <dt class="text-slate-500">Chat ID</dt>
                        <dd class="font-mono text-xs text-slate-500">${escapeHtml(String(file.chat_id || ''))}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                        <dt class="text-slate-500">Chat Mapping</dt>
                        <dd class="flex items-center gap-2">
                            <span class="rounded-full ${hasMapping ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} px-3 py-1 text-xs font-semibold">${hasMapping ? 'Mapped' : 'Not mapped'}</span>
                            <span class="text-xs font-medium text-slate-600">${escapeHtml(mappingName)}</span>
                        </dd>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                        <dt class="text-slate-500">สถานะไฟล์บนเซิร์ฟเวอร์</dt>
                        <dd>${storageBadge}</dd>
                    </div>
                </dl>
            </div>
            <div class="flex flex-wrap gap-2">
                ${verifyButton}
                <button onclick="deleteFile(${file.id})" class="inline-flex items-center rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-200">Delete</button>
            </div>
        </article>
    `;
}

function renderPaginationControls(totalPages, totalItems) {
    if (totalPages <= 1) {
        return `
            <div class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <span>ทั้งหมด ${totalItems} รายการ</span>
            </div>
        `;
    }

    const visiblePages = 5;
    let startPage = Math.max(1, filesCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + visiblePages - 1);
    startPage = Math.max(1, endPage - visiblePages + 1);

    const pageButtons = [];
    for (let page = startPage; page <= endPage; page += 1) {
        pageButtons.push(`
            <button data-pagination="page" data-page="${page}" class="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${page === filesCurrentPage ? 'bg-slate-900 text-white shadow-sm shadow-slate-300/50' : 'bg-white text-slate-600 hover:bg-slate-100'}">
                หน้า ${page}
            </button>
        `);
    }

    return `
        <div class="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs font-semibold text-slate-600 shadow-sm shadow-slate-200/40 md:flex-row md:items-center md:justify-between">
            <span>แสดง ${((filesCurrentPage - 1) * FILES_PAGE_SIZE) + 1}-${Math.min(filesCurrentPage * FILES_PAGE_SIZE, totalItems)} จาก ${totalItems} รายการ</span>
            <div class="flex flex-wrap items-center gap-2">
                <button data-pagination="prev" class="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 ${filesCurrentPage === 1 ? 'pointer-events-none opacity-40' : ''}">ก่อนหน้า</button>
                ${pageButtons.join('')}
                <button data-pagination="next" class="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 ${filesCurrentPage === totalPages ? 'pointer-events-none opacity-40' : ''}">ถัดไป</button>
            </div>
        </div>
    `;
}

function buildFileStatusBadge(file) {
    const status = file.status || 'unknown';
    if (status === 'pending') {
        return `
            <div class="flex flex-col items-end gap-2">
                <span class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">${escapeHtml(status)}</span>
                <div class="progress-mini"><div class="progress-mini-fill"></div></div>
            </div>
        `;
    }

    const badgeClass = status === 'uploaded'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-rose-100 text-rose-600';

    return `
        <span class="inline-flex items-center rounded-full ${badgeClass} px-3 py-1 text-xs font-semibold uppercase tracking-wide">${escapeHtml(status)}</span>
    `;
}

function buildStorageBadge(file) {
    if (file.local_deleted) {
        return `<span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Local Removed</span>`;
    }
    return `<span class="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Stored</span>`;
}

async function setChatName(chatId, chatName) {
    const response = await fetch(`${API_BASE}/chat-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, chat_name: chatName })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set chat name');
    }

    return response.json();
}

async function handleCreateMapping(event) {
    event.preventDefault();

    const chatId = mappingChatIdInput.value.trim();
    const chatName = mappingChatNameInput.value.trim();

    if (!chatId || !chatName) {
        showMappingMessage('Please fill in both fields.', 'error');
        return;
    }

    try {
        await setChatName(chatId, chatName);
        if (isMappingEditMode && editingMappingId) {
            showMappingMessage('Chat mapping updated successfully.', 'success');
        } else {
            showMappingMessage('Chat mapping saved successfully.', 'success');
        }
        exitMappingEditMode();
        mappingForm.reset();
        loadChatMappings();
    } catch (error) {
        showMappingMessage(`Failed to save mapping: ${error.message}`, 'error');
    }
}

async function deleteMappingById(id, showAlert = true) {
    const response = await fetch(`${API_BASE}/chat-mappings/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete mapping');
    }
    if (showAlert) {
        showMappingMessage('Chat mapping deleted successfully.', 'success');
    }
    if (isMappingEditMode && editingMappingId === id) {
        exitMappingEditMode();
    }
    loadChatMappings();
}

// Public helpers
window.verifyFile = async function(fileId) {
    try {
        const response = await fetch(`${API_BASE}/files/${fileId}/verify`);
        const result = await response.json();

        if (result.valid === true) {
            alert('File integrity verified successfully!');
        } else if (result.valid === false) {
            alert('File integrity check failed!');
        } else {
            alert(result.message || 'Local file no longer available for verification.');
        }
    } catch (error) {
        console.error('Error verifying file:', error);
        alert(`Error verifying file: ${error.message}`);
    }
};

window.deleteFile = async function(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/files/${fileId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete file');
        }
        loadFiles();
        loadChatMappings();
    } catch (error) {
        console.error('Error deleting file:', error);
        alert(`Failed to delete file: ${error.message}`);
    }
};

window.editMapping = function(id) {
    const mapping = mappingCache.get(id);
    if (!mapping) {
        showMappingMessage('Mapping not found.', 'error');
        return;
    }
    enterMappingEditMode(mapping);
};

window.deleteMapping = async function(id) {
    if (!confirm('Are you sure you want to delete this mapping?')) {
        return;
    }
    try {
        await deleteMappingById(id);
    } catch (error) {
        console.error('Error deleting mapping:', error);
        showMappingMessage(`Failed to delete mapping: ${error.message}`, 'error');
    }
};

async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to logout');
        }

        showMessage('Logged out successfully.', 'success');
        loginContext.apiId = null;
        loginContext.apiHash = null;
        loginContext.phoneNumber = null;
        codeSection.style.display = 'none';
        apiIdInput.value = '';
        apiHashInput.value = '';
        phoneNumberInput.value = '';
        codeInput.value = '';

        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
        showMessage(`Logout failed: ${error.message}`, 'error');
    }
}

async function handleAdminLogout() {
    if (!confirm('ต้องการออกจากระบบผู้ดูแลหรือไม่?')) {
        return;
    }
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST'
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to logout.');
        }
        window.location.href = '/login?loggedOut=1';
    } catch (error) {
        console.error('Admin logout error:', error);
        alert(`ออกจากระบบไม่สำเร็จ: ${error.message}`);
    }
}
