// course_registration.js - SỬA LỖI LOADING OVERLAY
"use strict";

(function autoSetupMockToken() {
    // Chỉ trong development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const token = localStorage.getItem('studentToken');
        if (!token) {
            console.log('🔧 AUTO-SETUP: Creating mock token for development');
            
            // Tạo payload không có ký tự Unicode
            const payload = {
                studentId: '20123456',
                name: 'Nguyen Van A', // Sử dụng không dấu
                email: 'student@example.com',
                role: 'student',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 giờ
            };
            
            // Mã hóa payload thành base64 (sử dụng JSON.stringify sẽ tạo chuỗi không có Unicode nếu không có ký tự đặc biệt)
            const encodedPayload = btoa(JSON.stringify(payload));
            const mockToken = `mock_header.${encodedPayload}.mock_signature`;
            
            localStorage.setItem('studentToken', mockToken);
            localStorage.setItem('studentId', '20123456');
            localStorage.setItem('studentName', 'Nguyen Van A');
            
            console.log('✅ Mock token created:', mockToken.substring(0, 50) + '...');
        }
    }
})();

const API_BASE = window.API_BASE || "http://localhost:8000";
let isMockMode = false;

// Lấy MSSV từ window / localStorage
function getStudentId() {
    return (
        window.STUDENT_ID ||
        localStorage.getItem("studentId") ||
        localStorage.getItem("MSSV") ||
        "demo_student" // Fallback để dùng mock data
    );
}

