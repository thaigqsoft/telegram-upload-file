const API_BASE = '/api';

const mappingForm = document.getElementById('chat-mapping-form');
const mappingMessage = document.getElementById('mapping-message');
const mappingChatIdInput = document.getElementById('mapping-chat-id');
const mappingChatNameInput = document.getElementById('mapping-chat-name');
const mappingSubmitBtn = document.getElementById('mapping-submit-btn');
const cancelMappingBtn = document.getElementById('cancel-mapping-btn');
const mappingList = document.getElementById('chat-mappings-list');
const mappingStats = document.getElementById('chat-mapping-stats');
const refreshMappingsBtn = document.getElementById('refresh-mappings');
const logoutBtn = document.getElementById('mapping-logout-btn');
const adminLogoutBtn = document.getElementById('mapping-admin-logout-btn');

const toastStyles = {
    success: 'rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 shadow-sm shadow-green-200/50',
    error: 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 shadow-sm shadow-rose-200/50',
    info: 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm shadow-slate-200/50'
};

const mappingCache = new Map();
let isEditMode = false;
let editingMappingId = null;
let originalChatId = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeMappingPage().catch(error => {
        console.error('Failed to initialise mapping page:', error);
        showMappingMessage(`ไม่สามารถเปิดหน้า Chat Mappings ได้: ${error.message}`, 'error');
    });
});

async function initializeMappingPage() {
    const sessionValid = await ensureSession();
    if (!sessionValid) {
        window.location.href = '/';
        return;
    }

    setupNavListeners();
    setupFormListeners();
    await loadChatMappings();
}

async function ensureSession() {
    try {
        const response = await fetch(`${API_BASE}/auth/session`);
        if (!response.ok) {
            return false;
        }
        logoutBtn?.classList.remove('hidden');
        return true;
    } catch (error) {
        console.error('Session validation failed:', error);
        return false;
    }
}

function setupNavListeners() {
    if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
        logoutBtn.addEventListener('click', handleLogout);
        logoutBtn.dataset.listenerAttached = 'true';
    }
    if (adminLogoutBtn && !adminLogoutBtn.dataset.listenerAttached) {
        adminLogoutBtn.addEventListener('click', handleAdminLogout);
        adminLogoutBtn.dataset.listenerAttached = 'true';
    }
}

function setupFormListeners() {
    if (mappingForm && !mappingForm.dataset.listenerAttached) {
        mappingForm.addEventListener('submit', handleCreateOrUpdateMapping);
        mappingForm.dataset.listenerAttached = 'true';
    }
    if (cancelMappingBtn && !cancelMappingBtn.dataset.listenerAttached) {
        cancelMappingBtn.addEventListener('click', exitEditMode);
        cancelMappingBtn.dataset.listenerAttached = 'true';
    }
    if (refreshMappingsBtn && !refreshMappingsBtn.dataset.listenerAttached) {
        refreshMappingsBtn.addEventListener('click', () => {
            exitEditMode();
            loadChatMappings();
        });
        refreshMappingsBtn.dataset.listenerAttached = 'true';
    }
}

async function loadChatMappings() {
    try {
        if (mappingList) {
            mappingList.innerHTML = '<p class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading chat mappings...</p>';
        }
        const response = await fetch(`${API_BASE}/chat-mappings`);
        const mappings = await response.json();

        mappingCache.clear();
        if (Array.isArray(mappings)) {
            mappings.forEach(mapping => {
                if (mapping?.id != null) {
                    mappingCache.set(mapping.id, mapping);
                }
            });
        }

        renderChatMappings();
        updateMappingStats();
    } catch (error) {
        console.error('Error loading chat mappings:', error);
        if (mappingList) {
            mappingList.innerHTML = '<p class="rounded-xl border border-slate-200 bg-rose-50 p-4 text-sm font-medium text-rose-600">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</p>';
        }
        updateMappingStats(true);
    }
}

