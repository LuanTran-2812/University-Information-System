// main.js (student)
document.addEventListener("DOMContentLoaded", () => {
    const pageTitleSlot = document.getElementById("page-title");
    const controlsSlot = document.getElementById("dynamic-controls-slot");
    const contentAreaSlot = document.querySelector(".content-area");
    const navLinks = document.querySelectorAll(".main-nav .nav-link");

    // ============================================================
    // CẤU HÌNH ROUTER - Ánh xạ trang HTML với hàm API tương ứng
    // ============================================================
    const PAGE_ROUTER = {
        'pages/dashboard-student.html': () => {
            if (typeof window.updateDashboard === 'function') window.updateDashboard();
        },
        'pages/schedule.html': () => {
            if (typeof window.initSchedulePage === 'function') window.initSchedulePage();
        },
        'pages/courses.html': () => {
            if (typeof window.loadCoursesDashboard === 'function') window.loadCoursesDashboard();
        },
        'pages/information.html': () => {
            if (typeof window.loadInformation === 'function') window.loadInformation();
        },
        'pages/registration.html': () => {
            if (typeof window.loadRegistration === 'function') window.loadRegistration();
        },
        'pages/course.html': () => {
        if (typeof window.loadCourseDetail === 'function') window.loadCourseDetail();
        }
    };

    // ============================================================
    // 1. CORE FUNCTIONS
    // ============================================================

    async function fetchHtml(url) {
        if (!url) return "";
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Tải ${url} thất bại`);
            return await response.text();
        } catch (error) {
            console.error("Fetch error:", error);
            return "<p>Lỗi tải nội dung.</p>";
        }
    }

    async function loadPage(pageUrl, controlsUrl, title) {
        contentAreaSlot.innerHTML = `<div class="loading-spinner">Đang tải dữ liệu...</div>`;
        
        try {
            // 1. Tải HTML giao diện
            const [pageHtml, controlsHtml] = await Promise.all([
                fetchHtml(pageUrl),
                fetchHtml(controlsUrl)
            ]);

            // 2. Render HTML vào trang
            pageTitleSlot.innerText = title;
            controlsSlot.innerHTML = controlsHtml;
            contentAreaSlot.innerHTML = pageHtml;

            // 3. ROUTING - Gọi API/Logic tương ứng
            const pageAction = PAGE_ROUTER[pageUrl];
            
            if (pageAction) {
                console.log(`Đang chạy logic cho trang: ${pageUrl}`);
                await pageAction(); // Chạy hàm tương ứng
            } else {
                console.warn(`Chưa cấu hình logic cho trang: ${pageUrl}`);
            }

        } catch (error) {
            console.error("Lỗi khi tải trang:", error);
            contentAreaSlot.innerHTML = "<p>Đã xảy ra lỗi khi tải trang. Vui lòng thử lại.</p>";
        }
    }

    // Export global cho các trang con có thể sử dụng
    window.loadPage = loadPage;

    // ============================================================
    // 2. NAVIGATION - Gắn sự kiện click sidebar
    // ============================================================
    
    navLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            // 1. Cập nhật URL trên thanh địa chỉ
            const href = link.getAttribute('href');
            history.pushState(null, '', href); 

            // 2. Xử lý UI active
            navLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");

            // 3. Gọi hàm load nội dung
            const pageUrl = link.dataset.page;
            const controlsUrl = link.dataset.controls;
            const title = link.dataset.title;

            loadPage(pageUrl, controlsUrl, title);
        });
    });

    // ============================================================
    // 3. INITIAL LOAD & BROWSER NAVIGATION
    // ============================================================
    
    function handleLocation() {
        const currentPath = window.location.pathname;
        let activeLink = document.querySelector(`.main-nav .nav-link[href="${currentPath}"]`);

        if (!activeLink) {
            // Kiểm tra nếu đang ở trang course-detail (qua sessionStorage)
            if (sessionStorage.getItem('currentCourseId')) {
                // Load trang course-detail
                loadPage(
                    'pages/course.html',
                    'partials/search-bar.html',
                    'Chi tiết khóa học'
                );
                return;
            }
            
            // Mặc định load dashboard
            activeLink = document.querySelector(`.main-nav .nav-link[data-page="pages/dashboard-student.html"]`);
        }

        if (activeLink) {
            // Update UI Sidebar
            navLinks.forEach(item => item.classList.remove("active"));
            activeLink.classList.add("active");

            // Load nội dung
            loadPage(
                activeLink.dataset.page,
                activeLink.dataset.controls,
                activeLink.dataset.title
            );
        }
    }

    // Chạy logic khi trang vừa load xong
    handleLocation();

    // Xử lý sự kiện nút Back/Forward của trình duyệt
    window.addEventListener("popstate", handleLocation);

    // ============================================================
    // 4. LOGOUT HANDLER (Cập nhật cho student)
    // ============================================================
    const logoutLinks = document.querySelectorAll('.bottom-nav .nav-link');
    
    logoutLinks.forEach(link => {
        const textSpan = link.querySelector('span:last-child');
        
        if (textSpan && textSpan.textContent.trim().toLowerCase() === 'log out') {
            
            link.addEventListener('click', async (event) => {
                event.preventDefault();
                
                try {
                    const response = await fetch('/api/auth/logout', {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    window.location.href = '/login.html';

                } catch (error) {
                    console.error('Lỗi khi đăng xuất:', error);
                    window.location.href = '/login.html';
                }
            });
        }
    });
});

// ============================================================
// 5. GLOBAL UTILS - HÀM PHÂN TRANG DÙNG CHUNG
// ============================================================

function renderPagination(totalItems, rowsPerPage, currentPage, onPageChange) {
    const paginationEl = document.querySelector('.pagination');
    if (!paginationEl) return;
    paginationEl.innerHTML = '';

    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (totalPages <= 1) return;

    const MAX_VISIBLE_PAGES = 5;

    const createBtn = (text, targetPage, isActive = false, isDisabled = false) => {
        const btn = document.createElement('button');
        btn.className = `page-btn ${isActive ? 'active' : ''}`;
        btn.innerHTML = text;
        btn.disabled = isDisabled;
        btn.style.minWidth = "35px";

        if (!isDisabled) {
            btn.onclick = () => {
                if (typeof onPageChange === 'function') {
                    onPageChange(targetPage);
                }
            };
        }
        paginationEl.appendChild(btn);
    };

    // Nút Previous
    createBtn('<span class="material-symbols-outlined">chevron_left</span>', currentPage - 1, false, currentPage === 1);

    // Logic "Cửa sổ trượt"
    let startPage, endPage;
    if (totalPages <= MAX_VISIBLE_PAGES) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(MAX_VISIBLE_PAGES / 2);
        const maxPagesAfterCurrent = Math.ceil(MAX_VISIBLE_PAGES / 2) - 1;

        if (currentPage <= maxPagesBeforeCurrent + 1) {
            startPage = 1;
            endPage = MAX_VISIBLE_PAGES;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - MAX_VISIBLE_PAGES + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }

    // Render nút số
    for (let i = startPage; i <= endPage; i++) {
        createBtn(i, i, i === currentPage);
    }

    // Nút Next
    createBtn('<span class="material-symbols-outlined">chevron_right</span>', currentPage + 1, false, currentPage === totalPages);
}

// Export hàm renderPagination
if (typeof window !== 'undefined') {
    window.renderPagination = renderPagination;
}