// Header Authorization (nếu có token)
function getAuthHeaders() {
    const token = localStorage.getItem("studentToken");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/* ============ MOCK DATA ============ */
function getMockCourses() {
    return [
        {
            maLopHoc: "L01",
            maMon: "IT001",
            tenMon: "Nhập môn lập trình",
            soTinChi: 3,
            giangVien: "Thầy A",
            registered: true,
        },
        {
            maLopHoc: "L02",
            maMon: "IT002",
            tenMon: "Cấu trúc dữ liệu và giải thuật",
            soTinChi: 3,
            giangVien: "Cô B",
            registered: false,
        },
        {
            maLopHoc: "L03",
            maMon: "MA001",
            tenMon: "Giải tích 1",
            soTinChi: 4,
            giangVien: "Thầy C",
            registered: false,
        },
        {
            maLopHoc: "L04",
            maMon: "PH001",
            tenMon: "Vật lý đại cương",
            soTinChi: 3,
            giangVien: "Cô D",
            registered: true,
        },
    ];
}

/* ============ TOAST THÔNG BÁO ============ */
let toastTimeout = null;

function showToast(message, type = "info") {
    let toast = document.querySelector(".cr-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "cr-toast";
        toast.innerHTML = `
            <span class="material-symbols-outlined">info</span>
            <span class="cr-toast-text"></span>
        `;
        document.body.appendChild(toast);
    }

    toast.classList.remove("success", "error", "info");
    toast.classList.add(type);

    const icon = toast.querySelector(".material-symbols-outlined");
    const textSpan = toast.querySelector(".cr-toast-text");

    textSpan.textContent = message;

    if (type === "success") icon.textContent = "check_circle";
    else if (type === "error") icon.textContent = "error";
    else icon.textContent = "info";

    toast.classList.add("show");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

// Cho phép dùng lại nếu bạn đã có showNotification ở file khác
if (!window.showNotification) {
    window.showNotification = showToast;
}

/* ============ GỌI API LẤY DANH SÁCH LỚP (FIXED) ============ */
async function fetchCoursesFromApi() {
    const mssv = getStudentId();
    
    try {
        console.log('📡 Fetching courses for student:', mssv);
        
        const token = localStorage.getItem('studentToken');
        if (!token) {
            console.error('❌ No token found');
            throw new Error('Authentication token not found');
        }
        
        // Gọi API với token authentication
        const response = await fetch(`${API_BASE}/api/student/courses`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });
        
        console.log('📊 API Response Status:', response.status);
        
        // Kiểm tra HTTP status
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            
            if (response.status === 401) {
                // Token invalid/expired
                localStorage.removeItem('studentToken');
                localStorage.removeItem('studentId');
                window.location.href = '/login.html';
                return [];
            }
            
            if (response.status === 500) {
                throw new Error(`Server Error (500): ${errorText.substring(0, 100)}`);
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Parse JSON response
        const data = await response.json();
        console.log('📦 API Response Data:', data);
        
        // Kiểm tra cấu trúc response
        if (!data) {
            throw new Error('API trả về dữ liệu rỗng');
        }
        
        // Xác định mảng courses dựa trên cấu trúc response
        let coursesArray = [];
        
        if (data.success === false) {
            // Server trả về { success: false, message: ... }
            throw new Error(data.message || 'API request failed');
        }
        
        if (Array.isArray(data)) {
            coursesArray = data;
        } else if (Array.isArray(data.data)) {
            coursesArray = data.data;
        } else if (Array.isArray(data.courses)) {
            coursesArray = data.courses;
        } else {
            console.warn('⚠️ Unexpected API response structure:', data);
            
            // Thử tìm bất kỳ mảng nào trong response
            for (const key in data) {
                if (Array.isArray(data[key])) {
                    coursesArray = data[key];
                    console.log(`Using array from key "${key}"`);
                    break;
                }
            }
            
            if (coursesArray.length === 0) {
                throw new Error('Không tìm thấy danh sách khóa học trong response');
            }
        }
        
        console.log(`✅ Found ${coursesArray.length} courses`);
        
        // Transform API response to match UI format
        return coursesArray.map((course, index) => ({
            maLopHoc: course.maLopHoc || course.classCode || course.classId || `L${index + 1}`,
            maMon: course.maMon || course.courseCode || course.code || '',
            tenMon: course.tenMon || course.courseName || course.title || 'Khóa học',
            soTinChi: course.soTinChi || course.credits || course.tinChi || 0,
            giangVien: course.giangVien || course.lecturer || course.teacher || 'Chưa xác định',
            registered: course.registered || course.isRegistered || course.dangKy || false,
        }));
        
    } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
    }
}

/* ============ LOAD COURSES (API + FALLBACK MOCK) ============ */
async function loadCourses() {
    const loadingOverlay = document.getElementById("course-loading");
    const mockBanner = document.getElementById("cr-mock-banner");
    const emptyState = document.getElementById("course-empty-state");

    // Hiện loading
    if (loadingOverlay) {
        loadingOverlay.classList.remove("hidden");
        loadingOverlay.style.display = "flex";
    }
    
    if (emptyState) emptyState.style.display = "none";
    if (mockBanner) mockBanner.style.display = "none";

    try {
        console.log("🔄 Đang thử gọi API...");
        const courses = await fetchCoursesFromApi();
        console.log("✅ API thành công, dữ liệu:", courses);
        isMockMode = false;
        renderCourseTable(courses);
    } catch (err) {
        console.warn("⚠️ Lỗi API, chuyển sang mock data:", err.message);
        isMockMode = true;
        
        // Hiện banner thông báo dùng mock data
        if (mockBanner) {
            mockBanner.style.display = "flex";
            mockBanner.innerHTML = `
                <span class="material-symbols-outlined">info</span>
                <span>Đang sử dụng dữ liệu mẫu (mock data) - ${err.message}</span>
            `;
        }
        
        try {
            const courses = getMockCourses();
            console.log("📋 Dùng mock data:", courses);
            renderCourseTable(courses);
            showToast("Đang dùng dữ liệu mẫu do không kết nối được server", "info");
        } catch (renderErr) {
            console.error("❌ Lỗi render mock data:", renderErr);
            if (emptyState) {
                emptyState.style.display = "flex";
                emptyState.innerHTML = `
                    <span class="material-symbols-outlined">error</span>
                    <p>Lỗi hiển thị dữ liệu: ${renderErr.message}</p>
                `;
            }
            showToast("Lỗi hiển thị dữ liệu", "error");
        }
    } finally {
        // QUAN TRỌNG: Luôn ẩn loading overlay
        const loadingOverlayFinally = document.getElementById("course-loading");
        if (loadingOverlayFinally) {
            loadingOverlayFinally.style.display = "none";
            loadingOverlayFinally.classList.add("hidden");
        }
    }
}

/* ============ RENDER TABLE ============ */
function renderCourseTable(courseList) {
    const tbody = document.getElementById("course-table-body");
    const emptyState = document.getElementById("course-empty-state");

   if (!tbody) return;

    // Xóa nội dung cũ
    tbody.innerHTML = "";

    // Kiểm tra dữ liệu
    if (!Array.isArray(courseList) || courseList.length === 0) {
        console.warn("Không có dữ liệu môn học để hiển thị");
        if (emptyState) {
            emptyState.style.display = "flex";
            emptyState.innerHTML = `
                <span class="material-symbols-outlined">school</span>
                <p>Không có môn học nào để hiển thị</p>
            `;
        }
        updateSummary(0, 0);
        return;
    }

    // Ẩn empty state nếu có dữ liệu
    if (emptyState) emptyState.style.display = "none";

    let total = 0;
    let totalRegistered = 0;

    // Render từng dòng
    courseList.forEach((c) => {
        total++;
        const isReg = !!c.registered;
        if (isReg) totalRegistered++;

        const tr = document.createElement("tr");
        tr.dataset.lophoc = c.maLopHoc || "";
        tr.dataset.registered = isReg ? "true" : "false";

        tr.innerHTML = `
            <td>${c.maLopHoc || ""}</td>
            <td>${c.maMon || ""}</td>
            <td>${c.tenMon || ""}</td>
            <td>${c.soTinChi || ""}</td>
            <td>${c.giangVien || "Đang cập nhật"}</td>
            <td>
                <span class="cr-status-tag ${isReg ? "registered" : "unregistered"}">
                    ${isReg ? "Đã đăng ký" : "Chưa đăng ký"}
                </span>
            </td>
            <td>
                <button class="cr-btn-register ${isReg ? "unregister" : "register"}">
                    <span class="material-symbols-outlined">
                        ${isReg ? "close" : "add"}
                    </span>
                    <span>${isReg ? "Hủy đăng ký" : "Đăng ký"}</span>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    updateSummary(total, totalRegistered);
    applyFilters();
    
    console.log(`✅ Đã render ${total} môn học (${totalRegistered} đã đăng ký)`);
}

/* ============ SUMMARY ============ */
function updateSummary(total, registered) {
    const totalSpan = document.getElementById("summary-total");
    const regSpan = document.getElementById("summary-registered");
    const unregSpan = document.getElementById("summary-unregistered");

    const unregistered = total - registered;

    if (totalSpan) totalSpan.textContent = total;
    if (regSpan) regSpan.textContent = registered;
    if (unregSpan) unregSpan.textContent = unregistered;
}

/* ============ API ĐĂNG KÝ / HỦY ĐĂNG KÝ (FIXED) ============ */
async function apiRegisterCourse(maLopHoc) {
    const mssv = getStudentId();
    if (!mssv) {
        throw new Error("Không tìm thấy MSSV. Hãy đăng nhập trước.");
    }

    const res = await fetch(`${API_BASE}/api/student/registrations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ mssv, maLopHoc }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.message || "Đăng ký môn học thất bại.");
    }
    return data;
}

