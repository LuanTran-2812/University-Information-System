// js/student/course-detail.js
async function loadCourseDetail() {
    console.log('Đang tải chi tiết khóa học...');
    
    // Lấy course ID từ sessionStorage
    const courseId = sessionStorage.getItem('currentCourseId') || '1';
    
    if (!courseId) {
        // Nếu không có courseId, quay lại trang courses
        const link = document.querySelector('.nav-link[data-page="pages/courses.html"]');
        if (link) {
            document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
            link.classList.add('active');
            window.loadPage(
                link.dataset.page,
                link.dataset.controls,
                link.dataset.title
            );
            return;
        }
    }
    
    // Khởi tạo UI
    initializeTabs();
    setupBackButton();
    setupBreadcrumbNavigation();
    loadCourseData(courseId);
    loadWeekNavigation();
    setupEventListeners();
}

// Thêm hàm setupBreadcrumbNavigation
function setupBreadcrumbNavigation() {
    // Breadcrumb: Trang chủ
    const homeBreadcrumb = document.getElementById('breadcrumb-home');
    if (homeBreadcrumb) {
        homeBreadcrumb.addEventListener('click', (e) => {
            e.preventDefault();
            // Tìm link trang chủ trong navigation
            const homeLink = document.querySelector('.nav-link[data-page="pages/dashboard.html"]');
            if (homeLink) {
                // Xóa courseId khỏi sessionStorage
                sessionStorage.removeItem('currentCourseId');
                
                // Đặt active và load trang chủ
                document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                homeLink.classList.add('active');
                window.loadPage(
                    homeLink.dataset.page,
                    homeLink.dataset.controls,
                    homeLink.dataset.title
                );
            }
        });
    }
    
    // Breadcrumb: Khóa học
    const coursesBreadcrumb = document.getElementById('breadcrumb-courses');
    if (coursesBreadcrumb) {
        coursesBreadcrumb.addEventListener('click', (e) => {
            e.preventDefault();
            // Tìm link khóa học trong navigation
            const coursesLink = document.querySelector('.nav-link[data-page="pages/courses.html"]');
            if (coursesLink) {
                // Xóa courseId khỏi sessionStorage
                sessionStorage.removeItem('currentCourseId');
                
                // Đặt active và load trang khóa học
                document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                coursesLink.classList.add('active');
                window.loadPage(
                    coursesLink.dataset.page,
                    coursesLink.dataset.controls,
                    coursesLink.dataset.title
                );
            }
        });
    }
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.course-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab pane
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

function setupBackButton() {
    const backBtn = document.getElementById('back-to-courses');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Xóa courseId khỏi sessionStorage
            sessionStorage.removeItem('currentCourseId');
            
            // Quay lại trang courses
            const link = document.querySelector('.nav-link[data-page="pages/courses.html"]');
            if (link) {
                document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                link.classList.add('active');
                window.loadPage(
                    link.dataset.page,
                    link.dataset.controls,
                    link.dataset.title
                );
            }
        });
    }
}

