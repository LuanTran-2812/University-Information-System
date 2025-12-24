// information.js - COMPLETELY FIXED VERSION

// ============================================
// GLOBAL STATE
// ============================================
let currentStudentInfo = null;
let currentAcademicData = null;
let currentTranscriptData = null;
let activeTab = 'personal-info';
let isInitialized = false;

// ============================================
// MAIN INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM sẵn sàng, khởi động hệ thống...');
    
    // Initialize everything
    initializeSystem();
});

function initializeSystem() {
    if (isInitialized) {
        console.log('⚠️ Hệ thống đã được khởi tạo trước đó');
        return;
    }
    
    console.log('🔧 Khởi tạo hệ thống...');
    
    try {
        // 1. Khởi tạo tabs trước
        initializeTabs();
        
        // 2. Thiết lập sự kiện
        setupEventListeners();
        
        // 3. Tải dữ liệu ban đầu
        setTimeout(loadInitialData, 100);
        
        // 4. Thiết lập scroll
        setupScrollHandling();
        
        isInitialized = true;
        console.log('✅ Hệ thống khởi tạo thành công');
        
    } catch (error) {
        console.error('❌ Lỗi khởi tạo hệ thống:', error);
    }
}

// ============================================
// TAB MANAGEMENT - SIMPLE & WORKING
// ============================================
function initializeTabs() {
    console.log('🔧 Khởi tạo tabs...');
    
    // Get all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log(`Tìm thấy ${tabButtons.length} nút tab`);
    
    if (tabButtons.length === 0) {
        console.error('❌ Không tìm thấy nút tab!');
        return;
    }
    
    // Determine initial tab
    const initialTab = getInitialTab();
    activeTab = initialTab;
    
    console.log(`📌 Tab mặc định: ${activeTab}`);
    
    // Show initial tab
    showTabContent(activeTab);
    
    // Add click event listeners
    tabButtons.forEach(button => {
        // Remove any existing listeners first
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add click event
        newButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            const tabId = this.getAttribute('data-tab');
            console.log(`🖱️ Clicked tab: ${tabId}`);
            
            if (!tabId) {
                console.error('❌ Tab không có data-tab attribute!');
                return;
            }
            
            if (tabId === activeTab) {
                console.log('ℹ️ Tab đã được chọn');
                return;
            }
            
            switchToTab(tabId);
        });
        
        // Add hover effect
        newButton.addEventListener('mouseenter', function() {
            if (this.getAttribute('data-tab') !== activeTab) {
                this.style.backgroundColor = '#F0F3FF';
            }
        });
        
        newButton.addEventListener('mouseleave', function() {
            if (this.getAttribute('data-tab') !== activeTab) {
                this.style.backgroundColor = '';
            }
        });
    });
    
    console.log('✅ Tab system ready');
}

function getInitialTab() {
    // Check URL hash
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        if (isValidTab(hash)) {
            console.log(`📌 Sử dụng tab từ URL: ${hash}`);
            return hash;
        }
    }
    
    // Check localStorage
    const savedTab = localStorage.getItem('studentInfoActiveTab');
    if (savedTab && isValidTab(savedTab)) {
        console.log(`📌 Sử dụng tab đã lưu: ${savedTab}`);
        return savedTab;
    }
    
    // Default tab
    return 'personal-info';
}

function isValidTab(tabId) {
    const validTabs = ['personal-info', 'learning-progress', 'transcript'];
    const isValid = validTabs.includes(tabId);
    console.log(`Checking if ${tabId} is valid: ${isValid}`);
    return isValid;
}

function showTabContent(tabId) {
    console.log(`🎯 Showing tab: ${tabId}`);
    
    // 1. Hide ALL tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
        pane.classList.remove('active');
    });
    
    // 2. Show the selected tab pane
    const targetPane = document.getElementById(`${tabId}-tab`);
    if (targetPane) {
        targetPane.style.display = 'block';
        setTimeout(() => {
            targetPane.classList.add('active');
        }, 50);
    } else {
        console.error(`❌ Không tìm thấy tab pane: ${tabId}-tab`);
        return;
    }
    
    // 3. Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = '';
    });
    
    const activeButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.style.backgroundColor = '#F0F3FF';
    }
    
    // 4. Scroll to top of tab content
    const tabContent = document.querySelector('.tab-content');
    if (tabContent) {
        tabContent.scrollTop = 0;
    }
    
    console.log(`✅ Tab ${tabId} is now visible`);
}