async function apiUnregisterCourse(maLopHoc) {
    const mssv = getStudentId();
    if (!mssv) {
        throw new Error("Không tìm thấy MSSV. Hãy đăng nhập trước.");
    }

    const res = await fetch(`${API_BASE}/api/student/registrations`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ mssv, maLopHoc }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.message || "Hủy đăng ký môn học thất bại.");
    }
    return data;
}

/* ============ UPDATE UI 1 DÒNG ============ */
function updateRowUI(row, isRegistered) {
    row.dataset.registered = isRegistered ? "true" : "false";

    const statusTag = row.querySelector(".cr-status-tag");
    const button = row.querySelector(".cr-btn-register");
    const icon = button.querySelector(".material-symbols-outlined");
    const textSpan = button.querySelector("span:last-child");

    if (isRegistered) {
        statusTag.textContent = "Đã đăng ký";
        statusTag.classList.remove("unregistered");
        statusTag.classList.add("registered");

        button.classList.remove("register");
        button.classList.add("unregister");
        icon.textContent = "close";
        textSpan.textContent = "Hủy đăng ký";
    } else {
        statusTag.textContent = "Chưa đăng ký";
        statusTag.classList.remove("registered");
        statusTag.classList.add("unregistered");

        button.classList.remove("unregister");
        button.classList.add("register");
        icon.textContent = "add";
        textSpan.textContent = "Đăng ký";
    }
}

/* ============ FILTER (SEARCH + REGISTERED) ============ */
function applyFilters() {
    const searchInput = document.getElementById("course-search-input");
    const filterSelect = document.getElementById("course-filter-select");
    const tbody = document.getElementById("course-table-body");
    if (!tbody) return;

    const searchValue = (searchInput?.value || "").trim().toLowerCase();
    const filterValue = filterSelect?.value || "all";

    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.forEach((row) => {
        const text = row.innerText.toLowerCase();
        const isReg = row.dataset.registered === "true";

        let visible = true;

        if (searchValue && !text.includes(searchValue)) {
            visible = false;
        }

        if (filterValue === "registered" && !isReg) visible = false;
        if (filterValue === "unregistered" && isReg) visible = false;

        row.style.display = visible ? "" : "none";
    });
}

