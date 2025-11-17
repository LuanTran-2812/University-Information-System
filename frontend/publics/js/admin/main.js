document.addEventListener("DOMContentLoaded", () => {
    const pageTitleSlot = document.getElementById("page-title");
    const controlsSlot = document.getElementById("dynamic-controls-slot");
    const contentAreaSlot = document.querySelector(".content-area");
    const navLinks = document.querySelectorAll(".main-nav .nav-link");

    // ============================================================
    // 1. CORE FUNCTIONS - Fetch & Load Page
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
        contentAreaSlot.innerHTML = "<h2>Đang tải...</h2>";
        
        try {
            const [pageHtml, controlsHtml] = await Promise.all([
                fetchHtml(pageUrl),
                fetchHtml(controlsUrl)
            ]);

            pageTitleSlot.innerText = title;
            controlsSlot.innerHTML = controlsHtml;
            contentAreaSlot.innerHTML = pageHtml;

            // ============================================================
            // ROUTING - Gọi logic tương ứng với từng trang
            // ============================================================
            
            if (pageUrl.includes('trang-chu.html')) {
                if (typeof updateDashboardStats === 'function') {
                    updateDashboardStats();
                }
            }

            if (pageUrl.includes('nguoi-dung.html')) {
                if (typeof fetchAndInitUserTable === 'function') {
                    fetchAndInitUserTable();
                    setupAddButton(); // Gắn sự kiện cho nút "Thêm người dùng"
                }
            }

            if (pageUrl.includes('them-nguoi-dung.html')) {
                if (typeof setupAddUserForm === 'function') {
                    await loadFacultiesToDropdown(); 
                    setupAddUserForm();
                }
            }

            if (pageUrl.includes('chi-tiet-nguoi-dung.html')) {
                if (typeof loadUserDetail === 'function') {
                    loadUserDetail();
                }
            }

            if (pageUrl.includes('hoc-ky.html')) {
                if (typeof loadSemesterList === 'function') {
                    loadSemesterList();
                    setupAddSemesterButton();
                    setupAddSemesterForm();
                }
            }

            if (pageUrl.includes('mon-hoc.html')) {
                if (typeof fetchAndInitSubjectTable === 'function') {
                    fetchAndInitSubjectTable();
                    setupAddSubjectButton();
                    setupAddSubjectForm();
                }
            }

            if (pageUrl.includes('lop-hoc.html')) {
                if (typeof initClassPage === 'function') {
                    initClassPage();
                }
            }

            if (pageUrl.includes('lich-hoc.html')) {
                if (typeof initSchedulePage === 'function') {
                    initSchedulePage();
                }
            }

        } catch (error) {
            console.error("Lỗi khi tải trang:", error);
            contentAreaSlot.innerHTML = "<p>Đã xảy ra lỗi khi tải trang.</p>";
        }
    }

    // ============================================================
    // 2. NAVIGATION - Gắn sự kiện cho menu
    // ============================================================
    
    navLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            // Xóa active khỏi tất cả
            navLinks.forEach(item => item.classList.remove("active"));
            
            // Thêm active vào link được click
            link.classList.add("active");

            // Lấy thông tin từ data-attributes
            const pageUrl = link.dataset.page;
            const controlsUrl = link.dataset.controls;
            const title = link.dataset.title;

            // Tải nội dung trang
            loadPage(pageUrl, controlsUrl, title);
        });
    });

    // ============================================================
    // 3. LOAD DEFAULT PAGE
    // ============================================================
    
    const defaultActiveLink = document.querySelector(".main-nav .nav-link.active");
    if (defaultActiveLink) {
        loadPage(
            defaultActiveLink.dataset.page,
            defaultActiveLink.dataset.controls,
            defaultActiveLink.dataset.title
        );
    }

    // ============================================================
    // 4. LOGOUT HANDLER
    // ============================================================
    
    document.querySelectorAll('.bottom-nav .nav-link').forEach(link => {
        const text = link.querySelector('span:last-child');
        if (text && text.textContent.trim().toLowerCase() === 'log out') {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                
                // Xóa token
                localStorage.removeItem('token');
                
                // Redirect về login
                const isLiveServer = window.location.port === '5500';
                const basePath = isLiveServer ? '/frontend/publics' : '';
                window.location.href = basePath + '/login.html';
            });
        }
    });
});