function renderChatMappings() {
    if (!mappingList) {
        return;
    }

    if (!mappingCache.size) {
        mappingList.innerHTML = '<p class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">ยังไม่มี Chat Mapping ในระบบ</p>';
        return;
    }

    const cards = Array.from(mappingCache.values()).map(mapping => {
        const date = formatDateTime(mapping.updated_at || mapping.created_at);
        return `
            <article class="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-lg">
                <div class="space-y-3">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-wide text-violet-500">Chat Mapping</p>
                            <h3 class="text-base font-semibold text-slate-900">${escapeHtml(mapping.chat_name)}</h3>
                        </div>
                        <span class="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">ID #${mapping.id}</span>
                    </div>
                    <dl class="space-y-2 text-sm text-slate-600">
                        <div class="flex items-center justify-between gap-3">
                            <dt class="text-slate-500">Chat ID</dt>
                            <dd class="font-mono text-xs text-slate-500">${escapeHtml(String(mapping.chat_id))}</dd>
                        </div>
                        <div class="flex items-center justify-between gap-3">
                            <dt class="text-slate-500">อัปเดตล่าสุด</dt>
                            <dd class="text-xs text-slate-400">${escapeHtml(date)}</dd>
                        </div>
                    </dl>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button data-action="edit" data-id="${mapping.id}" class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                        แก้ไข
                    </button>
                    <button data-action="delete" data-id="${mapping.id}" class="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-200">
                        ลบ
                    </button>
                </div>
            </article>
        `;
    }).join('');

    mappingList.innerHTML = cards;
    mappingList.querySelectorAll('[data-action]').forEach(button => {
        const action = button.dataset.action;
        const id = Number(button.dataset.id);
        if (Number.isNaN(id)) {
            return;
        }
        if (action === 'edit') {
            button.addEventListener('click', () => enterEditMode(id));
        } else if (action === 'delete') {
            button.addEventListener('click', () => deleteMapping(id));
        }
    });
}

function updateMappingStats(hasError = false) {
    if (!mappingStats) {
        return;
    }
    if (hasError) {
        mappingStats.textContent = 'ไม่สามารถดึงสถิติได้';
        return;
    }
    const total = mappingCache.size;
    if (!total) {
        mappingStats.textContent = 'ยังไม่มี Mapping';
        return;
    }
    const latest = Array.from(mappingCache.values()).reduce((acc, item) => {
        const timestamp = new Date(item.updated_at || item.created_at || 0).getTime();
        if (!acc || timestamp > acc.ts) {
            return { ts: timestamp, value: item };
        }
        return acc;
    }, null);
    const latestText = latest?.value ? formatDateTime(latest.value.updated_at || latest.value.created_at) : '-';
    mappingStats.textContent = `ทั้งหมด ${total} รายการ • อัปเดตล่าสุด ${latestText}`;
}

async function handleCreateOrUpdateMapping(event) {
    event.preventDefault();

    const chatId = mappingChatIdInput?.value.trim();
    const chatName = mappingChatNameInput?.value.trim();

    if (!chatId || !chatName) {
        showMappingMessage('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }

    try {
        await setChatName(chatId, chatName);
        showMappingMessage(isEditMode ? 'อัปเดต Chat Mapping สำเร็จ' : 'บันทึก Chat Mapping สำเร็จ', 'success');
        exitEditMode();
        await loadChatMappings();
    } catch (error) {
        console.error('Failed to save mapping:', error);
        showMappingMessage(error.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
    }
}

function enterEditMode(id) {
    const mapping = mappingCache.get(id);
    if (!mapping) {
        showMappingMessage('ไม่พบข้อมูล Mapping ที่เลือก', 'error');
        return;
    }
    isEditMode = true;
    editingMappingId = id;
    originalChatId = mapping.chat_id;
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
    showMappingMessage('แก้ไขข้อมูล Mapping และกด Update เพื่อบันทึก', 'info');
}

function exitEditMode() {
    isEditMode = false;
    editingMappingId = null;
    originalChatId = null;
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
    hideMappingMessage();
}

async function deleteMapping(id) {
    if (!confirm('ยืนยันการลบ Chat Mapping นี้หรือไม่?')) {
        return;
    }
    try {
        await deleteMappingById(id);
        showMappingMessage('ลบ Chat Mapping สำเร็จ', 'success');
        await loadChatMappings();
        exitEditMode();
    } catch (error) {
        console.error('Failed to delete mapping:', error);
        showMappingMessage(error.message || 'ลบข้อมูลไม่สำเร็จ', 'error');
    }
}

async function deleteMappingById(id) {
    const response = await fetch(`${API_BASE}/chat-mappings/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete mapping');
    }
}

async function setChatName(chatId, chatName) {
    const response = await fetch(`${API_BASE}/chat-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, chat_name: chatName })
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save mapping');
    }
    return response.json();
}

function showMappingMessage(text, type = 'info') {
    if (!mappingMessage) {
        return;
    }
    mappingMessage.className = toastStyles[type] || toastStyles.info;
    mappingMessage.textContent = text;
    mappingMessage.style.display = 'block';
    mappingMessage.classList.remove('hidden');
}

function hideMappingMessage() {
    if (!mappingMessage) {
        return;
    }
    mappingMessage.style.display = 'none';
    mappingMessage.classList.add('hidden');
}

async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST'
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to logout');
        }
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        showMappingMessage(`ออกจากระบบไม่สำเร็จ: ${error.message}`, 'error');
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
        showMappingMessage(`ออกจากระบบไม่สำเร็จ: ${error.message}`, 'error');
    }
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