/* ============ EVENT HANDLERS ============ */
function setupEvents() {
    const tbody = document.getElementById("course-table-body");
    const searchInput = document.getElementById("course-search-input");
    const filterSelect = document.getElementById("course-filter-select");

    // Click nút đăng ký / hủy
    if (tbody) {
        tbody.addEventListener("click", async (event) => {
            const button = event.target.closest(".cr-btn-register");
            if (!button) return;

            const row = button.closest("tr");
            const maLopHoc = row.dataset.lophoc;
            const isCurrentlyRegistered = row.dataset.registered === "true";

            if (!maLopHoc) return;

            // Tránh double click
            if (button.dataset.loading === "true") return;

            button.dataset.loading = "true";
            button.disabled = true;

            const originalText = button.querySelector("span:last-child").textContent;

            try {
                if (isMockMode) {
                    // MOCK MODE: chỉ đổi UI, không gọi API
                    updateRowUI(row, !isCurrentlyRegistered);
                    showToast(
                        "Đây là dữ liệu mẫu, thao tác chỉ mang tính minh họa.",
                        "info"
                    );
                } else {
                    // MODE THẬT: gọi API
                    if (isCurrentlyRegistered) {
                        button.querySelector("span:last-child").textContent = "Đang hủy...";
                        await apiUnregisterCourse(maLopHoc);
                        updateRowUI(row, false);
                        showToast("Hủy đăng ký môn thành công.", "success");
                    } else {
                        button.querySelector("span:last-child").textContent = "Đang đăng ký...";
                        await apiRegisterCourse(maLopHoc);
                        updateRowUI(row, true);
                        showToast("Đăng ký môn thành công.", "success");
                    }
                }

                // Cập nhật summary sau khi đổi trạng thái
                recomputeSummaryFromDOM();
                applyFilters();
            } catch (err) {
                console.error(err);
                showToast(err.message || "Có lỗi xảy ra.", "error");
            } finally {
                button.dataset.loading = "false";
                button.disabled = false;
                button.querySelector("span:last-child").textContent = originalText;
            }
        });
    }

    // Search
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            applyFilters();
        });
    }

    // Filter select
    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            applyFilters();
        });
    }
}

// Recount summary từ DOM (sau khi toggle)
function recomputeSummaryFromDOM() {
    const tbody = document.getElementById("course-table-body");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    let total = rows.length;
    let reg = 0;

    rows.forEach((row) => {
        if (row.dataset.registered === "true") reg++;
    });

    updateSummary(total, reg);
}

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Khởi động trang đăng ký môn học...");
    const tbody = document.getElementById('course-table-body');
    if (!tbody) return;
    // Thêm toast container nếu chưa có
    if (!document.querySelector('.cr-toast')) {
        const toast = document.createElement('div');
        toast.className = 'cr-toast';
        toast.innerHTML = `
            <span class="material-symbols-outlined">info</span>
            <span class="cr-toast-text"></span>
        `;
        document.body.appendChild(toast);
    }
    
    setupEvents();
    loadCourses();
});

// Thêm CSS cho loading overlay nếu chưa có
if (!document.querySelector('#cr-inline-styles')) {
    const style = document.createElement('style');
    style.id = 'cr-inline-styles';
    style.textContent = `
        /* Loading Overlay */
        #course-loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            flex-direction: column;
            gap: 15px;
        }
        
        #course-loading.hidden {
            display: none !important;
        }
        
        .cr-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3B4BB1;
            border-radius: 50%;
            animation: cr-spin 1s linear infinite;
        }
        
        @keyframes cr-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Toast */
        .cr-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            transform: translateX(150%);
            transition: transform 0.3s ease;
        }
        
        .cr-toast.show {
            transform: translateX(0);
        }
        
        .cr-toast.success {
            border-left: 4px solid #10b981;
        }
        
        .cr-toast.error {
            border-left: 4px solid #ef4444;
        }
        
        .cr-toast.info {
            border-left: 4px solid #3b82f6;
        }
        
        /* Mock Banner */
        #cr-mock-banner {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            display: none;
        }
        
        /* Empty State */
        #course-empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
        
        #course-empty-state .material-symbols-outlined {
            font-size: 48px;
            color: #d1d5db;
        }
    `;
    document.head.appendChild(style);
}