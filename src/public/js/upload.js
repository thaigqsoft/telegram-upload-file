// Upload page script for Telegram Upload Studio

const API_BASE = '/api';

const uploadForm = document.getElementById('upload-form');
const uploadMessage = document.getElementById('upload-message');
const logoutBtn = document.getElementById('upload-logout-btn');
const adminLogoutBtn = document.getElementById('upload-admin-logout-btn');
const uploadProgressCard = document.getElementById('upload-progress-card');
const uploadProgressLabel = document.getElementById('upload-progress-label');
const uploadProgressText = document.getElementById('upload-progress-text');
const uploadProgressChartElement = document.getElementById('upload-progress-chart');

let uploadProgressChart;
let chartInitialized = false;

const toastStyles = {
    success: 'rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 shadow-sm shadow-green-200/50',
    error: 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 shadow-sm shadow-rose-200/50',
    info: 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm shadow-slate-200/50'
};

document.addEventListener('DOMContentLoaded', () => {
    initializeUploadPage();
});

async function initializeUploadPage() {
    try {
        const sessionValid = await ensureSession();
        if (!sessionValid) {
            window.location.href = '/';
            return;
        }

        setupNavListeners();
        setupFormListener();
        initializeProgressChart();
    } catch (error) {
        console.error('Failed to initialize upload page:', error);
        showUploadMessage(`ไม่สามารถเริ่มต้นหน้าอัปโหลดได้: ${error.message}`, 'error');
    }
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

function setupFormListener() {
    if (!uploadForm || uploadForm.dataset.listenerAttached) {
        return;
    }
    uploadForm.addEventListener('submit', handleFileUpload);
    uploadForm.dataset.listenerAttached = 'true';
}

function initializeProgressChart() {
    if (chartInitialized || !uploadProgressChartElement) {
        return;
    }

    uploadProgressChart = new ApexCharts(uploadProgressChartElement, {
        chart: {
            type: 'radialBar',
            height: 280,
            toolbar: { show: false }
        },
        plotOptions: {
            radialBar: {
                hollow: {
                    size: '58%'
                },
                dataLabels: {
                    name: {
                        offsetY: 24,
                        color: '#cbd5f5',
                        fontSize: '12px',
                        fontWeight: 600
                    },
                    value: {
                        fontSize: '32px',
                        fontWeight: 700,
                        formatter: val => `${Math.round(val)}%`
                    }
                }
            }
        },
        colors: ['#34d399'],
        labels: ['Progress'],
        series: [0]
    });
    uploadProgressChart.render();
    chartInitialized = true;
}

async function handleFileUpload(event) {
    event.preventDefault();

    if (!uploadForm) {
        return;
    }

    const formData = new FormData(uploadForm);
    const file = formData.get('file');
    const chatId = (formData.get('chat_id') || '').toString().trim();
    const chatName = (formData.get('chat_name') || '').toString().trim();
    const messageThreadId = (formData.get('message_thread_id') || '').toString().trim();
    const tokenUpload = (formData.get('token_upload') || '').toString().trim();
    const captionRaw = (formData.get('caption') || '').toString();
    const caption = captionRaw.trim();

    if (!file) {
        showUploadMessage('กรุณาเลือกไฟล์ก่อนอัปโหลด', 'error');
        return;
    }

    if (!chatId) {
        showUploadMessage('กรุณาระบุ Chat ID', 'error');
        return;
    }

    if (!tokenUpload) {
        showUploadMessage('กรุณากรอก Upload Token', 'error');
        return;
    }

    if (caption.length > 1024) {
        showUploadMessage('Caption ต้องไม่เกิน 1024 ตัวอักษร', 'error');
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

        xhr.upload.addEventListener('progress', (eventProgress) => {
            if (eventProgress.lengthComputable) {
                const percentComplete = Math.round((eventProgress.loaded / eventProgress.total) * 100);
                updateUploadProgressChart(percentComplete);
                if (uploadProgressText) {
                    uploadProgressText.textContent = `${formatBytes(eventProgress.loaded)} จาก ${formatBytes(eventProgress.total)} uploaded`;
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
                showUploadMessage('อัปโหลดไฟล์ไปยัง Telegram สำเร็จแล้ว', 'success');
            } else {
                const response = safeJsonParse(xhr.responseText);
                showUploadMessage(`อัปโหลดไม่สำเร็จ: ${response.error || 'Unknown error'}`, 'error');
                uploadProgressCard?.classList.add('hidden');
            }
        });

        xhr.addEventListener('error', () => {
            uploadProgressCard?.classList.add('hidden');
            showUploadMessage('ระบบอัปโหลดขัดข้อง กรุณาลองใหม่อีกครั้ง', 'error');
        });

        xhr.open('POST', `${API_BASE}/upload`);
        xhr.send(formData);
    } catch (error) {
        uploadProgressCard?.classList.add('hidden');
        console.error('Upload error:', error);
        showUploadMessage(`อัปโหลดไม่สำเร็จ: ${error.message}`, 'error');
    }
}

function updateUploadProgressChart(progress) {
    const safeProgress = Math.min(Math.max(progress, 0), 100);
    if (uploadProgressChart) {
        uploadProgressChart.updateSeries([safeProgress]);
    }
    if (uploadProgressLabel) {
        uploadProgressLabel.textContent = `${safeProgress}%`;
    }
}

function showUploadMessage(text, type = 'info') {
    if (!uploadMessage) {
        return;
    }
    uploadMessage.className = toastStyles[type] || toastStyles.info;
    uploadMessage.textContent = text;
    uploadMessage.style.display = 'block';
    uploadMessage.classList.remove('hidden');
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
        showUploadMessage(`ออกจากระบบไม่สำเร็จ: ${error.message}`, 'error');
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
        showUploadMessage(`ออกจากระบบไม่สำเร็จ: ${error.message}`, 'error');
    }
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(1)} ${units[index]}`;
}

function safeJsonParse(payload) {
    try {
        return JSON.parse(payload);
    } catch (error) {
        return {};
    }
}

