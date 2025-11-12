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
const filesList = document.getElementById('files-list');
const refreshFilesBtn = document.getElementById('refresh-files');
const logoutBtn = document.getElementById('logout-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const uploadProgressChartElement = document.getElementById('upload-progress-chart');
const statusChartElement = document.getElementById('status-chart');
const mappingStatsChartElement = document.getElementById('mapping-stats-chart');
const mappingStatsTotalBadge = document.getElementById('mapping-stats-total');
const mappingStatsSummary = document.getElementById('mapping-stats-summary');
const loginMessage = document.getElementById('login-message');
const filterChatIdInput = document.getElementById('file-filter-chat-id');
const filterChatMappingContainer = document.getElementById('file-filter-chat-mapping-container');
const filterChatMappingTrigger = document.getElementById('file-filter-chat-mapping-trigger');
const filterChatMappingTriggerLabel = document.getElementById('file-filter-chat-mapping-trigger-label');
const filterChatMappingPanel = document.getElementById('file-filter-chat-mapping-panel');
const filterChatMappingList = document.getElementById('file-filter-chat-mapping-list');
const filterChatMappingEmpty = document.getElementById('file-filter-chat-mapping-empty');
const filterStartDateInput = document.getElementById('file-filter-start-date');
const filterEndDateInput = document.getElementById('file-filter-end-date');
const filterApplyBtn = document.getElementById('file-filter-apply');
const filterResetBtn = document.getElementById('file-filter-reset');

let uploadProgressChart;
let statusChart;
let mappingStatsChart;
let chartsInitialized = false;
const DEFAULT_CHAT_MAPPING_LABEL = '-- ทั้งหมด --';
let isChatMappingPanelOpen = false;
let chatMappingGlobalListenersBound = false;
let allFiles = [];
let filteredFiles = [];
let chatMappingsData = [];
let filesCurrentPage = 1;
const FILES_PAGE_SIZE = 50;
const chatMappingByChatId = new Map();
const fileFilters = {
    chatId: '',
    chatMapping: '',
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
    if (refreshFilesBtn && !refreshFilesBtn.dataset.listenerAttached) {
        refreshFilesBtn.addEventListener('click', loadFiles);
        refreshFilesBtn.dataset.listenerAttached = 'true';
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
    if (filterChatMappingTrigger && !filterChatMappingTrigger.dataset.listenerAttached) {
        filterChatMappingTrigger.addEventListener('click', toggleChatMappingPanel);
        filterChatMappingTrigger.dataset.listenerAttached = 'true';
    }
    if (!chatMappingGlobalListenersBound && filterChatMappingContainer) {
        document.addEventListener('click', handleChatMappingDocumentClick);
        document.addEventListener('keydown', handleChatMappingKeydown);
        chatMappingGlobalListenersBound = true;
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

    if (mappingStatsChartElement) {
        mappingStatsChart = new ApexCharts(mappingStatsChartElement, {
            chart: {
                type: 'donut',
                height: 280,
                toolbar: { show: false }
            },
            labels: ['Mapped & In Use', 'Mapped (Unused)', 'Unmapped Chats'],
            series: [0, 0, 0],
            colors: ['#6366f1', '#c4b5fd', '#fda4af'],
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '13px',
                    fontWeight: 600
                }
            },
            stroke: {
                width: 4,
                colors: ['#ffffff']
            },
            legend: {
                position: 'bottom',
                fontSize: '12px'
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '72%',
                        labels: {
                            show: true,
                            name: {
                                offsetY: 12,
                                fontSize: '12px'
                            },
                            value: {
                                fontSize: '26px',
                                fontWeight: '700',
                                formatter: val => `${val}`
                            },
                            total: {
                                show: true,
                                label: 'Chats',
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
        mappingStatsChart.render();
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
        updateMappingStats();
    } catch (error) {
        console.error('Error loading files:', error);
        allFiles = [];
        filteredFiles = [];
        filesList.innerHTML = '<p class="p-4 text-sm text-rose-500">Error loading files. Please try again.</p>';
        updateStatusChart([]);
        updateMappingStats(true);
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

        updateMappingStats();

        if (allFiles.length) {
            renderFilesView({ keepPage: true });
        }
    } catch (error) {
        console.error('Error loading chat mappings:', error);
        chatMappingsData = [];
        chatMappingByChatId.clear();
        updateMappingStats(true);
    }
}

function resetMappingStatsUI() {
    if (mappingStatsChart) {
        mappingStatsChart.updateSeries([0, 0, 0]);
    }
    if (mappingStatsTotalBadge) {
        mappingStatsTotalBadge.textContent = 'Total 0';
    }
    if (filterChatMappingList) {
        filterChatMappingList.innerHTML = `
            <li>
                <button type="button" class="flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100 focus:bg-slate-100 focus:outline-none" data-chat-mapping-option="true" data-value="" data-label="${DEFAULT_CHAT_MAPPING_LABEL}">
                    <span class="font-medium text-slate-700">${DEFAULT_CHAT_MAPPING_LABEL}</span>
                    <span class="text-xs text-slate-400">แสดงทุก Chat ID</span>
                </button>
            </li>
        `;
        registerChatMappingOptionListeners();
    }
    if (filterChatMappingEmpty) {
        filterChatMappingEmpty.classList.add('hidden');
    }
    setChatMappingFilter('', DEFAULT_CHAT_MAPPING_LABEL, false);
    if (mappingStatsSummary) {
        mappingStatsSummary.innerHTML = `
            <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Mapped &amp; In Use</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">-</dd>
                <p class="mt-1 text-xs text-slate-400">ถูกใช้งานกับการอัปโหลดล่าสุด</p>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Mapped (Unused)</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">-</dd>
                <p class="mt-1 text-xs text-slate-400">พร้อมใช้งานสำหรับการอัปโหลด</p>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Unmapped Chats</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">-</dd>
                <p class="mt-1 text-xs text-slate-400">แนะนำให้ตั้งชื่อเพื่อความสะดวก</p>
            </div>
        `;
    }
}

function updateMappingStats(hasError = false) {
    if (!mappingStatsChart && !mappingStatsTotalBadge && !mappingStatsSummary && !filterChatMappingList) {
        return;
    }

    if (hasError) {
        resetMappingStatsUI();
        return;
    }

    const totalMappings = chatMappingsData.length;
    const currentValue = filterChatMappingTrigger?.dataset.selectedValue || '';
    let selectedLabel = DEFAULT_CHAT_MAPPING_LABEL;
    let hasCurrentSelection = currentValue === '';

    const dropdownOptions = [{
        value: '',
        label: DEFAULT_CHAT_MAPPING_LABEL,
        subtitle: 'แสดงทุก Chat ID'
    }];

    chatMappingsData.forEach(mapping => {
        const value = String(mapping.chat_id);
        const label = mapping.chat_name || value;
        dropdownOptions.push({
            value,
            label,
            subtitle: value
        });

        if (currentValue === value) {
            selectedLabel = label;
            hasCurrentSelection = true;
        }
    });

    if (!hasCurrentSelection) {
        setChatMappingFilter('', DEFAULT_CHAT_MAPPING_LABEL, false);
    } else {
        if (filterChatMappingTrigger) {
            filterChatMappingTrigger.dataset.selectedValue = hasCurrentSelection ? currentValue : '';
        }
        setChatMappingTriggerLabel(selectedLabel);
        fileFilters.chatMapping = hasCurrentSelection ? currentValue : '';
    }

    if (filterChatMappingList) {
        const selectedValue = filterChatMappingTrigger?.dataset.selectedValue || '';
        const itemsHtml = dropdownOptions.map(option => {
            const isSelected = selectedValue === option.value;
            const baseClasses = 'flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition focus:outline-none';
            const stateClasses = isSelected
                ? ' bg-indigo-50 text-indigo-600'
                : ' text-slate-600 hover:bg-slate-100';
            const subtitleColor = isSelected ? 'text-indigo-400' : 'text-slate-400';
            const safeLabel = escapeHtml(option.label);
            const safeValue = escapeHtml(option.value);
            const subtitle = option.subtitle
                ? `<span class="text-xs ${subtitleColor}">${escapeHtml(option.subtitle)}</span>`
                : '';
            return `
                <li>
                    <button type="button" class="${baseClasses}${stateClasses}" data-chat-mapping-option="true" data-value="${safeValue}" data-label="${safeLabel}">
                        <span class="flex-1 font-medium">${safeLabel}</span>
                        ${subtitle}
                    </button>
                </li>
            `;
        }).join('');
        filterChatMappingList.innerHTML = itemsHtml;
        registerChatMappingOptionListeners();
    }

    if (filterChatMappingEmpty) {
        if (chatMappingsData.length === 0) {
            filterChatMappingEmpty.classList.remove('hidden');
        } else {
            filterChatMappingEmpty.classList.add('hidden');
        }
    }

    const usedChatIds = new Set();
    allFiles.forEach(file => {
        if (file?.chat_id != null) {
            usedChatIds.add(String(file.chat_id));
        }
    });

    const usedMappings = chatMappingsData.filter(mapping => usedChatIds.has(String(mapping.chat_id))).length;
    const unusedMappings = Math.max(totalMappings - usedMappings, 0);
    const unmappedChats = Math.max(usedChatIds.size - usedMappings, 0);

    if (mappingStatsChart) {
        mappingStatsChart.updateSeries([
            usedMappings,
            unusedMappings,
            unmappedChats
        ]);
    }

    if (mappingStatsTotalBadge) {
        mappingStatsTotalBadge.textContent = `Total ${totalMappings}`;
    }

    if (mappingStatsSummary) {
        mappingStatsSummary.innerHTML = `
            <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Mapped &amp; In Use</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">${usedMappings}</dd>
                <p class="mt-1 text-xs text-slate-400">ถูกใช้งานกับการอัปโหลดล่าสุด</p>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Mapped (Unused)</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">${unusedMappings}</dd>
                <p class="mt-1 text-xs text-slate-400">พร้อมใช้งานสำหรับการอัปโหลด</p>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Unmapped Chats</dt>
                <dd class="mt-2 text-2xl font-semibold text-slate-900">${unmappedChats}</dd>
                <p class="mt-1 text-xs text-slate-400">แนะนำให้ตั้งชื่อเพื่อความสะดวก</p>
            </div>
        `;
    }
}

function handleApplyFileFilters(event) {
    if (event) {
        event.preventDefault();
    }
    fileFilters.chatId = filterChatIdInput?.value.trim() || '';
    fileFilters.chatMapping = filterChatMappingTrigger?.dataset.selectedValue || '';
    fileFilters.startDate = filterStartDateInput?.value || '';
    fileFilters.endDate = filterEndDateInput?.value || '';
    closeChatMappingPanel();
    applyFileFilters({ resetPage: true });
}

function handleResetFileFilters(event) {
    if (event) {
        event.preventDefault();
    }
    if (filterChatIdInput) {
        filterChatIdInput.value = '';
    }
    setChatMappingFilter('', DEFAULT_CHAT_MAPPING_LABEL, false);
    closeChatMappingPanel();
    if (filterStartDateInput) {
        filterStartDateInput.value = '';
    }
    if (filterEndDateInput) {
        filterEndDateInput.value = '';
    }
    fileFilters.chatId = '';
    fileFilters.chatMapping = '';
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
        const mappingMatch = fileFilters.chatMapping
            ? String(file.chat_id || '') === String(fileFilters.chatMapping)
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

        return chatIdMatch && mappingMatch && dateMatch;
    });

    updateStatusChart(filteredFiles);
    renderFilesView({ keepPage: !resetPage });
}

function setChatMappingTriggerLabel(label) {
    const displayLabel = label || DEFAULT_CHAT_MAPPING_LABEL;
    if (filterChatMappingTriggerLabel) {
        filterChatMappingTriggerLabel.textContent = displayLabel;
    }
}

function setChatMappingFilter(value, label, shouldApply = true) {
    const normalizedValue = value || '';
    if (filterChatMappingTrigger) {
        filterChatMappingTrigger.dataset.selectedValue = normalizedValue;
    }
    setChatMappingTriggerLabel(label);
    fileFilters.chatMapping = normalizedValue;
    if (shouldApply) {
        applyFileFilters({ resetPage: true });
    }
}

function registerChatMappingOptionListeners() {
    if (!filterChatMappingList) {
        return;
    }
    filterChatMappingList.querySelectorAll('button[data-chat-mapping-option]').forEach(button => {
        if (!button.dataset.listenerAttached) {
            button.addEventListener('click', handleChatMappingOptionClick);
            button.dataset.listenerAttached = 'true';
        }
    });
}

function handleChatMappingOptionClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    const value = target.dataset.value || '';
    const label = target.dataset.label || DEFAULT_CHAT_MAPPING_LABEL;
    setChatMappingFilter(value, label);
    closeChatMappingPanel();
}

function toggleChatMappingPanel(event) {
    event.preventDefault();
    event.stopPropagation();
    if (isChatMappingPanelOpen) {
        closeChatMappingPanel();
    } else {
        openChatMappingPanel();
    }
}

function openChatMappingPanel() {
    if (!filterChatMappingPanel) {
        return;
    }
    filterChatMappingPanel.classList.remove('hidden');
    isChatMappingPanelOpen = true;
    filterChatMappingTrigger?.setAttribute('aria-expanded', 'true');
}

function closeChatMappingPanel() {
    if (!filterChatMappingPanel) {
        return;
    }
    filterChatMappingPanel.classList.add('hidden');
    isChatMappingPanelOpen = false;
    filterChatMappingTrigger?.setAttribute('aria-expanded', 'false');
}

function handleChatMappingDocumentClick(event) {
    if (!isChatMappingPanelOpen) {
        return;
    }
    if (!filterChatMappingContainer?.contains(event.target)) {
        closeChatMappingPanel();
    }
}

function handleChatMappingKeydown(event) {
    if (event.key === 'Escape' && isChatMappingPanelOpen) {
        closeChatMappingPanel();
    }
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

    const rowsHtml = currentItems.map(file => renderFileRow(file)).join('');

    filesList.innerHTML = `
        <div class="space-y-5">
            <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
                <table class="min-w-full divide-y divide-slate-100">
                    <thead class="bg-slate-50">
                        <tr class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th class="px-4 py-3 text-left">ไฟล์</th>
                            <th class="px-4 py-3 text-left">Chat ID</th>
                            <th class="px-4 py-3 text-left">Chat Mapping</th>
                            <th class="px-4 py-3 text-left">สถานะ</th>
                            <th class="px-4 py-3 text-left">อัปเดตล่าสุด</th>
                            <th class="px-4 py-3 text-left">การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-sm text-slate-600">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            ${renderPaginationControls(totalPages, filteredFiles.length)}
        </div>
    `;
}

function renderFileRow(file) {
    const fileUpdatedAt = formatDateTime(file.updated_at || file.created_at);
    const fileCreatedAt = formatDateTime(file.created_at);
    const statusBadge = buildFileStatusBadge(file);
    const storageBadge = buildStorageBadge(file);
    const mapping = chatMappingByChatId.get(file.chat_id);
    const mappingName = file.chat_name || mapping?.chat_name || 'ไม่มีการตั้งชื่อ';
    const hasMapping = Boolean(mapping || file.chat_name);

    const verifyButton = file.local_deleted
        ? `<button disabled class="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-300">
                Verify
           </button>`
        : `<button onclick="verifyFile(${file.id})" class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                Verify
           </button>`;

    return `
        <tr class="align-top transition hover:bg-slate-50/60">
            <td class="px-4 py-4">
                <div class="flex flex-col gap-1">
                    <span class="font-semibold text-slate-700">${escapeHtml(file.filename)}</span>
                    <span class="text-xs text-slate-400">สร้างเมื่อ ${escapeHtml(fileCreatedAt)}</span>
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex flex-col gap-1">
                    <span class="font-mono text-xs text-slate-500">${escapeHtml(String(file.chat_id || ''))}</span>
                    <span class="text-xs text-slate-400">${hasMapping ? 'เชื่อมกับ Mapping' : 'ยังไม่ได้แมป'}</span>
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                    <span class="rounded-full ${hasMapping ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} px-3 py-1 text-xs font-semibold">
                        ${hasMapping ? 'Mapped' : 'Not mapped'}
                    </span>
                    <span class="text-xs font-medium text-slate-600">${escapeHtml(mappingName)}</span>
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex flex-col gap-2">
                    ${statusBadge}
                    ${storageBadge}
                </div>
            </td>
            <td class="px-4 py-4 text-xs text-slate-500">${escapeHtml(fileUpdatedAt)}</td>
            <td class="px-4 py-4">
                <div class="flex flex-wrap gap-2">
                    ${verifyButton}
                    <button onclick="deleteFile(${file.id})" class="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-200">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
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
            <div class="flex flex-col gap-1">
                <span class="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">${escapeHtml(status)}</span>
                <div class="progress-mini"><div class="progress-mini-fill"></div></div>
            </div>
        `;
    }

    const badgeClass = status === 'uploaded'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-rose-100 text-rose-600';

    return `
        <span class="inline-flex w-fit items-center rounded-full ${badgeClass} px-3 py-1 text-xs font-semibold uppercase tracking-wide">${escapeHtml(status)}</span>
    `;
}

function buildStorageBadge(file) {
    if (file.local_deleted) {
        return `<span class="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Local Removed</span>`;
    }
    return `<span class="inline-flex w-fit items-center rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Stored</span>`;
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
