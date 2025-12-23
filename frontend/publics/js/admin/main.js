document.addEventListener("DOMContentLoaded", () => {
    const pageTitleSlot = document.getElementById("page-title");
    const controlsSlot = document.getElementById("dynamic-controls-slot");
    const contentAreaSlot = document.querySelector(".content-area");
    const navLinks = document.querySelectorAll(".main-nav .nav-link");

    // ============================================================
    // CẤU HÌNH ROUTER - Ánh xạ trang HTML với hàm API tương ứng
    // ============================================================
    const PAGE_ROUTER = {
        '/admin/pages/trang-chu.html': () => {
            if (typeof window.initDashboardPage === 'function') window.initDashboardPage();
        },
        '/admin/pages/nguoi-dung.html': () => {
            if (typeof window.fetchAndInitUserTable === 'function') window.fetchAndInitUserTable();
            if (typeof window.setupUserButtons === 'function') window.setupUserButtons();
        },
        '/admin/pages/them-nguoi-dung.html': async () => {
            if (typeof window.loadFacultiesToDropdown === 'function') await window.loadFacultiesToDropdown();
            if (typeof window.setupAddUserForm === 'function') window.setupAddUserForm();
        },
        '/admin/pages/chi-tiet-nguoi-dung.html': () => {
            if (typeof window.loadUserDetail === 'function') window.loadUserDetail();
        },
        '/admin/pages/hoc-ky.html': () => {
            if (typeof window.loadSemesterList === 'function') window.loadSemesterList();
            if (typeof window.setupAddSemesterButton === 'function') window.setupAddSemesterButton();
            if (typeof window.setupAddSemesterForm === 'function') window.setupAddSemesterForm();
        },
        '/admin/pages/mon-hoc.html': () => {
            if (typeof window.fetchAndInitSubjectTable === 'function') window.fetchAndInitSubjectTable();
            if (typeof window.setupAddSubjectButton === 'function') window.setupAddSubjectButton();
            if (typeof window.setupAddSubjectForm === 'function') window.setupAddSubjectForm();
        },
        '/admin/pages/lop-hoc.html': () => {
            if (typeof window.initClassPage === 'function') window.initClassPage();
        },
        '/admin/pages/lich-hoc.html': () => {
            if (typeof window.initSchedulePage === 'function') window.initSchedulePage();
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

            const realPageUrl = pageUrl.startsWith('/') ? pageUrl : `/admin/${pageUrl}`;
            
            let realControlsUrl = '';
            if (controlsUrl) {
                 realControlsUrl = controlsUrl.startsWith('/') ? controlsUrl : `/admin/${controlsUrl}`;
            }

            // 1. Tải HTML giao diện
            const [pageHtml, controlsHtml] = await Promise.all([
                fetchHtml(realPageUrl),
                fetchHtml(realControlsUrl)
            ]);

            // 2. Render HTML vào trang
            pageTitleSlot.innerText = title;
            controlsSlot.innerHTML = controlsHtml;
            contentAreaSlot.innerHTML = pageHtml;

            // 3. ROUTING - Tìm hàm xử lý trong bảng Router (Dùng đường dẫn đã chuẩn hóa)
            const pageAction = PAGE_ROUTER[realPageUrl];
            
            if (pageAction) {
                await pageAction(); 
            } else {
                console.warn(`Chưa cấu hình logic cho trang: ${realPageUrl}`);
            }

        } catch (error) {
            console.error("Lỗi khi tải trang:", error);
            contentAreaSlot.innerHTML = "<p>Đã xảy ra lỗi khi tải trang. Vui lòng thử lại.</p>";
        }
    }

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
    // 3. INITIAL LOAD & BROWSER NAVIGATION (SỬA ĐỔI)
    // ============================================================
    
    function handleLocation() {
        const currentPath = window.location.pathname;

        if (currentPath === '/admin/nguoi-dung/them-nguoi-dung') {
            loadPage('/admin/pages/them-nguoi-dung.html', '/admin/partials/search-bar.html', 'Thêm người dùng');
            
            const parentLink = document.querySelector(`.main-nav .nav-link[href="/admin/nguoi-dung"]`);
            if (parentLink) {
                document.querySelectorAll(".main-nav .nav-link").forEach(item => item.classList.remove("active"));
                parentLink.classList.add("active");
            }
            return;
        }

        if (currentPath === '/admin/nguoi-dung/chi-tiet') {
            loadPage('/admin/pages/chi-tiet-nguoi-dung.html', '/admin/partials/search-bar.html', 'Chi tiết người dùng');
            
            // Highlight menu cha
            const parentLink = document.querySelector(`.main-nav .nav-link[href="/admin/nguoi-dung"]`);
            if (parentLink) {
                document.querySelectorAll(".main-nav .nav-link").forEach(item => item.classList.remove("active"));
                parentLink.classList.add("active");
            }
            return;
        }

        let activeLink = document.querySelector(`.main-nav .nav-link[href="${currentPath}"]`);

        if (!activeLink) {
            activeLink = document.querySelector(`.main-nav .nav-link[data-page="pages/trang-chu.html"]`);
        }

        if (activeLink) {
            document.querySelectorAll(".main-nav .nav-link").forEach(item => item.classList.remove("active"));
            activeLink.classList.add("active");

            loadPage(
                activeLink.dataset.page,
                activeLink.dataset.controls,
                activeLink.dataset.title
            );
        }
    }

    // Chạy logic khi trang vừa load xong (F5 hoặc mở mới)
    handleLocation();

    // Xử lý sự kiện nút Back/Forward của trình duyệt (MỚI THÊM)
    window.addEventListener("popstate", handleLocation);

    // ============================================================
    // 4. LOGOUT HANDLER
    // ============================================================
    
    // Tìm nút logout
    const logoutLinks = document.querySelectorAll('.bottom-nav .nav-link');
    
    logoutLinks.forEach(link => {
        const textSpan = link.querySelector('span:last-child');
        
        if (textSpan && textSpan.textContent.trim().toLowerCase() === 'log out') {
            
            link.addEventListener('click', async (event) => {
                event.preventDefault();
                
                try {
                    const response = await fetch('http://localhost:8000/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include' // Quan trọng: gửi cookie đi kèm
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        // Xóa thêm bất kỳ storage nào khác nếu có
                        sessionStorage.clear();
                        localStorage.clear();
                        
                        // Redirect về login
                        window.location.href = '/login.html';
                    } else {
                        throw new Error('Logout failed');
                    }

                } catch (error) {
                    console.error('Lỗi khi đăng xuất:', error);
                    // Vẫn redirect về login dù có lỗi
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

    // CẤU HÌNH: Số lượng nút hiển thị tối đa (5 nút)
    const MAX_VISIBLE_PAGES = 5;

    const createBtn = (text, targetPage, isActive = false, isDisabled = false) => {
        const btn = document.createElement('button');
        btn.className = `page-btn ${isActive ? 'active' : ''}`;
        btn.innerHTML = text;
        btn.disabled = isDisabled;
        btn.style.minWidth = "35px"; // Cố định chiều rộng

        if (!isDisabled) {
            btn.onclick = () => {
                // Gọi callback để trang con xử lý
                if (typeof onPageChange === 'function') {
                    onPageChange(targetPage);
                }
            };
        }
        paginationEl.appendChild(btn);
    };

    // 1. Nút Previous
    createBtn('<span class="material-symbols-outlined">chevron_left</span>', currentPage - 1, false, currentPage === 1);

    // 2. Logic "Cửa sổ trượt" (Sliding Window)
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

    // 3. Render nút số
    for (let i = startPage; i <= endPage; i++) {
        createBtn(i, i, i === currentPage);
    }

    // 4. Nút Next
    createBtn('<span class="material-symbols-outlined">chevron_right</span>', currentPage + 1, false, currentPage === totalPages);
}

// Export hàm renderPagination ra window
if (typeof window !== 'undefined') {
    window.renderPagination = renderPagination;
}