async function loadCourseData(courseId) {
    const API_BASE = window.API_BASE || 'http://localhost:8000';
    
    try {
        // Gọi API lấy thông tin khóa học
        const response = await fetch(`${API_BASE}/api/courses/${courseId}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateCourseInfo(data.data);
            } else {
                throw new Error('Không lấy được dữ liệu');
            }
        } else {
            // Fallback to mock data
            useMockCourseData();
        }
    } catch (error) {
        console.warn('⚠️ Sử dụng dữ liệu mẫu:', error);
        useMockCourseData();
    }
}

function useMockCourseData() {
    // Mock data cho khóa học
    const mockCourse = {
        id: 1,
        title: 'Giải tích 2',
        code: 'MT1005',
        credits: 3,
        teacher: 'Trần B',
        semester: 'HK241',
        classId: 'L01',
        progress: 75
    };
    
    updateCourseInfo(mockCourse);
    
    // Hiển thị thông báo mock data
    showMockDataIndicator();
}

function updateCourseInfo(course) {
    // Cập nhật thông tin khóa học
    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-code').textContent = course.code;
    document.getElementById('course-credit').textContent = `${course.credits} tín chỉ`;
    document.getElementById('course-teacher').textContent = `Giảng viên: ${course.teacher}`;
    document.getElementById('course-semester').textContent = `${course.semester} - ${course.classId}`;
    // Cập nhật breadcrumb
    document.getElementById('breadcrumb-course-title').textContent = course.title;
}

function loadWeekNavigation() {
    const weekList = document.getElementById('week-list');
    if (!weekList) return;
    
    // Mock data các tuần
    const weeks = [
        { id: 1, title: 'Tuần 1: Giới thiệu môn học'},
        { id: 2, title: 'Tuần 2: Giới hạn hàm nhiều biến'},
        { id: 3, title: 'Tuần 3: Đạo hàm riêng'},
        { id: 4, title: 'Tuần 4: Cực trị hàm nhiều biến'},
        { id: 5, title: 'Tuần 5: Tích phân kép'},
        { id: 6, title: 'Tuần 6: Ôn tập giữa kỳ'}
    ];
    
    weekList.innerHTML = '';
    
    weeks.forEach(week => {
        const weekItem = document.createElement('div');
        weekItem.className = 'week-item';
        weekItem.dataset.weekId = week.id;
        
        weekItem.innerHTML = `
            <div class="week-title">${week.title}</div>
        `;
        
        weekItem.addEventListener('click', () => {
            // Update active week
            document.querySelectorAll('.week-item').forEach(item => {
                item.classList.remove('active');
            });
            weekItem.classList.add('active');
            
            // Update week content
            updateWeekContent(week);
        });
        
        weekList.appendChild(weekItem);
    });
    
    // Set first week as active
    if (weeks.length > 0) {
        document.querySelector('.week-item')?.classList.add('active');
        updateWeekContent(weeks[0]);
    }
}

function updateWeekContent(week) {
    document.getElementById('current-week-title').textContent = week.title;
    document.getElementById('current-week-date').textContent = week.date;
}

function setupEventListeners() {
    // Setup chart
    setupGradeChart();
    
    // Setup download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification('Đang tải xuống...', 'info');
            // Mock download
            setTimeout(() => {
                showNotification('Tải xuống thành công!', 'success');
            }, 1000);
        });
    });
    
    // Setup submit buttons
    document.querySelectorAll('.submit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showNotification('Chức năng nộp bài đang được phát triển', 'info');
        });
    });
    
    // Setup start quiz buttons
    document.querySelectorAll('.start-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showNotification('Chức năng làm bài quiz đang được phát triển', 'info');
        });
    });
}

function setupGradeChart() {
    const canvas = document.getElementById('grades-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Mock data
    const data = {
        labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 'Tuần 6'],
        datasets: [{
            label: 'Điểm bài tập',
            data: [9.0, 8.5, 8.8, 9.2, 8.7, 9.0],
            borderColor: '#3B4BB1',
            backgroundColor: 'rgba(59, 75, 177, 0.1)',
            tension: 0.3
        }, {
            label: 'Điểm trung bình lớp',
            data: [8.2, 8.0, 8.5, 8.8, 8.3, 8.6],
            borderColor: '#10B981',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.3
        }]
    };
}

function showMockDataIndicator() {
    // Có thể thêm indicator nếu cần
    console.log('Đang sử dụng dữ liệu mẫu');
}

function showNotification(message, type = 'info') {
    // KIỂM TRA ĐỆ QUY: nếu đã có hàm toàn cục và không phải chính nó
    if (window.showNotification && window.showNotification !== showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    if (window.showToast && window.showToast !== showToast) {
        window.showToast(message, type);
        return;
    }
    
    // Fallback implementation
    const notification = document.createElement('div');
    notification.className = `course-notification ${type}`;
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

// Chỉ gán vào window nếu chưa có
if (!window.showNotification) {
    window.showNotification = showNotification;
}

// Export function
if (typeof window !== 'undefined') {
    window.loadCourseDetail = loadCourseDetail;
}