function switchToTab(tabId) {
    console.log(`🔄 Switching from ${activeTab} to ${tabId}`);
    
    if (!isValidTab(tabId)) {
        console.error(`❌ Tab không hợp lệ: ${tabId}`);
        return;
    }
    
    if (tabId === activeTab) {
        console.log('ℹ️ Tab đã được chọn');
        return;
    }
    
    // Show the new tab
    showTabContent(tabId);
    
    // Update active tab
    activeTab = tabId;
    
    // Save to localStorage
    localStorage.setItem('studentInfoActiveTab', tabId);
    
    // Update URL
    window.history.replaceState(null, null, `#${tabId}`);
    
    // Load data if needed
    loadDataForTab(tabId);
    
    console.log(`✅ Successfully switched to tab: ${tabId}`);
}

// ============================================
// DATA LOADING
// ============================================
async function loadInitialData() {
    console.log('📊 Loading initial data...');
    
    try {
        // Show loading for active tab
        showLoading(activeTab);
        
        // Load data for active tab first
        await loadDataForTab(activeTab);
        
        // Load other tabs in background
        const otherTabs = ['personal-info', 'learning-progress', 'transcript']
            .filter(tab => tab !== activeTab);
        
        for (const tab of otherTabs) {
            try {
                await loadDataForTab(tab);
            } catch (error) {
                console.warn(`⚠️ Không thể tải dữ liệu cho ${tab}:`, error);
            }
        }
        
        hideLoading(activeTab);
        console.log('✅ All data loaded');
        
    } catch (error) {
        hideLoading(activeTab);
        console.error('❌ Lỗi tải dữ liệu:', error);
        showMessage('Không thể tải dữ liệu. Vui lòng thử lại.', 'error');
    }
}

async function loadDataForTab(tabId) {
    console.log(`📥 Loading data for tab: ${tabId}`);
    
    // Check if data is already loaded
    let dataLoaded = false;
    switch(tabId) {
        case 'personal-info': dataLoaded = !!currentStudentInfo; break;
        case 'learning-progress': dataLoaded = !!currentAcademicData; break;
        case 'transcript': dataLoaded = !!currentTranscriptData; break;
    }
    
    if (dataLoaded) {
        console.log(`ℹ️ Data for ${tabId} already loaded`);
        return;
    }
    
    // Show loading
    if (tabId !== activeTab) {
        // Only show loading for non-active tabs if we're explicitly loading them
        showLoading(tabId);
    }
    
    try {
        switch(tabId) {
            case 'personal-info':
                currentStudentInfo = await fetchStudentInfo();
                updatePersonalInfo(currentStudentInfo);
                break;
            case 'learning-progress':
                currentAcademicData = await fetchAcademicData();
                updateAcademicInfo(currentAcademicData);
                break;
            case 'transcript':
                currentTranscriptData = await fetchTranscriptData();
                updateTranscriptInfo(currentTranscriptData);
                break;
        }
        
        console.log(`✅ Data loaded for ${tabId}`);
        
    } catch (error) {
        console.error(`❌ Failed to load data for ${tabId}:`, error);
        throw error;
        
    } finally {
        if (tabId !== activeTab) {
            hideLoading(tabId);
        }
    }
}

