document.addEventListener("DOMContentLoaded", () => {
    const pageTitleSlot = document.getElementById("page-title");
    const contentAreaSlot = document.querySelector(".content-area");
    
    // Lấy tất cả các link điều hướng
    const navLinks = document.querySelectorAll(".main-nav .nav-link");

    // Hàm phụ trợ để fetch HTML
    async function fetchHtml(url) {
        if (!url) return ""; // Trả về rỗng nếu không có URL controls
        try {
            // Đường dẫn trong data-page là tương đối với file index.html
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Tải ${url} thất bại`);
            return await response.text();
        } catch (error) {
            console.error("Fetch error:", error);
            return "<p>Lỗi tải nội dung.</p>";
        }
    }

    // =========================================================
    // === 1. LOGIC CHO TRANG LIÊN HỆ ĐƯỢC GỘP VÀO ĐÂY ===
    // =========================================================
    function initContactPageLogic() {
        console.log("Đang chạy logic của trang Liên hệ..."); // Để kiểm tra

        // 1. LẤY CÁC PHẦN TỬ CẦN THIẾT
        const form = document.getElementById("page-contact-form");
        
        // Kiểm tra xem form có tồn tại không. Nếu không, dừng hàm này lại ngay để tránh lỗi
        if (!form) {
            console.log("Không tìm thấy form 'page-contact-form'.");
            return; 
        }

        const successBox = document.getElementById("contact-alert-success");
        const warningBox = document.getElementById("contact-alert-warning");
        
        // Nội dung thông báo
        const successMsg = document.getElementById("contact-alert-success-msg");
        const warningMsg = document.getElementById("contact-alert-warning-msg");
        
        // Nút đóng
        const closeSuccessBtn = document.getElementById("close-success-btn");
        const closeWarningBtn = document.getElementById("close-warning-btn");

        // 2. HÀM PHỤ TRỢ (Helper Functions)
        
        // Hàm ẩn tất cả thông báo
        function hideAlerts() {
            if (successBox) successBox.style.display = 'none';
            if (warningBox) warningBox.style.display = 'none';
        }

        // Hàm hiển thị thông báo thành công
        function showSuccess(message) {
            hideAlerts();
            if (successBox && successMsg) {
                successMsg.textContent = message;
                successBox.style.display = 'flex';
            }
        }
        
        // Hàm hiển thị thông báo cảnh báo
        function showWarning(message) {
            hideAlerts();
            if (warningBox && warningMsg) {
                warningMsg.textContent = message;
                warningBox.style.display = 'flex';
            }
        }

        // 3. GẮN SỰ KIỆN CHO NÚT ĐÓNG
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', hideAlerts);
        }
        if (closeWarningBtn) {
            closeWarningBtn.addEventListener('click', hideAlerts);
        }

        // 4. GẮN SỰ KIỆN SUBMIT CHO FORM
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            hideAlerts();

            // Lấy dữ liệu từ form
            const name = form.querySelector('input[name="name"]').value;
            const email = form.querySelector('input[name="email"]').value;
            const message = form.querySelector('textarea[name="message"]').value;

            // 5. KIỂM TRA DỮ LIỆU (VALIDATION)
            if (name === '' || email === '' || message === '') {
                showWarning("Vui lòng nhập đầy đủ các trường bắt buộc.");
                return; 
            }
            
            console.log("Form hợp lệ, chuẩn bị gửi:", { name, email, message });
            
            // Demo thành công:
            showSuccess("Dữ liệu đã được gửi thành công!");
            
            form.reset();
        });
    }

    // =========================================================
    // === 2. HÀM TẢI LẠI TRANG ===
    // =========================================================
    async function loadPage(pageUrl, title) {
        contentAreaSlot.innerHTML = "<h2>Đang tải...</h2>"; // Hiển thị loading
        
        try {
            // Tải song song nội dung và thanh điều khiển
            const pageHtml = await fetchHtml(pageUrl);

            // "Bơm" HTML vào các "lỗ hổng"
            pageTitleSlot.innerText = title;
            contentAreaSlot.innerHTML = pageHtml;

        } catch (error) {
            console.error("Lỗi khi tải trang:", error);
        }
    }

    // 5. Gắn sự kiện click cho MỌI link
    navLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault(); // Ngăn trình duyệt tải lại trang

            // Xóa class 'active' khỏi TẤT CẢ các link
            navLinks.forEach(item => item.classList.remove("active"));
            
            // Thêm class 'active' vào CHỈ link vừa được bấm
            link.classList.add("active");

            // Lấy thông tin từ data-attributes
            const pageUrl = link.dataset.page;
            const title = link.dataset.title;

            // Tải nội dung trang tương ứng
            loadPage(pageUrl, title);
        });
    });

    // 6. TẢI TRANG MẶC ĐỊNH tìm link đang có class 'active' trong HTML (là "Trang chủ")
    const defaultActiveLink = document.querySelector(".main-nav .nav-link.active");
    if (defaultActiveLink) {
        loadPage(
            defaultActiveLink.dataset.page,
            defaultActiveLink.dataset.title
        );
    }

    // =========================================================
    // === 3. XỬ LÝ LOGOUT ===
    // =========================================================
    const logoutBtn = document.querySelector('.bottom-nav a[href="#"]:has(.material-symbols-outlined:first-child)');
    
    // Tìm logout button theo text hoặc icon
    const logoutLinks = document.querySelectorAll('.bottom-nav .nav-link');
    logoutLinks.forEach(link => {
        const icon = link.querySelector('.material-symbols-outlined');
        const text = link.querySelector('span:last-child');
        
        // Kiểm tra xem có phải logout button không (icon là 'logout' hoặc text là 'Log out')
        if ((icon && icon.textContent.trim() === 'logout') || 
            (text && text.textContent.trim().toLowerCase() === 'log out')) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                
                // Xóa token trong localStorage
                localStorage.removeItem('token');
                
                // Redirect về trang login
                const isLiveServer = window.location.port === '5500';
                const basePath = isLiveServer ? '/frontend/publics' : '';
                window.location.href = basePath + '/login.html';
            });
        }
    });
});