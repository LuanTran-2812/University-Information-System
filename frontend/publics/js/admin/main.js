document.addEventListener("DOMContentLoaded", () => {
    const pageTitleSlot = document.getElementById("page-title");
    const controlsSlot = document.getElementById("dynamic-controls-slot");
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

    // Hàm chính để tải trang
    async function loadPage(pageUrl, controlsUrl, title) {
        contentAreaSlot.innerHTML = "<h2>Đang tải...</h2>"; // Hiển thị loading
        
        try {
            // Tải song song nội dung và thanh điều khiển
            const [pageHtml, controlsHtml] = await Promise.all([
                fetchHtml(pageUrl),
                fetchHtml(controlsUrl)
            ]);

            // "Bơm" HTML vào các "lỗ hổng"
            pageTitleSlot.innerText = title;
            controlsSlot.innerHTML = controlsHtml;
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
            const controlsUrl = link.dataset.controls;
            const title = link.dataset.title;

            // Tải nội dung trang tương ứng
            loadPage(pageUrl, controlsUrl, title);
        });
    });

    // 6. TẢI TRANG MẶC ĐỊNH tìm link đang có class 'active' trong HTML (là "Trang chủ")
    const defaultActiveLink = document.querySelector(".main-nav .nav-link.active");
    if (defaultActiveLink) {
        loadPage(
            defaultActiveLink.dataset.page,
            defaultActiveLink.dataset.controls,
            defaultActiveLink.dataset.title
        );
    }

    // === XỬ LÝ CUSTOM DROPDOWN (BỘ LỌC) ===

    // 1. Lắng nghe click trên toàn bộ tài liệu
    document.body.addEventListener('click', (event) => {
        
        // Lấy container của dropdown (nếu có)
        // .closest() sẽ tìm thẻ cha gần nhất có class .custom-select-wrapper
        const wrapper = event.target.closest('.custom-select-wrapper');

        // Nếu không bấm vào dropdown nào, đóng tất cả các dropdown đang mở
        if (!wrapper) {
            document.querySelectorAll('.custom-select-wrapper.open')
                .forEach(openWrapper => openWrapper.classList.remove('open'));
            return;
        }

        // 2. Xử lý khi bấm vào HỘP TRỊGGER (để Mở/Đóng)
        if (event.target.closest('.custom-select-trigger')) {
            wrapper.classList.toggle('open');
        }

        // 3. Xử lý khi bấm vào MỘT LỰA CHỌN (Option)
        if (event.target.classList.contains('custom-option')) {
            // Lấy text và value
            const selectedText = event.target.innerText;
            const selectedValue = event.target.dataset.value;

            // Lấy phần tử hiển thị text
            const trigger = wrapper.querySelector('.custom-select-trigger');
            const textElement = wrapper.querySelector('#selected-semester-text');

            // Cập nhật text, thêm class 'selected' để đổi màu chữ
            textElement.innerText = selectedText;
            trigger.classList.add('selected');
            
            // Đóng menu lại
            wrapper.classList.remove('open');

            // (Quan trọng) GỌI API LỌC CỦA BẠN Ở ĐÂY
            console.log("Đã chọn học kỳ:", selectedValue);
            // loadContentArea('pages/mon-hoc.html', selectedValue); // Gọi hàm lọc
        }
    });

    // === XỬ LÝ LOGOUT ===
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
                // Kiểm tra xem đang chạy ở Live Server hay Backend
                const isLiveServer = window.location.port === '5500';
                const basePath = isLiveServer ? '/frontend/publics' : '';
                window.location.href = basePath + '/login.html';
            });
        }
    });
});