// ============================================
// DATA FETCHING (Mock data)
// ============================================
async function fetchStudentInfo() {
    console.log('📡 Fetching student info...');

    try {
        const res = await fetch('http://localhost:8000/api/student/profile', {
            method: 'GET',
            credentials: 'include', // nếu dùng session / cookie
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${token}` // nếu dùng JWT
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        // 🔥 BẮT BUỘC parse JSON
        const response = await res.json();
        console.log('📦 API response:', response);

        if (!response.success) {
            throw new Error(response.message || 'API trả về success=false');
        }

        return {
            HoTen: response.data.fullName,
            MSSV: response.data.studentId,
            Email: response.data.email,
            DiaChi: response.data.address,
            Khoa: response.data.faculty,
            NgaySinh: response.data.birthDate,
            GioiTinh: response.data.gender,
            Avatar: response.data.avatar || '../img/image 10.png'
        };

    } catch (error) {
        console.error('❌ Error fetching student info:', error);
        return null; // để UI không crash
    }
}

async function fetchAcademicData() {
    console.log('📡 Fetching academic data...');
    
    try {
        const response = await fetch('http://localhost:8000/api/student/academic-data');
        
        if (response.success) {
            return {
                currentSemester: response.data.currentSemester,
                earnedCredits: response.data.earnedCredits,
                totalCredits: response.data.totalCredits || 132,
                currentGPA: response.data.currentGPA,
                maxGPA: response.data.maxGPA || 4.0,
                gpaLevel: response.data.gpaLevel,
                classRank: response.data.classRank,
                gpaTrend: response.data.gpaTrend || []
            };
        }
        throw new Error(response.message || 'Failed to fetch academic data');
    } catch (error) {
        console.error('❌ Error fetching academic data:', error);
        throw error;
    }
}

async function fetchTranscriptData() {
    console.log('📡 Fetching transcript data...');
    
    try {
        const response = await fetch('http://localhost:8000/api/student/transcript');
        
        if (response.success) {
            return {
                overallGPA: response.data.overallGPA,
                totalCredits: response.data.totalCredits,
                earnedCredits: response.data.earnedCredits,
                rank: response.data.rank,
                semesters: response.data.semesters || []
            };
        }
        throw new Error(response.message || 'Failed to fetch transcript data');
    } catch (error) {
        console.error('❌ Error fetching transcript data:', error);
        throw error;
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================
function updatePersonalInfo(data) {
    if (!data) return;
    
    console.log('🔄 Updating personal info');
    
    const elements = {
        'student-name': data.HoTen || 'Chưa cập nhật',
        'student-id': `MSSV: ${data.MSSV || 'N/A'}`,
        'email': data.Email || 'N/A',
        'phone': data.SDT || 'N/A',
        'address': data.DiaChi || 'N/A',
        'faculty': data.Khoa || 'N/A',
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
    // Update avatar
    const avatar = document.getElementById('student-avatar');
    if (avatar && data.Avatar) {
        avatar.src = data.Avatar;
    }
    
    if (data.isMockData) {
        showMockIndicator('personal-info');
    }
}

function updateAcademicInfo(data) {
    if (!data) return;
    
    console.log('🔄 Updating academic info');
    
    // Update credits
    const earnedCredits = data.earnedCredits || 0;
    const totalCredits = data.totalCredits || 132;
    const creditPercent = totalCredits > 0 ? (earnedCredits / totalCredits * 100).toFixed(1) : 0;
    
    document.getElementById('earned-credits').textContent = earnedCredits;
    document.getElementById('credit-percentage').textContent = `${creditPercent}%`;
    document.getElementById('completed-credits').textContent = `${earnedCredits} TC`;
    document.getElementById('remaining-credits').textContent = `${totalCredits - earnedCredits} TC`;
    
    const creditBar = document.getElementById('credit-progress-bar');
    if (creditBar) {
        creditBar.style.width = `${Math.min(creditPercent, 100)}%`;
    }
    
    // Update GPA
    const currentGPA = data.currentGPA || 0;
    document.getElementById('current-gpa').textContent = currentGPA.toFixed(1);
    document.getElementById('gpa-rank').textContent = data.gpaLevel || 'Khá';
    document.getElementById('class-rank').textContent = data.classRank || 'N/A';
    
    const gpaBar = document.getElementById('gpa-progress-bar');
    if (gpaBar) {
        const gpaPercent = (currentGPA / 4.0 * 100).toFixed(0);
        document.getElementById('gpa-percentage').textContent = `${gpaPercent}%`;
        gpaBar.style.width = `${Math.min(gpaPercent, 100)}%`;
    }
    
    if (data.isMockData) {
        showMockIndicator('learning-progress');
    }
}

function updateTranscriptInfo(data) {
    if (!data) return;
    
    console.log('🔄 Updating transcript info');
    
    document.getElementById('transcript-gpa').textContent = data.overallGPA?.toFixed(1) || '0.0';
    document.getElementById('transcript-credits').textContent = data.totalCredits || '0';
    document.getElementById('transcript-earned-credits').textContent = data.earnedCredits || '0';
    document.getElementById('transcript-rank').textContent = data.rank || 'N/A';
    
    if (data.isMockData) {
        showMockIndicator('transcript');
    }
}

// ============================================
// EVENT HANDLERS
// ============================================
function setupEventListeners() {
    console.log('🔗 Setting up event listeners...');
    
    // Search
    const searchInput = document.getElementById('info-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();
            if (query) {
                console.log(`🔍 Searching: ${query}`);
            }
        });
    }
    
    // Edit profile button
    const editBtn = document.querySelector('.btn-edit-profile');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            showMessage('Chức năng chỉnh sửa thông tin đang được phát triển', 'info');
        });
    }
    
    // Change avatar button
    const changeAvatarBtn = document.querySelector('.btn-change-avatar');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            showMessage('Chức năng đổi ảnh đại diện đang được phát triển', 'info');
        });
    }
    
    // Print transcript button
    const printBtn = document.getElementById('btn-print-transcript');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            showMessage('Chức năng in bảng điểm đang được phát triển', 'info');
        });
    }
    
    // Download transcript button
    const downloadBtn = document.getElementById('btn-download-transcript');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<span class="material-symbols-outlined">download</span> Đang tải...';
            downloadBtn.disabled = true;
            
            setTimeout(() => {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
                showMessage('Bảng điểm đã được tải xuống thành công!', 'success');
            }, 1500);
        });
    }
    
    // Apply filters button
    const applyBtn = document.querySelector('.btn-apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            console.log('Applying filters...');
        });
    }
    
    // Handle hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        if (hash && isValidTab(hash) && hash !== activeTab) {
            switchToTab(hash);
        }
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function setupScrollHandling() {
    const tabContent = document.querySelector('.tab-content');
    if (tabContent) {
        tabContent.style.overflowY = 'auto';
        tabContent.style.scrollBehavior = 'smooth';
    }
}

function showLoading(tabId) {
    const tab = document.getElementById(`${tabId}-tab`);
    if (!tab) return;
    
    const existing = tab.querySelector('.tab-loading');
    if (existing) return;
    
    const loading = document.createElement('div');
    loading.className = 'tab-loading';
    loading.innerHTML = `
        <div class="spinner"></div>
        <p>Đang tải dữ liệu...</p>
    `;
    
    tab.appendChild(loading);
}

function hideLoading(tabId) {
    const tab = document.getElementById(`${tabId}-tab`);
    if (!tab) return;
    
    const loading = tab.querySelector('.tab-loading');
    if (loading) {
        loading.remove();
    }
}

function showMockIndicator(tabId) {
    const tab = document.getElementById(`${tabId}-tab`);
    if (!tab) return;
    
    if (tab.querySelector('.mock-data-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'mock-data-indicator';
    indicator.innerHTML = `
        <div class="indicator-content">
            <span class="material-symbols-outlined">info</span>
            <span>Đang sử dụng dữ liệu mẫu</span>
        </div>
    `;
    
    tab.insertBefore(indicator, tab.firstChild);
    
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 500);
        }
    }, 5000);
}

function showMessage(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `global-notification ${type}`;
    notification.innerHTML = `
        <span class="material-symbols-outlined">
            ${type === 'success' ? 'check_circle' : 
              type === 'error' ? 'error' : 'info'}
        </span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// DEBUG FUNCTIONS (for console testing)
// ============================================
window.debugTabs = function() {
    console.log('=== DEBUG TAB SYSTEM ===');
    console.log('Active tab:', activeTab);
    console.log('System initialized:', isInitialized);
    
    const buttons = document.querySelectorAll('.tab-btn');
    console.log(`Found ${buttons.length} tab buttons:`);
    
    buttons.forEach((btn, i) => {
        console.log(`${i + 1}. ${btn.textContent.trim()} (data-tab: ${btn.getAttribute('data-tab')})`);
    });
    
    const panes = document.querySelectorAll('.tab-pane');
    console.log(`Found ${panes.length} tab panes:`);
    
    panes.forEach((pane, i) => {
        console.log(`${i + 1}. ${pane.id} (display: ${pane.style.display})`);
    });
};

window.switchTab = function(tabId) {
    if (isValidTab(tabId)) {
        console.log(`Manually switching to tab: ${tabId}`);
        switchToTab(tabId);
    } else {
        console.error('Invalid tab. Use: personal-info, learning-progress, transcript');
    }
};

window.resetTabs = function() {
    console.log('Resetting tab system...');
    isInitialized = false;
    
    // Reset all tabs to hidden
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
        pane.classList.remove('active');
    });
    
    // Reset buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = '';
    });
    
    // Reinitialize
    initializeSystem();
};

// Test click events directly
window.testClickEvents = function() {
    console.log('Testing click events...');
    
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        const tabId = btn.getAttribute('data-tab');
        btn.onclick = function() {
            console.log(`Direct onclick handler for ${tabId}`);
            switchToTab(tabId);
        };
    });
    
    console.log('Direct onclick handlers added');
};

// ============================================
// FIX FOR CSS DISPLAY ISSUES
// ============================================
// Add this CSS fix dynamically
function addCSSCorrections() {
    const style = document.createElement('style');
    style.textContent = `
        /* Fix for tab display */
        .tab-pane {
            display: none !important;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .tab-pane.active {
            display: block !important;
            opacity: 1;
        }
        
        /* Fix for tab buttons */
        .tab-btn {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .tab-btn.active {
            background-color: #F0F3FF !important;
            border-bottom-color: #3B4BB1 !important;
            color: #3B4BB1 !important;
        }
        
        /* Ensure tab content is visible */
        .tab-content {
            position: relative;
            height: 100%;
        }
    `;
    document.head.appendChild(style);
}

// Call CSS fix
addCSSCorrections();

console.log('✅ information.js loaded successfully');