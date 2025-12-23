document.addEventListener("DOMContentLoaded", () => {

    const contentArea = document.querySelector(".content-area");
    const pageTitle = document.getElementById("page-title");

    // ============================================================
    // 0. BIẾN TOÀN CỤC (GLOBAL STATE)
    // ============================================================

    // Lịch học
    let currentDate = new Date(); // Ngày hiện tại đang xem
    let lecturerScheduleData = []; // Dữ liệu lịch từ API

    // Khóa học & Bài giảng
    let currentSemesterForCourses = "";
    let allCoursesData = []; // Biến chứa toàn bộ dữ liệu gốc để lọc
    let currentCourseMaterials = [];
    let currentCourseInfo = {};

    // ============================================================
    // 1. ĐIỀU HƯỚNG (NAVIGATION & ROUTING)
    // ============================================================
    const getViewName = (path) => path.split('/').pop().replace('.html', '');
    const getPathFromView = (view) => `pages/${view}.html`;

    // Xử lý URL ban đầu
    const params = new URLSearchParams(window.location.search);
    const currentView = params.get('view') || 'trang-chu';
    const initialPath = getPathFromView(currentView);

    // Lấy tham số từ URL
    const view = params.get('view') || 'trang-chu';
    const path = `pages/${view}.html`;
    
    // Tìm menu tương ứng với trang hiện tại
    const link = document.querySelector(`.nav-link[data-page="${path}"]`);

    if (link) {
        // Trường hợp 1: Là trang có trong Menu (Trang chủ, Lịch học, Khóa học...)
        document.querySelector('.nav-link.active')?.classList.remove('active');
        link.classList.add('active');
        loadPage(path, link.dataset.title);
    } 
    else if (view === 'bai-giang') {
        // Trường hợp 2: Là trang BÀI GIẢNG (Trang con, không có menu) -> Vẫn load nhưng active menu cha
        document.querySelector('.nav-link.active')?.classList.remove('active');
        // Active menu "Các khóa học của tôi"
        const parentMenu = document.querySelector('[data-page="pages/khoa-hoc.html"]');
        if(parentMenu) parentMenu.classList.add('active');
        
        loadPage(path, 'Khóa học / Bài giảng');
    } 
    else {
        // Trường hợp 3: Link sai -> Về trang chủ
        loadPage('pages/trang-chu.html', 'Trang chủ');
    }

    // Load trang đầu tiên
    const initialLink = document.querySelector(`.nav-link[data-page="${initialPath}"]`);
    if (initialLink) {
        document.querySelector('.nav-link.active')?.classList.remove('active');
        initialLink.classList.add('active');
        loadPage(initialPath, initialLink.dataset.title);
    } else {
        loadPage('pages/trang-chu.html', 'Trang chủ');
        
    }
    
    // Load thông tin user lên Header
    loadUserInfo();

    // Sự kiện Click Menu
    const navLinks = document.querySelectorAll('.main-nav .nav-link, .bottom-nav .nav-link');
    navLinks.forEach(link => {
        // Bỏ qua nút Logout
        if (link.classList.contains('logout-btn')) return;

        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update UI
            document.querySelector('.nav-link.active')?.classList.remove('active');
            link.classList.add('active');
            
            const path = link.dataset.page;
            const title = link.dataset.title;
            const viewName = getViewName(path); 

            // Cập nhật URL không reload
            const newUrl = `${window.location.pathname}?view=${viewName}`;
            window.history.pushState({ path }, '', newUrl);

            loadPage(path, title);
        });
    });

    // Sự kiện Back/Forward trình duyệt
    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view') || 'trang-chu';
        const path = getPathFromView(view);
        
        const link = document.querySelector(`.nav-link[data-page="${path}"]`);
        const title = link ? link.dataset.title : 'Trang chủ';

        loadPage(path, title);
        
        document.querySelector('.nav-link.active')?.classList.remove('active');
        if(link) link.classList.add('active');
    });

    


    // --- HÀM TỔNG ĐÀI TẢI TRANG ---
    async function loadPage(url, title) {
        // [MỚI] Kiểm tra đăng nhập trước khi tải trang
        const email = localStorage.getItem('userEmail');
        if (!email) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            window.location.href = '../login.html';
            return;
        }
        try {
            const res = await fetch(url);
            if (res.ok) {
                const html = await res.text();
                contentArea.innerHTML = html;

                if (pageTitle) pageTitle.innerText = title;
                
                // === ROUTING: GỌI LOGIC RIÊNG CHO TỪNG TRANG ===

                if (url.includes('trang-chu.html')) {
                    await loadLecturerStats();
                }
                if (url.includes('lich-hoc.html')) {
                    await loadLecturerSchedule();
                    renderCalendar();
                    setupCalendarControls();
                }
                if (url.includes('ho-so.html')) {
                    loadUserProfileData(); 
                    
                }
                if (url.includes('khoa-hoc.html')) {
                    initCoursesPage();
                }
                if (url.includes('bai-giang.html')) {
                    // 1. Đổi tiêu đề trang
                    if (pageTitle) pageTitle.innerText = "Bài giảng";

                    // 2. Highlight menu 
                    document.querySelector('.nav-link.active')?.classList.remove('active');
                   
                    const courseMenu = document.querySelector('.nav-link[data-page="pages/khoa-hoc.html"]');
                    if(courseMenu) courseMenu.classList.add('active');

                    await initLessonsPage();
                    
                    
                    
                    
                }
                if (url.includes('bai-giang.html')) {
                    // ...
                    initLessonsPage(); // Mặc định load trang 1
                }

                // --- THÊM ĐOẠN NÀY ---
                if (url.includes('diem.html')) {
                    initGradesPage();
                }

                if (url.includes('danh-sach-sinh-vien.html')) {
                    // 1. Đổi tiêu đề to thành "Sinh viên / Điểm"
                    if (pageTitle) pageTitle.innerText = "Sinh viên / Điểm";

                    // 2. Highlight menu "Sinh viên / Điểm"
                    document.querySelector('.nav-link.active')?.classList.remove('active');
                    // Tìm menu có link là pages/diem.html
                    const gradeMenu = document.querySelector('.nav-link[data-page="pages/diem.html"]');
                    if(gradeMenu) gradeMenu.classList.add('active');

                    // 3. Chạy logic trang
                    initStudentListPage();
                }




            } else {
                contentArea.innerHTML = `<h2>Lỗi 404: Không tìm thấy trang ${url}</h2>`;
            }
        } catch (err) { 
            console.error("Lỗi tải trang:", err);
            contentArea.innerHTML = `<p>Đã xảy ra lỗi kết nối.</p>`;
        }
    }

    // ============================================================
    // 2. XỬ LÝ SỰ KIỆN TOÀN CỤC (FIX LỖI NÚT BẤM)
    // ============================================================
    
    document.addEventListener('click', (e) => {
        // A. Nút "Thêm bài giảng"
        if (e.target.closest('.btn-add-material')) {
            e.preventDefault();
            openAddMaterialModal();
        }

        // B. Nút "Đóng Modal" (Dấu X) 
        if (e.target.closest('.close-btn')) {
            e.preventDefault();
            closeMaterialModal();k
        }

        // C. Click ra ngoài vùng Modal để tắt
        if (e.target.classList.contains('modal-overlay')) {
            closeMaterialModal();
        }

        // E. Nút Xóa Bài Giảng
        if (e.target.closest('.delete-mat-btn')) {
            e.preventDefault();
            e.stopPropagation();

            const btn = e.target.closest('.delete-mat-btn');
            const id = btn.dataset.id;

            // Sửa lại câu thông báo cho đúng với logic mới
            if (confirm('Bạn có chắc chắn muốn xóa tài liệu này không?')) {
                // Gọi hàm xóa và chờ kết quả
                deleteMaterial(id); 
            }
        }
        
        // D. Logout
        if (e.target.closest('.logout-btn')) {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '../login.html';
        }
    });

    //----------------------------
    document.addEventListener('submit', async (e) => {
        
        // Kiểm tra xem có phải Form Hồ Sơ không
        if (e.target && e.target.id === 'profile-update-form') {
            e.preventDefault(); // CHẶN RELOAD TRANG TUYỆT ĐỐI
            
            const email = localStorage.getItem('userEmail');
            const sdt = document.getElementById('profile-phone').value.trim();
            const diaChi = document.getElementById('profile-address').value.trim();

            const phoneRegex = /^0\d{9}$/;

            if (!phoneRegex.test(sdt)) {
                // Hiển thị thông báo thân thiện
                alert("⚠️ Số điện thoại không hợp lệ!\n\nVui lòng nhập đúng 10 chữ số và bắt đầu bằng số 0.");
                
                // Dừng lại, KHÔNG gửi dữ liệu lên server nữa
                return; 
            }

            // Gọi API
            try {
                const response = await fetch('http://localhost:8000/api/users/update-profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, sdt, diaChi })
                });

                const result = await response.json();
                if (result.success) {
                    alert('🎉 Cập nhật hồ sơ thành công!');
                } else {
                    alert('Lỗi: ' + result.message);
                }
            } catch (err) { 
                console.error(err);
                alert('Lỗi kết nối server!'); 
            }
        }
        // Form Thêm Bài Giảng
        if (e.target.id === 'add-material-form') {
            e.preventDefault();
            const currentForm = e.target;
            
            const nameInput = currentForm.querySelector('#matName');
            const fileInput = currentForm.querySelector('#matFile');
            
            // Validate File
            if (!fileInput.files || fileInput.files.length === 0) {
                alert("Bạn chưa chọn file nào!");
                return;
            }

            // Validate Lớp
            const checkboxes = currentForm.querySelectorAll('input[name="class-option"]:checked');
            const selectedClasses = Array.from(checkboxes).map(cb => cb.value);

            if (selectedClasses.length === 0) {
                alert("Vui lòng chọn ít nhất 1 lớp!");
                return;
            }

            // Chuẩn bị dữ liệu
            const p = new URLSearchParams(window.location.search);
            const mscb = localStorage.getItem('userMSCB');

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('name', nameInput.value);
            formData.append('maMon', p.get('maMon'));
            formData.append('maHK', p.get('maHK'));
            formData.append('mscb', mscb);
            formData.append('classes', JSON.stringify(selectedClasses));

            // Gửi Request
            try {
                const res = await fetch('http://localhost:8000/api/materials/create', {
                    method: 'POST',
                    body: formData // Không set Content-Type thủ công
                });
                
                const result = await res.json();
                
                if (result.success) {
                    alert('Thêm tài liệu thành công!');
                    closeMaterialModal(); // Đóng modal
                    initLessonsPage();    // Tải lại bảng ngay lập tức
                } else {
                    alert('Lỗi Server: ' + result.message);
                }
            } catch(err) { 
                console.error(err);
                alert('Lỗi kết nối tới Server Backend!'); 
            }
        }

        // 3. FORM CẬP NHẬT BÀI GIẢNG
        if (e.target.id === 'edit-material-form') {
            e.preventDefault();
            const currentForm = e.target;

            const id = currentForm.querySelector('#edit-mat-id').value;
            const name = currentForm.querySelector('#edit-mat-name').value;
            const fileInput = currentForm.querySelector('#edit-mat-file');

            const formData = new FormData();
            formData.append('id', id); // ID để tìm
            formData.append('name', name);
            
            // Chỉ gửi file nếu người dùng có chọn
            if (fileInput.files.length > 0) {
                formData.append('file', fileInput.files[0]);
            }

            try {
                // Gọi API PUT
                const res = await fetch('http://localhost:8000/api/materials/update', {
                    method: 'PUT',
                    body: formData
                });
                
                const result = await res.json();
                if(result.success) {
                    alert('Cập nhật thành công!');
                    closeEditMaterialModal();
                    initLessonsPage(); // Tải lại bảng
                } else {
                    alert('Lỗi: ' + result.message);
                }
            } catch(err) { 
                console.error(err);
                alert('Lỗi kết nối!'); 
            }
        }
    });

    window.closeEditMaterialModal = () => document.getElementById('edit-material-modal').classList.remove('active');

    // ============================================================
    // 2. MODULE: TRANG CHỦ (DASHBOARD)
    // ============================================================
    async function loadLecturerStats() {
        const email = localStorage.getItem('userEmail');
        if (!email) return;

        try {
            const response = await fetch(`http://localhost:8000/api/dashboard/lecturer-stats?email=${email}`);
            const result = await response.json();

            if (result.success) {
                // 1. Cập nhật số liệu text 
                document.getElementById('stat-students').innerText = result.data.students;
                document.getElementById('stat-courses').innerText = result.data.courses;
                document.getElementById('stat-classes').innerText = result.data.classes;

                // 2. Cập nhật BIỂU ĐỒ
                updateChart(result.data.weeklySchedule);
            }
        } catch (error) {
            console.error("Lỗi tải thống kê:", error);
        }
    }

    // Hàm vẽ lại biểu đồ
    function updateChart(data) {
        // data là mảng 7 số: [soBuoiThu2, soBuoiThu3, ..., soBuoiCN]
        const bars = document.querySelectorAll('.bar-group .bar-wrapper');
        const maxY = 50; // Giá trị cao nhất của trục Y (để tính %)

        bars.forEach((wrapper, index) => {
            if (index < data.length) {
                const count = data[index]; // Số buổi học thật
                
                // Tính chiều cao phần trăm (Ví dụ: 5 buổi / 50 max = 10%)
                // Nếu count > 50 thì max là 100%
                let percent = (count / maxY) * 100;
                if (percent > 100) percent = 100;

                // Tìm thanh bar và tooltip bên trong
                const bar = wrapper.querySelector('.bar');
                const tooltip = wrapper.querySelector('.bar-tooltip');

                // Cập nhật giao diện
                if (bar) bar.style.height = `${percent}%`;
                
                if (tooltip) {
                    tooltip.innerText = count; // Số hiển thị khi hover
                    tooltip.dataset.value = count;
                }

                // Thêm class active cho cột nào có dữ liệu 
                if (count > 0) wrapper.classList.add('active');
                else wrapper.classList.remove('active');
            }
        });
    }

    // ============================================================
    // 3. MODULE: LỊCH HỌC (SCHEDULE)
    // ============================================================
    // 1. Gọi API lấy lịch
    async function loadLecturerSchedule() {
        const email = localStorage.getItem('userEmail');
        if (!email) return;
        try {
            const res = await fetch(`http://localhost:8000/api/schedules/lecturer?email=${email}`);
            const result = await res.json();
            if (result.success) {
                lecturerScheduleData = result.data;
            }
        } catch (err) { console.error(err); }
    }

    // 2. Vẽ Lịch Tháng
    function renderCalendar() {
        const daysContainer = document.getElementById('calendar-days');
        const monthYearText = document.getElementById('current-month-year');
        if (!daysContainer) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-11

        // Cập nhật tiêu đề tháng
        const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
        monthYearText.innerText = `${monthNames[month]} ${year}`;

        // Tính toán ngày
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=CN, 1=T2...
        // Chỉnh lại: 0 (CN) -> 6, 1 (T2) -> 0 để lịch bắt đầu từ Thứ 2
        const startDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let html = '';

        // Ngày tháng trước
        for (let i = startDayIndex; i > 0; i--) {
            html += `<div class="day-cell other-month"><div class="day-number">${daysInPrevMonth - i + 1}</div></div>`;
        }

        // Ngày tháng này
        for (let i = 1; i <= daysInMonth; i++) {
            // 1. Xác định ngày hiện tại đang xét (Cụ thể ngày/tháng/năm)
            const currentDayObj = new Date(year, month, i);
            
            // 2. Xác định Thứ (2-8)
            let dayOfWeek = currentDayObj.getDay() + 1;
            if(dayOfWeek === 1) dayOfWeek = 8; 

            // 3. Lọc lịch dạy
            const eventsToday = lecturerScheduleData.filter(s => {
                // Điều kiện 1: Phải đúng Thứ
                if (s.Thu !== dayOfWeek) return false;

                // Điều kiện 2: Phải nằm trong thời gian Học kỳ
                const semesterStart = new Date(s.NgayBatDau);
                
                // Đặt giờ về 0h00 để tính chính xác số ngày
                semesterStart.setHours(0,0,0,0);
                currentDayObj.setHours(0,0,0,0);
                
                // Tính khoảng cách thời gian (ms)
                const diffTime = currentDayObj.getTime() - semesterStart.getTime();
                
                // Đổi ra số ngày rồi chia 7 để ra số tuần
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const currentWeek = Math.floor(diffDays / 7) + 1;

                // Kiểm tra: Ngày này có nằm trong khoảng tuần học không?
                // Và quan trọng: Ngày xét phải >= Ngày bắt đầu (tránh số tuần âm)
                return diffDays >= 0 && currentWeek >= s.TuanBatDau && currentWeek <= s.TuanKetThuc;
            });
            
            // 4. Vẽ sự kiện 
            let eventsHtml = '';
            eventsToday.forEach((ev, idx) => {
                const colorClass = idx % 2 === 0 ? 'event-blue' : 'event-red';
                const tietHienThi = `${ev.TietBatDau} - ${ev.TietKetThuc}`;
                eventsHtml += `
                    <div class="event-box ${colorClass}">
                        <strong>${ev.MaLopHoc}</strong> - ${ev.TenMon}<br>
                        Phòng: ${ev.PhongHoc} (Tiết ${tietHienThi})
                    </div>
                `;
            });

            html += `
                <div class="day-cell">
                    <div class="day-number">${i}</div>
                    ${eventsHtml}
                </div>
            `;
        }

        daysContainer.innerHTML = html;
    }

    // 3. Sự kiện nút chuyển tháng
    function setupCalendarControls() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        const monthPicker = document.getElementById('month-picker'); 
        
        if(prevBtn && nextBtn && monthPicker) {
            // Clone để xóa event cũ
            const newPrev = prevBtn.cloneNode(true);
            const newNext = nextBtn.cloneNode(true);
            const newPicker = monthPicker.cloneNode(true);
            

            prevBtn.parentNode.replaceChild(newPrev, prevBtn);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            monthPicker.parentNode.replaceChild(newPicker, monthPicker);
           

       
            

            newPrev.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });

            newNext.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
            newPicker.addEventListener('change', (e) => {
                if(e.target.value) {
                    // Value trả về dạng "2025-11"
                    const [year, month] = e.target.value.split('-');
                    currentDate.setFullYear(year);
                    currentDate.setMonth(month - 1); // Month trong JS chạy từ 0-11
                    renderCalendar();
                }
            });
        }
    }

    


    // ============================================================
    // 4. MODULE: HỒ SƠ CÁ NHÂN (PROFILE)
    // ============================================================
    async function loadUserProfileData() {
        // Lấy email của CHÍNH MÌNH từ localStorage
        const email = localStorage.getItem('userEmail');
        
        if(!email) {
            console.error("Không tìm thấy email đăng nhập!");
            return;
        }

        setupUpdateProfileForm(email);

        try {
            // Gọi API lấy chi tiết (Dùng chung API với Admin)
            const response = await fetch(`http://localhost:8000/api/users/detail?email=${email}`);
            const result = await response.json();

            if(result.success) {
                const u = result.data;
                
                // Điền thông tin (Mapping ID đúng với file ho-so.html)
                if(document.getElementById('profile-name')) document.getElementById('profile-name').value = u.HoTen;
                if(document.getElementById('profile-email')) document.getElementById('profile-email').value = u.Email;
                if(document.getElementById('profile-id')) document.getElementById('profile-id').value = u.MSCB || u.MSSV;
                if(document.getElementById('profile-dept')) document.getElementById('profile-dept').value = u.Khoa;
                
                // Các trường được sửa
                if(document.getElementById('profile-address')) document.getElementById('profile-address').value = u.DiaChi || '';
                if(document.getElementById('profile-phone')) document.getElementById('profile-phone').value = u.SDT || '';

               
                
            }
        } catch (err) { console.error(err); }
    }

    function setupUpdateProfileForm(email) {
        const form = document.getElementById('profile-update-form');
        if(!form) return;

        // Clone để tránh lặp sự kiện
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const sdt = document.getElementById('profile-phone').value;
            const diaChi = document.getElementById('profile-address').value;

            try {
                const response = await fetch('http://localhost:8000/api/users/update-profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, sdt, diaChi })
                });

                const result = await response.json();
                if(result.success) {
                    alert('🎉 Cập nhật hồ sơ thành công!');
                } else {
                    alert('Lỗi: ' + result.message);
                }
            } catch (err) { alert('Lỗi kết nối!'); }
        });
    }

    // ============================================================
    // 5. MODULE: KHÓA HỌC CỦA TÔI (COURSES)
    // ============================================================

    async function initCoursesPage() {
        // 1. Tải danh sách học kỳ
        await loadSemestersForCourseFilter();
        
        const filter = document.getElementById('course-semester-filter');
        if(filter) {
            // Gắn sự kiện đổi học kỳ
            filter.addEventListener('change', (e) => {
                currentSemesterForCourses = e.target.value;
                loadMyCourses(currentSemesterForCourses);
            });
            
        
        }

        // 2. Kích hoạt tính năng tìm kiếm
        setupCourseSearch();
    }

    // Hàm tải dữ liệu từ API
    async function loadMyCourses(maHK) {
        const email = localStorage.getItem('userEmail');
        currentSemesterForCourses = maHK;
        if (!email || !maHK) return;

        try {
            const response = await fetch(`http://localhost:8000/api/classes/my-courses?email=${email}&maHK=${maHK}`);
            const result = await response.json();

            const tbody = document.getElementById('course-table-body');
            if(!tbody) return;
            tbody.innerHTML = '';
            
            if (result.success) {
                if (result.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Chưa có lớp học nào.</td></tr>';
                    return;
                }
                allCoursesData = result.data; // Lưu dữ liệu gốc vào biến toàn cục
                renderCoursesTable(allCoursesData); // Vẽ bảng với toàn bộ dữ liệu
            }
        } catch (err) { console.error(err); }
    }

    // Hàm vẽ bảng (Nhận vào data để vẽ - phục vụ cho việc lọc)
    function renderCoursesTable(data) {
        const tbody = document.getElementById('course-table-body');
        
        if(!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Không tìm thấy khóa học nào.</td></tr>';
            return;
        }
        
        data.forEach((c, index) => {
            const classesArray = c.DanhSachLop ? c.DanhSachLop.split(', ') : [];
            const classesHTML = classesArray.map(cls => `<span class="class-tag" style="display:inline-block; background:#EEF2FF; color:#4F46E5; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:600; margin-right:4px;">${cls}</span>`).join('');

            const urlParams = `?view=bai-giang&maMon=${c.MaMon}&tenMon=${encodeURIComponent(c.TenMon)}&maHK=${currentSemesterForCourses}`;

            const row = `
                <tr>
                    <td style="text-align: center; color: #666;">${index + 1}</td>
                    <td style="text-align: center; font-weight: 600;">${c.MaMon}</td>
                    <td style="font-weight: 500;">${c.TenMon}</td>
                    <td style="text-align: center;">${c.SoTinChi}</td>
                    <td>${classesHTML}</td>
                    <td style="text-align: center; font-weight: bold;">${c.TongSinhVien || 0}</td>
                    
                    <td style="text-align: center;">
                        <span class="btn-detail-course" 
                              onclick="navigateToUrl('${urlParams}')" 
                              style="color: #4F46E5; font-weight: bold; font-size: 20px; cursor: pointer; display: inline-block; width: 100%; height: 100%;">
                            &gt;
                        </span>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // Hàm xử lý tìm kiếm
    function setupCourseSearch() {
        const searchInput = document.getElementById('course-search-input');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase().trim();

            // Lọc dữ liệu từ biến allCoursesData
            const filteredData = allCoursesData.filter(course => {
                const maMon = course.MaMon.toLowerCase();
                const tenMon = course.TenMon.toLowerCase();
                
                // Trả về true nếu Mã môn HOẶC Tên môn chứa từ khóa
                return maMon.includes(keyword) || tenMon.includes(keyword);
            });

            // Vẽ lại bảng với dữ liệu đã lọc
            renderCoursesTable(filteredData);
        });
    }

    async function loadSemestersForCourseFilter() {
        try {
            const response = await fetch('http://localhost:8000/api/semesters');
            const result = await response.json();
            const filter = document.getElementById('course-semester-filter');
            
            if (result.success && filter) {
                filter.innerHTML = ''; // Xóa sạch option cũ
                
                let selectedSemester = ""; // Biến lưu mã HK cần chọn
                const today = new Date();  // Lấy thời gian hiện tại
                
                // Xóa giờ phút giây để so sánh ngày thuần túy
                today.setHours(0, 0, 0, 0);

                console.log("--- BẮT ĐẦU TÌM HỌC KỲ HIỆN TẠI ---");
                console.log("Hôm nay là:", today.toLocaleDateString());

                // 1. Sắp xếp danh sách: Mới nhất lên đầu (để Dropdown đẹp)
                // Giả sử MaHocKy có dạng 'HK1_2526', ta sort theo NamHoc và MaHK
                const sortedData = result.data.sort((a, b) => {
                    return b.NgayBatDau.localeCompare(a.NgayBatDau); // Mới nhất lên trên
                });

                sortedData.forEach((hk) => {
                    const option = document.createElement('option');
                    option.value = hk.MaHocKy;
                    option.text = `${hk.MaHocKy} (${hk.NamHoc})`;
                    filter.appendChild(option);

                    // 2. LOGIC TÌM HỌC KỲ CHUẨN XÁC
                    const startDate = new Date(hk.NgayBatDau);
                    const endDate = new Date(hk.NgayKetThuc);
                    
                    // Reset giờ của ngày bắt đầu/kết thúc để so sánh chính xác
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setHours(23, 59, 59, 999); // Kết thúc vào cuối ngày

                    // Kiểm tra: Hôm nay có nằm trong khoảng này không?
                    if (today >= startDate && today <= endDate) {
                        selectedSemester = hk.MaHocKy;
                        console.log(`✅ TÌM THẤY: ${hk.MaHocKy} phù hợp! (${hk.NgayBatDau} -> ${hk.NgayKetThuc})`);
                    }
                });

                // 3. XỬ LÝ CHỌN MẶC ĐỊNH
                if (selectedSemester) {
                    // Ưu tiên 1: Chọn đúng HK đang diễn ra
                    filter.value = selectedSemester;
                    currentSemesterForCourses = selectedSemester;
                } 
                else if (sortedData.length > 0) {
                    // Ưu tiên 2: Nếu đang nghỉ hè/tết (không thuộc HK nào), chọn cái MỚI NHẤT (đầu danh sách)
                    console.log("⚠️ Không tìm thấy HK hiện tại (đang nghỉ). Chọn HK mới nhất.");
                    currentSemesterForCourses = sortedData[0].MaHocKy;
                    filter.value = currentSemesterForCourses;
                }

                // 4. Gọi hàm load dữ liệu ngay lập tức
                if (currentSemesterForCourses) {
                    loadMyCourses(currentSemesterForCourses);
                }
            }
        } catch (err) { console.error("Lỗi tải danh sách học kỳ:", err); }
    }

    // ============================================================
    // 6. MODULE: BÀI GIẢNG (LESSONS) 
    // ============================================================

    

    async function initLessonsPage(page = 1) {
        const p = new URLSearchParams(window.location.search);
        const maMon = p.get('maMon');
        const tenMon = decodeURIComponent(p.get('tenMon'));
        const maHK = p.get('maHK');
        const email = localStorage.getItem('userEmail');

        if(!maMon || !maHK) return;

        
        try {
            // Gọi API (có truyền tham số page)
            const response = await fetch(`http://localhost:8000/api/materials?email=${email}&maMon=${maMon}&maHK=${maHK}&page=${page}`);
            const result = await response.json();

            if(result.success) {
                const { classList, materials, total, totalPages } = result.data;
                
                document.getElementById('course-header-title').innerText = `${tenMon} (${maMon}) - ${maHK} [${classList}]`;
                
                currentCourseInfo = { classList }; 
                currentCourseMaterials = materials;
                

                // 1. Vẽ bảng
                renderMaterialsTable(materials);
                
                // 2. Vẽ nút phân trang (QUAN TRỌNG)
                

                setupMaterialSearch();
                
            }
        } catch(e) { console.error(e); }
    }

    function renderMaterialsTable(data) {
        const tbody = document.getElementById('material-table-body');
        if(!tbody) return;
        tbody.innerHTML = data.length ? '' : '<tr><td colspan="6" class="text-center">Chưa có bài giảng.</td></tr>';

        data.forEach(m => {
            const dateStr = new Date(m.NgayTaiLen).toLocaleDateString('vi-VN');
            const downloadLink = `http://localhost:8000/api/materials/download/${m.MaTaiLieu}`;
            const dataString = JSON.stringify({ 
                id: m.MaTaiLieu, 
                name: m.TenFile, 
                classes: m.CacLop // Lấy chuỗi "L01, L06" từ API
            }).replace(/"/g, '&quot;');

            const row = `
                <tr>
                    <td>
                        <div class="mat-name-wrapper">
                            <span class="material-symbols-outlined file-icon" style="color: #E9A400;">description</span>
                            <span class="file-name">${m.TenFile}</span>
                        </div>
                    </td>
                    
                    <td style="text-align: center;">
                        <span class="class-badge" style="background:#EEF2FF; color:#4F46E5; padding:4px 8px; border-radius:4px; font-weight:600;">
                            [${m.CacLop}]
                        </span>
                    </td>
                    
                    <td style="text-align: center;">${dateStr}</td>
                    
                    <td style="text-align: center;">
                        <a href="${downloadLink}" class="material-symbols-outlined btn-download" style="color: #333; text-decoration: none;">download</a>
                    </td>
                    <td style="text-align: center;">
                        <button class="action-btn edit-mat-btn" data-info="${dataString}" style="border:none; background:none; cursor:pointer;">
                            <span class="material-symbols-outlined" style="color:#3b82f6">edit</span>
                        </button>
                    </td>
                    <td style="text-align: center;">
                        <button class="action-btn delete-mat-btn" data-id="${m.MaTaiLieu}" style="border:none; background:none; cursor:pointer;">
                            <span class="material-symbols-outlined" style="color:#ef4444">delete</span>
                        </button>
                    </td>
                </tr>`;
            tbody.innerHTML += row;
        });

        // Gắn lại sự kiện click
        document.querySelectorAll('.edit-mat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const data = JSON.parse(e.currentTarget.dataset.info);
                openEditMaterialModal(data);
            });
        });


    }

    // --- LOGIC MODAL SỬA ---
    function openEditMaterialModal(data) {
        const modal = document.getElementById('edit-material-modal');
        if (!modal) return;
        
        // Reset form
        document.getElementById('edit-material-form').reset();

        // Điền dữ liệu cũ
        document.getElementById('edit-mat-id').value = data.id;
        document.getElementById('edit-mat-name').value = data.name;
        document.getElementById('edit-mat-classes').value = data.classes; // Hiện danh sách lớp (readonly)
        
        modal.classList.add('active');
    }


    function setupMaterialSearch() {
        const searchInput = document.getElementById('material-search-input');
        if(!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const filtered = currentCourseMaterials.filter(m => 
                m.TenFile.toLowerCase().includes(keyword)
            );
            renderMaterialsTable(filtered);
        });
    }

    // Thêm hàm đóng modal vào window
    window.closeEditMaterialModal = function() {
        document.getElementById('edit-material-modal')?.classList.remove('active');
    }

    // Hàm quay lại-------------------
    window.goBackToCourses = function() {
        const newUrl = window.location.pathname + '?view=khoa-hoc';
        window.history.pushState({}, '', newUrl);
        loadPage('pages/khoa-hoc.html', 'Các khóa học của tôi');
    }

    // ============================================================
    // 9. LOGIC THÊM BÀI GIẢNG (CHUẨN HÓA GIỐNG CẬP NHẬT)
    // ============================================================

    window.openAddMaterialModal = function() {
        const modal = document.getElementById('material-modal');
        if (!modal) return;
        
        document.getElementById('add-material-form').reset();
        
        // Tạo Checkbox chọn lớp
        const container = document.getElementById('class-checkboxes');
        container.innerHTML = '';
        
        if (currentCourseInfo && currentCourseInfo.classList) {
            // Tách chuỗi "L01, L02" thành mảng
            const classes = currentCourseInfo.classList.split(',').map(s => s.trim());
            
            // Tạo nút "Chọn tất cả" nếu cần (tùy chọn)
            
            classes.forEach(cls => {
                if(cls) {
                    // Tạo HTML Checkbox
                    const wrapper = document.createElement('div');
                    wrapper.style.display = 'flex';
                    wrapper.style.alignItems = 'center';
                    wrapper.style.gap = '5px';
                    
                    wrapper.innerHTML = `
                        <input type="checkbox" name="class-option" value="${cls}" id="chk-new-${cls}" checked>
                        <label for="chk-new-${cls}" style="margin:0; cursor:pointer;">${cls}</label>
                    `;
                    container.appendChild(wrapper);
                }
            });
        } else {
            container.innerHTML = '<span style="color:red">Không tìm thấy lớp.</span>';
        }
        
        modal.classList.add('active');
    }

    function closeMaterialModal() {
        const modal = document.getElementById('material-modal');
        if(modal) modal.classList.remove('active');
    }

    

    async function deleteMaterial(id) {
        try {
            const res = await fetch(`http://localhost:8000/api/materials/delete/${id}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            
            if (result.success) {
                alert('Đã xóa thành công!');
                // Tải lại bảng dữ liệu (giữ nguyên trang hiện tại)
                initLessonsPage();
            } else {
                alert('Lỗi: ' + result.message);
            }
        } catch (err) {
            alert('Lỗi kết nối server!');
            console.error(err);
        }
    }



    // ============================================================
    // 8. MODULE: SINH VIÊN / ĐIỂM (GRADE MANAGEMENT)
    // ============================================================
    
    let currentSemesterForGrades = "";
    let allGradesData = [];

    async function initGradesPage() {
        // 1. Tải danh sách học kỳ vào dropdown riêng của trang Điểm
        await loadSemestersForGradeFilter();
        
        const filter = document.getElementById('grade-semester-filter');
        if(filter) {
            filter.addEventListener('change', (e) => {
                currentSemesterForGrades = e.target.value;
                loadLecturerClassesSeparate(currentSemesterForGrades);
            });
            
        
        }

        // Tìm kiếm
        document.getElementById('grade-search-input')?.addEventListener('input', (e) => {
            const k = e.target.value.toLowerCase();
            const filtered = allGradesData.filter(c => 
                c.MaLopHoc.toLowerCase().includes(k) || 
                c.MaMon.toLowerCase().includes(k) || 
                c.TenMon.toLowerCase().includes(k)
            );
            renderGradesTable(filtered);
        });
    }

    async function loadSemestersForGradeFilter() {
        try {
            const response = await fetch('http://localhost:8000/api/semesters');
            const result = await response.json();
            const filter = document.getElementById('grade-semester-filter');
            
            if (result.success && filter) {
                filter.innerHTML = '';
                
                let selectedSemester = "";
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Đưa về 0h để so sánh chính xác

                // Sắp xếp mới nhất lên đầu
                const sortedData = result.data.sort((a, b) => b.NgayBatDau.localeCompare(a.NgayBatDau));

                sortedData.forEach(hk => {
                    const option = document.createElement('option');
                    option.value = hk.MaHocKy;
                    option.text = `${hk.MaHocKy} (${hk.NamHoc})`;
                    filter.appendChild(option);

                    // --- LOGIC TÌM HỌC KỲ HIỆN TẠI ---
                    const startDate = new Date(hk.NgayBatDau);
                    const endDate = new Date(hk.NgayKetThuc);
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setHours(23, 59, 59, 999);

                    if (today >= startDate && today <= endDate) {
                        selectedSemester = hk.MaHocKy;
                    }
                });

                // --- CHỌN MẶC ĐỊNH ---
                if (selectedSemester) {
                    // Ưu tiên 1: Học kỳ hiện tại
                    filter.value = selectedSemester;
                    currentSemesterForGrades = selectedSemester;
                } else if (sortedData.length > 0) {
                    // Ưu tiên 2: Học kỳ mới nhất (nếu đang nghỉ)
                    currentSemesterForGrades = sortedData[0].MaHocKy;
                    filter.value = currentSemesterForGrades;
                }

                // Tải dữ liệu danh sách lớp ngay lập tức
                if (currentSemesterForGrades) {
                    loadLecturerClassesSeparate(currentSemesterForGrades);
                }
            }
        } catch(e){ console.error(e); }
    }

    async function loadLecturerClassesSeparate(maHK) {
        const email = localStorage.getItem('userEmail');
        if (!email || !maHK) return;
        try {
            // Gọi API MỚI
            const res = await fetch(`http://localhost:8000/api/classes/my-classes-separate?email=${email}&maHK=${maHK}`);
            const json = await res.json();
            allGradesData = json.data || [];
            renderGradesTable(allGradesData);
        } catch (err) { console.error(err); }
    }

    function renderGradesTable(data) {
        const tbody = document.getElementById('grade-table-body');
        if(!tbody) return;
        tbody.innerHTML = data.length ? '' : '<tr><td colspan="6" class="text-center">Không có lớp học nào.</td></tr>'; // colspan=6 vì bớt 1 cột
        
        data.forEach((c, i) => {
            // Tạo data để truyền vào nút
            const urlParams = `?view=danh-sach-sinh-vien&maLop=${c.MaLopHoc}&maMon=${c.MaMon}&maHK=${currentSemesterForGrades}&tenMon=${encodeURIComponent(c.TenMon)}`;

            const row = `
                <tr>
                    <td style="text-align: center; color: #666;">${i + 1}</td>
                    <td style="text-align: center; font-weight: 700; color: #4F46E5;">${c.MaLopHoc}</td>
                    <td style="text-align: center;">${c.MaMon}</td>
                    <td style="font-weight: 500;">${c.TenMon}</td>
                    <td style="text-align: center; font-weight: bold;">${c.SiSoHienTai} / ${c.SiSoToiDa}</td>
                    
                    <td style="text-align: center;">
                         <button class="action-btn" onclick="navigateToUrl('${urlParams}')"
                            style="border:none; background:none; cursor:pointer; color:#E9A400; font-weight:bold;">
                            <span class="material-symbols-outlined">edit_note</span>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        // Gắn sự kiện click cho nút này
        document.querySelectorAll('.btn-grade-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const data = JSON.parse(e.currentTarget.dataset.info);
                // Chuyển trang (Sẽ làm ở bước sau)
                alert(`Xem danh sách lớp ${data.MaLopHoc} môn ${data.TenMon}`);
            });
        });
    }

    // ============================================================
    // 9. MODULE: CHI TIẾT DANH SÁCH SINH VIÊN & ĐIỂM
    // ============================================================
    
    let allStudentGrades = [];
    let currentCourseStructure = [];

    async function initStudentListPage() {
        const p = new URLSearchParams(window.location.search);
        const maLop = p.get('maLop');
        const maMon = p.get('maMon');
        const maHK = p.get('maHK');
        const tenMon = decodeURIComponent(p.get('tenMon'));

        if(!maLop || !maMon) return;

        // Cập nhật tiêu đề
        const titleEl = document.getElementById('student-list-title');
        if(titleEl) titleEl.innerText = `${maLop} - ${tenMon} (${maHK})`;

        try {
            const res = await fetch(`http://localhost:8000/api/grades/class-grades?maLop=${maLop}&maMon=${maMon}&maHK=${maHK}`);
            const json = await res.json();
            
            if(json.success) {
                // Cấu trúc dữ liệu mới trả về
                const { students, structure } = json.data;
                
                allStudentGrades = students;
                currentCourseStructure = structure; // Lưu cấu trúc điểm

                renderStudentGradeTable(allStudentGrades);
                
                // Tìm kiếm sinh viên
                document.getElementById('student-search-input')?.addEventListener('input', (e) => {
                    const k = e.target.value.toLowerCase();
                    const filtered = allStudentGrades.filter(s => 
                        s.HoTen.toLowerCase().includes(k) || s.MSSV.toLowerCase().includes(k)
                    );
                    renderStudentGradeTable(filtered);
                });
            }
        } catch(e) { console.error(e); }
    }

    function renderStudentGradeTable(data) {
        const tbody = document.getElementById('student-list-body');
        if(!tbody) return;
        tbody.innerHTML = data.length ? '' : '<tr><td colspan="11" class="text-center">Lớp chưa có sinh viên.</td></tr>';

        data.forEach((s, i) => {
            const formatScore = (score) => score !== null ? score : '-';
            // Dữ liệu để truyền vào Modal
            const dataString = JSON.stringify(s).replace(/"/g, '&quot;');

            const row = `
                <tr>
                    <td style="text-align: center; color: #666;">${i + 1}</td>
                    <td style="text-align: center; font-weight: 600; color: #333;">${s.MSSV}</td>
                    <td style="text-align: left; padding-left: 15px; font-weight: 500;">${s.HoTen}</td>
                    <td style="text-align: center; font-size: 13px; color: #555;">${s.SDT || '-'}</td>
                    <td style="text-align: left; font-size: 13px; color: #555;">${s.Email}</td>
                    
                    <td style="text-align: center;">${formatScore(s.GK)}</td>
                    <td style="text-align: center;">${formatScore(s.CK)}</td>
                    <td style="text-align: center;">${formatScore(s.BTL)}</td>
                    <td style="text-align: center;">${formatScore(s.Quiz)}</td>
                    <td style="text-align: center;">${formatScore(s.TN)}</td>
                    
                    <td style="text-align: center;">
                        <button class="action-btn btn-edit-grade" data-info="${dataString}" 
                            style="border:none; background:none; cursor:pointer; color:#3b82f6;">
                            <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
        setupGradeEditEvents(); // Gắn sự kiện click
    }

    let currentGradeEditInfo = {}; // Lưu thông tin SV đang sửa

    function setupGradeEditEvents() {
        document.querySelectorAll('.btn-edit-grade').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const s = JSON.parse(e.currentTarget.dataset.info);
                openGradeModal(s);
            });
        });
    }

    function openGradeModal(s) {
        currentGradeEditInfo = s; 
        
        document.getElementById('grade-sv-name').innerText = s.HoTen;
        document.getElementById('grade-sv-mssv').innerText = s.MSSV;
        
        // Danh sách mapping ID input với Tên thành phần trong DB
        const mapping = {
            'score-gk': 'Giữa kì',
            'score-ck': 'Cuối kì',
            'score-btl': 'BTL',
            'score-quiz': 'Quiz',
            'score-tn': 'Thí nghiệm'
        };

        for (const [id, name] of Object.entries(mapping)) {
            const input = document.getElementById(id);
            if (!input) continue;

            // 1. Kiểm tra xem môn này CÓ cột điểm này không?
            const isExist = currentCourseStructure.includes(name);

            if (isExist) {
                // Có -> Mở khóa, điền điểm
                input.disabled = false;
                input.placeholder = "-";
                input.style.backgroundColor = "white";
                
                // Map giá trị từ object s (s.GK, s.CK...)
                // Cần map name ('Giữa kì') sang key của s ('GK')
                let val = null;
                if(name === 'Giữa kì') val = s.GK;
                else if(name === 'Cuối kì') val = s.CK;
                else if(name === 'BTL') val = s.BTL;
                else if(name === 'Quiz') val = s.Quiz;
                else if(name === 'Thí nghiệm') val = s.TN;

                input.value = val !== null ? val : '';
            } else {
                // Không có -> Khóa lại, làm mờ
                input.disabled = true;
                input.value = '';
                input.placeholder = "X";
                input.style.backgroundColor = "#f0f0f0"; // Xám
            }
        }

        document.getElementById('grade-modal').classList.add('active');
    }

    // Xử lý Submit Form Điểm (Dùng Event Delegation toàn cục)
    document.addEventListener('submit', async (e) => {
        if (e.target.id === 'update-grade-form') {
            e.preventDefault();
            
            const p = new URLSearchParams(window.location.search);
            
            // Lấy giá trị các ô input (nếu rỗng thì gửi null hoặc chuỗi rỗng)
            const grades = {
                'Giữa kì': document.getElementById('score-gk').value,
                'Cuối kì': document.getElementById('score-ck').value,
                'BTL': document.getElementById('score-btl').value,
                'Quiz': document.getElementById('score-quiz').value,
                'Thí nghiệm': document.getElementById('score-tn').value
            };

            const payload = {
                mssv: currentGradeEditInfo.MSSV,
                maLop: p.get('maLop'),
                maMon: p.get('maMon'), // QUAN TRỌNG: Phải khớp với DB
                maHK: p.get('maHK'),
                grades: grades
            };

            try {
                const res = await fetch('http://localhost:8000/api/grades/update', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                
                if(result.success) {
                    alert('Cập nhật điểm thành công!');
                    document.getElementById('grade-modal').classList.remove('active');
                    await initStudentListPage();
                } else { alert('Lỗi: ' + result.message); }
            } catch(err) { alert('Lỗi kết nối!'); }
        }
    });
    
    window.closeGradeModal = () => document.getElementById('grade-modal').classList.remove('active');


    
    // ============================================================
    // 7. GLOBAL HELPERS (ĐỂ Ở NGOÀI DOMContentLoaded)
    // ============================================================



    // Navigation Helper
    window.navigateToUrl = function(url) {
        const newUrl = window.location.pathname + url;
        window.history.pushState({}, '', newUrl);
        const event = new PopStateEvent('popstate');
        window.dispatchEvent(event);
    }

    window.goBackToGrades = function() {
        window.navigateToUrl('?view=diem');
    }

    async function loadUserInfo() {
        // 1. Lấy email từ bộ nhớ (lúc đăng nhập đã lưu)
        const email = localStorage.getItem('userEmail');
        
        if (!email) {
            console.log("Chưa đăng nhập, không lấy được tên.");
            return;
        }

        try {
            // 2. Gọi API lấy thông tin chi tiết
            const response = await fetch(`http://localhost:8000/api/users/detail?email=${email}`);
            const result = await response.json();

            if (result.success) {
                const user = result.data;
                localStorage.setItem('userMSCB', user.MSCB);
                
                // 3. Tìm chỗ hiển thị tên và thay thế
                // Tìm thẻ có class="user-name"
                const nameEl = document.querySelector('.user-name');
                if (nameEl) {
                    nameEl.innerText = user.HoTen; // <--- ĐỔI TÊN Ở ĐÂY
                }

                // 4. Tìm chỗ hiển thị Avatar (Hình tròn) và thay thế
                // Tìm thẻ có class="avatar-circle"
                const avatarEl = document.querySelector('.avatar-circle');
                if (avatarEl) {
                    // Lấy 2 chữ cái đầu của tên (Ví dụ: Nguyễn Văn An -> NA)
                    const nameParts = user.HoTen.trim().split(' ');
                    let initials = '';
                    if (nameParts.length > 1) {
                        initials = nameParts[0][0] + nameParts[nameParts.length - 1][0];
                    } else {
                        initials = nameParts[0].substring(0, 2);
                    }
                    avatarEl.innerText = initials.toUpperCase(); // <--- ĐỔI AVATAR Ở ĐÂY
                }
            }
        } catch (err) { 
            console.error("Lỗi tải thông tin user:", err); 
        }
    }


});
