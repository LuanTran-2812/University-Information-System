document.addEventListener("DOMContentLoaded", () => {
    const contentArea = document.querySelector(".content-area");
    const pageTitle = document.getElementById("page-title");

    let currentSemesterID = "";
    let allStudentCourses = [];


    // ============================================================
    // 1. KHỞI TẠO & XỬ LÝ URL BAN ĐẦU (INITIAL LOAD)
    // ============================================================
    
    // Hàm tiện ích: Lấy tên view từ đường dẫn (VD: pages/lich-hoc.html -> lich-hoc)
    const getViewFromPath = (path) => path.split('/').pop().replace('.html', '');
    
    // Hàm tiện ích: Lấy đường dẫn từ tên view (VD: lich-hoc -> pages/lich-hoc.html)
    const getPathFromView = (view) => `pages/${view}.html`;

    // 1.1. Lấy tham số ?view=... từ URL hiện tại
    const params = new URLSearchParams(window.location.search);
    let currentView = params.get('view');

    // Nếu không có view (lần đầu vào), mặc định là 'trang-chu'
    if (!currentView) {
        currentView = 'trang-chu';
        // Cập nhật lại URL cho đẹp (thêm ?view=trang-chu)
        window.history.replaceState({ path: 'pages/trang-chu.html' }, '', '?view=trang-chu');
    }

    // 1.2. Xác định file cần load
    const initialPath = getPathFromView(currentView);

    // 1.3. Active menu tương ứng
    const activeMenu = document.querySelector(`.nav-link[data-page="${initialPath}"]`);
    if (activeMenu) {
        document.querySelector('.nav-link.active')?.classList.remove('active');
        activeMenu.classList.add('active');
        // Tải trang và đặt tiêu đề
        loadPage(initialPath, activeMenu.getAttribute('data-title')); 
    } else {
        // Trường hợp view không có trong menu (ví dụ trang chi tiết), vẫn load nhưng không active menu
        loadPage(initialPath, 'Hệ thống');
    }

    // Tải thông tin user lên header

    // --- 1. ROUTING CƠ BẢN ---
    // (Copy phần routing từ lecturer/main.js sang đây, chỉ sửa đường dẫn nếu cần)
    // ...
    loadPage('pages/trang-chu.html', 'Trang chủ'); 

    loadUserInfo();

    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        // Bỏ qua nút đăng xuất
        if (link.classList.contains('logout-btn')) return;

        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const path = link.getAttribute('data-page'); // VD: pages/lich-hoc.html
           const title = link.getAttribute('data-title');         // VD: Lịch học
            const viewName = getViewFromPath(path);      // VD: lich-hoc

            // 1. Đổi màu menu
            document.querySelector('.nav-link.active')?.classList.remove('active');
            link.classList.add('active');

            // 2. QUAN TRỌNG: Đổi URL trên thanh địa chỉ (không reload)
            const newUrl = `${window.location.pathname}?view=${viewName}`;
            window.history.pushState({ path }, '', newUrl);

            // 3. Tải nội dung
            loadPage(path, title);
        });
    });

    // ============================================================
    // 3. XỬ LÝ NÚT BACK/FORWARD TRÌNH DUYỆT (POPSTATE)
    // ============================================================
    window.addEventListener('popstate', () => {
        // Khi người dùng bấm Back, lấy lại param từ URL cũ
        const p = new URLSearchParams(window.location.search);
        const view = p.get('view') || 'trang-chu';
        const path = getPathFromView(view);

        // Tìm menu tương ứng để active lại
        const link = document.querySelector(`.nav-link[data-page="${path}"]`);
        
        document.querySelector('.nav-link.active')?.classList.remove('active');
        if (link) {
            link.classList.add('active');
            loadPage(path, link.getAttribute('data-title'));
        } else {
            loadPage(path, 'Hệ thống');
        }
    });

    // ============================================================
    // 0. BIẾN TOÀN CỤC CHO LỊCH
    // ============================================================
    let currentDate = new Date(); // Ngày đang xem
    let studentScheduleData = []; // Dữ liệu lịch học


    // Xử lý nút Đăng xuất
    const logoutBtn = document.querySelector('.logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm('Bạn có chắc muốn đăng xuất?')) {
                localStorage.clear(); 
                
                // --- SỬA DÒNG NÀY ---
                window.location.href = '../login.html'; 
            }
        });
    }

    // ============================================================
    //  MODULE: USER INFO (HIỂN THỊ TÊN & VAI TRÒ)
    // ============================================================
    async function loadUserInfo() {
        // 1. Lấy email từ localStorage
        const email = localStorage.getItem('userEmail');
        
        if (!email) {
            console.log("Chưa đăng nhập.");
            return;
        }

        try {
            // 2. Gọi API lấy thông tin chi tiết (Dùng chung API users/detail)
            const response = await fetch(`http://localhost:8000/api/users/detail?email=${email}`);
            const result = await response.json();

            if (result.success) {
                const user = result.data;
                
                // 3. Cập nhật giao diện Header
                
                // Tên Sinh viên
                const nameEl = document.querySelector('.user-name');
                if (nameEl) nameEl.innerText = user.HoTen; 

                // Vai trò
                const roleEl = document.querySelector('.user-role');
                if (roleEl) roleEl.innerText = "Sinh viên"; // Hoặc user.VaiTro nếu có

                // Avatar (Lấy 2 chữ cái đầu)
                const avatarEl = document.querySelector('.avatar-circle');
                if (avatarEl && user.HoTen) {
                    const nameParts = user.HoTen.trim().split(' ');
                    let initials = '';
                    if (nameParts.length > 1) {
                        // Chữ cái đầu họ + Chữ cái đầu tên
                        initials = nameParts[0][0] + nameParts[nameParts.length - 1][0];
                    } else {
                        initials = nameParts[0].substring(0, 2);
                    }
                    avatarEl.innerText = initials.toUpperCase();
                }
            }
        } catch (err) { 
            console.error("Lỗi tải thông tin user:", err); 
        }
    }

    // ... (Code xử lý click menu giữ nguyên)

    // Hàm tải nội dung HTML
    async function loadPage(url, title) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const html = await res.text();
                contentArea.innerHTML = html; // Chèn HTML vào

                

                // --- XỬ LÝ ACTIVE MENU CHO TRANG CON (Logic Mới) ---
                let pageHeader = title;
                
                // Nếu đang ở trang Bài giảng -> Active menu Khóa học
                if (url.includes('bai-giang.html')) {
                    pageHeader = "Bài giảng";
                    // 1. Xóa class active cũ
                    document.querySelector('.nav-link.active')?.classList.remove('active');
                    
                    // 2. Tìm menu Khóa học và thêm class active
                    const courseMenu = document.querySelector('.nav-link[data-page="pages/khoa-hoc.html"]');
                    if (courseMenu) {
                        courseMenu.classList.add('active');
                    }
                }
                
                // Cập nhật tiêu đề
                if(pageTitle) pageTitle.innerText = title;

                // NẾU LÀ TRANG CHỦ -> GỌI API LẤY SỐ LIỆU
                if (url.includes('trang-chu.html')) {
                    await loadStudentStats();
                }

                if (url.includes('ho-so.html')) {
                    await loadUserProfileData();
                }

                if (url.includes('lich-hoc.html')) {
                await loadStudentSchedule(); // <--- GỌI HÀM NÀY
                setupCalendarControls();     // <--- GẮN SỰ KIỆN NÚT
                }

                if (url.includes('khoa-hoc.html')) {
                    await initStudentCoursesPage(); // <--- GỌI HÀM NÀY 
                }

                if (url.includes('bai-giang.html')) {
                    await initStudentMaterialsPage();
                }
                if (url.includes('dang-ki.html')) {
                    await initRegistrationPage();
                }


            } else {
                contentArea.innerHTML = '<h2>404 - Không tìm thấy trang</h2>';
            }
        } catch (err) {
            console.error(err);
        }
    }

    // ============================================================
    // MODULE: LỊCH HỌC (SCHEDULE)
    // ============================================================

    // 1. Gọi API Lấy Lịch
    async function loadStudentSchedule() {
        const email = localStorage.getItem('userEmail');
        if (!email) return;

        try {
            // Gọi API dành cho sinh viên
            const res = await fetch(`http://localhost:8000/api/schedules/student?email=${email}`);
            const result = await res.json();
            
            if (result.success) {
                studentScheduleData = result.data || [];
                renderCalendar(); // Vẽ lịch sau khi có data
            }
        } catch (err) { console.error("Lỗi lấy lịch:", err); }
    }

    // 2. Hàm Vẽ Lịch (Render Calendar)
    function renderCalendar() {
        const daysContainer = document.getElementById('calendar-days');
        const monthYearText = document.getElementById('current-month-year');
        if (!daysContainer) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0-11

        // Cập nhật tiêu đề
        const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
        monthYearText.innerText = `${monthNames[month]} ${year}`;

        // Tính ngày đầu tháng và số ngày
        const firstDayOfMonth = new Date(year, month, 1).getDay(); 
        // Chuyển đổi: CN(0) -> 6, T2(1) -> 0 ... để bắt đầu từ Thứ 2
        const startDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let html = '';

        // Vẽ ngày tháng trước (Mờ)
        for (let i = startDayIndex; i > 0; i--) {
            html += `<div class="day-cell other-month"><div class="day-number">${daysInPrevMonth - i + 1}</div></div>`;
        }

        // Vẽ ngày tháng này
        for (let i = 1; i <= daysInMonth; i++) {
            // Xác định ngày đang xét
            const currentDayObj = new Date(year, month, i);
            
            // Tìm lịch học cho ngày này
            // Logic: So sánh Thứ + Khoảng thời gian (Tuần bắt đầu - Tuần kết thúc)
            const eventsToday = studentScheduleData.filter(s => {
                // 1. Check Thứ (2-8)
                let dayOfWeek = currentDayObj.getDay() + 1; 
                if(dayOfWeek === 1) dayOfWeek = 8; // CN là 8
                if (s.Thu !== dayOfWeek) return false;

                // 2. Check Tuần học (Ngày này có thuộc tuần học không?)
                const semesterStart = new Date(s.NgayBatDau);
                semesterStart.setHours(0,0,0,0);
                currentDayObj.setHours(0,0,0,0);

                const diffTime = currentDayObj.getTime() - semesterStart.getTime();
                const diffDays = Math.floor(diffTime / (86400000)); // Chia cho số ms trong 1 ngày
                const currentWeek = Math.floor(diffDays / 7) + 1;

                return diffDays >= 0 && currentWeek >= s.TuanBatDau && currentWeek <= s.TuanKetThuc;
            });

            // Tạo HTML cho các sự kiện (Môn học)
            let eventsHtml = '';
            eventsToday.forEach((ev, idx) => {
                // Đổi màu xen kẽ: Xanh - Đỏ
                const colorClass = idx % 2 === 0 ? 'event-blue' : 'event-red';
                const timeStr = `${ev.TietBatDau} - ${ev.TietKetThuc}`;
                
                eventsHtml += `
                    <div class="event-box ${colorClass}" title="${ev.TenMon}">
                        <strong>${ev.MaLopHoc}</strong> - ${ev.TenMon}<br>
                        Phòng: ${ev.PhongHoc} (Tiết ${timeStr})
                    </div>
                `;
            });

            // Đánh dấu "Hôm nay"
            const today = new Date();
            const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const activeClass = isToday ? 'today' : '';

            html += `
                <div class="day-cell ${activeClass}">
                    <div class="day-number">${i}</div>
                    ${eventsHtml}
                </div>
            `;
        }

        daysContainer.innerHTML = html;
    }

    // 3. Xử lý nút Lọc / Qua lại tháng
    function setupCalendarControls() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        const filterBtn = document.querySelector('.btn-filter');
        const monthPicker = document.getElementById('month-picker');

        // Gắn sự kiện (Dùng replaceChild để xóa event cũ nếu gọi lại hàm nhiều lần)
        if(prevBtn) {
            const newPrev = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrev, prevBtn);
            newPrev.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
        }

        if(nextBtn) {
            const newNext = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            newNext.addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
        }

        // Nút Lọc: Bấm vào sẽ mở ô chọn tháng
        if(filterBtn && monthPicker) {
            const newFilter = filterBtn.cloneNode(true);
            filterBtn.parentNode.replaceChild(newFilter, filterBtn);
            
            newFilter.addEventListener('click', () => {
                // Show date picker hoặc trigger click
                monthPicker.showPicker ? monthPicker.showPicker() : monthPicker.click();
            });

            // Khi chọn tháng xong
            const newPicker = monthPicker.cloneNode(true);
            monthPicker.parentNode.replaceChild(newPicker, monthPicker);
            
            newPicker.addEventListener('change', (e) => {
                if(e.target.value) { // value dạng "2025-12"
                    const [y, m] = e.target.value.split('-');
                    currentDate.setFullYear(y);
                    currentDate.setMonth(m - 1);
                    renderCalendar();
                }
            });
        }
    }


    // ============================================================
    // MODULE: HỒ SƠ CÁ NHÂN (PROFILE)
    // ============================================================
    
    async function loadUserProfileData() {
        const email = localStorage.getItem('userEmail');
        if(!email) return;

        try {
            // Gọi API chi tiết người dùng
            const response = await fetch(`http://localhost:8000/api/users/detail?email=${email}`);
            const result = await response.json();

            if(result.success) {
                const u = result.data;
                
                // Điền dữ liệu vào form HTML
                // Lưu ý: Sinh viên dùng MSSV, còn lại giống hệt
                if(document.getElementById('profile-name')) document.getElementById('profile-name').value = u.HoTen;
                if(document.getElementById('profile-id')) document.getElementById('profile-id').value = u.MSSV; // MSSV
                if(document.getElementById('profile-dept')) document.getElementById('profile-dept').value = u.Khoa || u.NienKhoa; 
                if(document.getElementById('profile-email')) document.getElementById('profile-email').value = u.Email;
                
                // Dữ liệu có thể sửa
                if(document.getElementById('profile-phone')) document.getElementById('profile-phone').value = u.SDT || '';
                if(document.getElementById('profile-address')) document.getElementById('profile-address').value = u.DiaChi || '';
            }
        } catch (err) { console.error("Lỗi tải hồ sơ:", err); }
    }

    // XỬ LÝ SỰ KIỆN SUBMIT FORM (CẬP NHẬT HỒ SƠ)
    // Đặt đoạn này ở ngoài cùng, chung với các addEventListener khác
    document.addEventListener('submit', async (e) => {
        if (e.target.id === 'profile-update-form') {
            e.preventDefault();
            
            const email = localStorage.getItem('userEmail');
            const sdt = document.getElementById('profile-phone').value.trim();
            const diaChi = document.getElementById('profile-address').value.trim();

            // Validate số điện thoại (10 số, bắt đầu bằng 0)
            const phoneRegex = /^0\d{9}$/;
            if (sdt && !phoneRegex.test(sdt)) {
                alert("⚠️ Số điện thoại không hợp lệ (phải có 10 số và bắt đầu bằng 0).");
                return;
            }

            try {
                const response = await fetch('http://localhost:8000/api/users/update-profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, sdt, diaChi })
                });

                const result = await response.json();
                if (result.success) {
                    alert('🎉 Cập nhật thông tin thành công!');
                } else {
                    alert('Lỗi: ' + result.message);
                }
            } catch (err) { 
                console.error(err);
                alert('Lỗi kết nối server!'); 
            }
        }
    });

    // --- 2. LOGIC DASHBOARD SINH VIÊN ---
    async function loadStudentStats() {
        const email = localStorage.getItem('userEmail') || ''; // Lấy email an toàn

        try {
            const response = await fetch(`http://localhost:8000/api/dashboard/student-stats?email=${email}`);
            const json = await response.json();

            if (json.success) {
                const d = json.data;
                console.log("Dữ liệu SV nhận được:", d); // Log để kiểm tra

                // Cập nhật giao diện (Dùng getElementById với ID chuẩn)
                // Kiểm tra xem element có tồn tại không trước khi gán để tránh lỗi null
                const elPeriods = document.getElementById('st-stat-periods');
                const elCourses = document.getElementById('st-stat-courses');
                const elClasses = document.getElementById('st-stat-classes');

                if (elPeriods) elPeriods.innerText = d.weeklyPeriods;
                if (elCourses) elCourses.innerText = d.courses;
                if (elClasses) elClasses.innerText = d.totalClasses;

                // Cập nhật biểu đồ
                updateStudentChart(d.weeklySchedule);
            }
        } catch (error) {
            console.error("Lỗi JS Student:", error);
        }
    }


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

    

    function updateStudentChart(data) {
        // data = [soBuoiT2, soBuoiT3, ... soBuoiCN]
        const bars = document.querySelectorAll('.bar');
        const maxVal = 4; // Giả sử tối đa 1 ngày học 4 môn (để tính %)

        bars.forEach((bar, index) => {
            if (index < data.length) {
                const count = data[index];
                // Tính phần trăm chiều cao (Ví dụ: 2 môn / 4 max = 50%)
                let percent = (count / maxVal) * 100;
                if (percent > 100) percent = 100; // Không vượt quá 100%

                // Hiệu ứng mượt
                setTimeout(() => {
                    bar.style.height = `${percent}%`;
                    // Đổi màu nếu có môn học
                    bar.style.backgroundColor = count > 0 ? '#3b82f6' : '#e5e7eb'; 
                }, 100 * index);
            }
        });
    }

    // ============================================================
    // MODULE: KHÓA HỌC & ĐIỂM (STUDENT COURSES)
    // ============================================================
    

    // 1. Hàm khởi tạo trang Khóa học
    async function initStudentCoursesPage() {
        // Tải danh sách học kỳ vào dropdown (Tái sử dụng logic nếu có, hoặc viết mới)
        await loadSemestersForStudent();
        
        const filter = document.getElementById('course-semester-filter');
        if(filter) {
            filter.addEventListener('change', (e) => {
                currentSemesterID = e.target.value;
                loadStudentCoursesData(currentSemesterID);
            });
        }

        // Tìm kiếm
        document.getElementById('course-search-input')?.addEventListener('input', (e) => {
            const k = e.target.value.toLowerCase();
            const filtered = allStudentCourses.filter(c => 
                c.TenMon.toLowerCase().includes(k) || c.MaMon.toLowerCase().includes(k)
            );
            renderStudentCoursesTable(filtered);
        });
    }

    // 2. Tải danh sách học kỳ (Copy logic tìm HK hiện tại từ giảng viên)
    async function loadSemestersForStudent() {
        try {
            const response = await fetch('http://localhost:8000/api/semesters');
            const result = await response.json();
            const filter = document.getElementById('course-semester-filter');
            
            if (result.success && filter) {
                filter.innerHTML = '';
                let selected = "";
                const today = new Date();
                today.setHours(0,0,0,0);

                // Sort mới nhất lên đầu
                const sorted = result.data.sort((a,b) => b.NgayBatDau.localeCompare(a.NgayBatDau));

                sorted.forEach(hk => {
                    const opt = document.createElement('option');
                    opt.value = hk.MaHocKy;
                    opt.text = `${hk.MaHocKy} (${hk.NamHoc})`;
                    filter.appendChild(opt);

                    // Tìm HK hiện tại
                    const start = new Date(hk.NgayBatDau); 
                    const end = new Date(hk.NgayKetThuc);
                    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
                    
                    if(today >= start && today <= end) selected = hk.MaHocKy;
                });

                // Nếu không thuộc HK nào -> Chọn cái mới nhất
                if(!selected && sorted.length > 0) selected = sorted[0].MaHocKy;
                
                filter.value = selected;
                currentSemesterID = selected;
                
                // Gọi load dữ liệu ngay
                loadStudentCoursesData(selected);
            }
        } catch(e) { console.error(e); }
    }

    // 3. Gọi API lấy bảng điểm
    async function loadStudentCoursesData(maHK) {
        const email = localStorage.getItem('userEmail');
        if(!email || !maHK) return;

        try {
            const res = await fetch(`http://localhost:8000/api/classes/student-courses?email=${email}&maHK=${maHK}`);
            const json = await res.json();
            
            if(json.success) {
                allStudentCourses = json.data;
                renderStudentCoursesTable(allStudentCourses);
            }
        } catch(e) { console.error(e); }
    }

    // 4. Vẽ bảng
    function renderStudentCoursesTable(data) {
        const tbody = document.getElementById('student-course-body');
        if(!tbody) return;
        tbody.innerHTML = data.length ? '' : '<tr><td colspan="11" class="text-center">Không có môn học nào trong học kỳ này.</td></tr>';

        const fmt = (val) => val !== null ? val : '-';

        data.forEach((c, i) => {

            // Trong renderStudentCoursesTable:
const urlParams = `?view=bai-giang&maMon=${c.MaMon}&tenMon=${encodeURIComponent(c.TenMon)}&maHK=${currentSemesterID}&maLop=${c.MaLopHoc}`;
            const row = `
                <tr>
                    <td style="text-align: center; color: #666;">${i + 1}</td>
                    <td style="text-align: center; font-weight: 600;">${c.MaLopHoc}</td>
                    <td style="text-align: center;">${c.MaMon}</td>
                    <td style="font-weight: 500;">${c.TenMon}</td>
                    <td style="text-align: center;">${c.SoTinChi}</td>
                    <td>
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:500;">${c.TenGV}</span>
                            <span style="font-size:11px; color:#666;">${c.EmailGV}</span>
                        </div>
                    </td>
                    
                    <td style="text-align: center; font-weight:bold; color:#4F46E5;">${fmt(c.GK)}</td>
                    <td style="text-align: center; font-weight:bold; color:#E9A400;">${fmt(c.CK)}</td>
                    <td style="text-align: center;">${fmt(c.BTL)}</td>
                    <td style="text-align: center;">${fmt(c.Quiz)}</td>
                    <td style="text-align: center;">${fmt(c.TN)}</td>
                    <td style="text-align: center;">
                        <button class="btn-go-detail" onclick="navigateToUrl('${urlParams}')" title="Xem bài giảng">
                            &gt;
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }
});

// ============================================================
    // MODULE: TÀI LIỆU SINH VIÊN (MATERIALS)
    // ============================================================
    
    let currentStudentMaterials = [];

    async function initStudentMaterialsPage() {
        // Lấy tham số từ URL (được truyền từ trang Khóa học)
        const p = new URLSearchParams(window.location.search);
        const maMon = p.get('maMon');
        const maHK = p.get('maHK');
        const tenMon = decodeURIComponent(p.get('tenMon'));
        // Cần lấy thêm Mã Lớp từ API danh sách khóa học hoặc truyền qua URL
        // Ở bước trước, trong hàm renderStudentCoursesTable, 
        // bạn hãy sửa urlParams để truyền thêm &maLop=${c.MaLopHoc} nhé!
        const maLop = p.get('maLop'); 

        if(!maMon || !maHK) return;

        // Hiển thị tiêu đề
        document.getElementById('material-course-title').innerText = `${tenMon} (${maMon}) - ${maLop}`;
        // 2. --- THÊM DÒNG NÀY ĐỂ SỬA TIÊU ĐỀ LỚN ---
        // Cập nhật tiêu đề lớn ở Header (Thay chữ "Hệ thống")
        const pageTitleElement = document.getElementById('page-title');
        if (pageTitleElement) {
            pageTitleElement.innerText = "Bài giảng";
        }

        try {
            const res = await fetch(`http://localhost:8000/api/materials/student?maMon=${maMon}&maHK=${maHK}&maLop=${maLop}`);
            const json = await res.json();

            if(json.success) {
                currentStudentMaterials = json.data;
                renderStudentMaterials(currentStudentMaterials);
                
                // Setup Search
                document.getElementById('std-mat-search')?.addEventListener('input', (e) => {
                    const k = e.target.value.toLowerCase();
                    const filtered = currentStudentMaterials.filter(m => m.TenFile.toLowerCase().includes(k));
                    renderStudentMaterials(filtered);
                });
            }
        } catch(e) { console.error(e); }
    }

    function renderStudentMaterials(data) {
        const tbody = document.getElementById('std-material-body');
        if(!tbody) return;
        tbody.innerHTML = data.length ? '' : '<tr><td colspan="3" class="text-center" style="padding:20px;">Chưa có tài liệu nào.</td></tr>';

        data.forEach(m => {
            const dateStr = new Date(m.NgayTaiLen).toLocaleDateString('vi-VN');
            const downloadLink = `http://localhost:8000/api/materials/download/${m.MaTaiLieu}`;

            const row = `
                <tr>
                    <td>
                        <div class="file-info">
                            <span class="material-symbols-outlined file-icon">description</span>
                            <span class="file-name">${m.TenFile}</span>
                        </div>
                    </td>
                    <td style="text-align: center;">${dateStr}</td>
                    <td style="text-align: center;">
                        <a href="${downloadLink}" class="material-symbols-outlined btn-download" title="Tải về">download</a>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // ============================================================
    // MODULE: ĐĂNG KÝ MÔN HỌC (REGISTRATION)
    // ============================================================
    
    let currentRegSemester = "";
    let allRegClasses = [];

    // 1. Khởi tạo trang
    async function initRegistrationPage() {
        await loadSemestersForRegistration();
        
        const filter = document.getElementById('reg-semester-filter');
        if(filter) {
            filter.addEventListener('change', (e) => {
                currentRegSemester = e.target.value;
                loadRegistrationClasses(currentRegSemester);
            });
        }

        // Tìm kiếm
        document.getElementById('reg-search-input')?.addEventListener('input', (e) => {
            const k = e.target.value.toLowerCase();
            const filtered = allRegClasses.filter(c => 
                c.TenMon.toLowerCase().includes(k) || 
                c.MaLopHoc.toLowerCase().includes(k) ||
                c.MaMon.toLowerCase().includes(k)
            );
            renderRegistrationTable(filtered);
        });
    }

    // 2. Tải danh sách lớp
    async function loadRegistrationClasses(maHK) {
        const email = localStorage.getItem('userEmail');
        if(!email || !maHK) return;

        try {
            // Gọi API Lấy danh sách lớp mở
            const res = await fetch(`http://localhost:8000/api/registration/classes?email=${email}&maHK=${maHK}`);
            const json = await res.json();
            
            if(json.success) {
                allRegClasses = json.data;
                renderRegistrationTable(allRegClasses);
            }
        } catch(e) { console.error(e); }
    }

    // 3. Vẽ bảng
    function renderRegistrationTable(data) {
        const tbody = document.getElementById('registration-table-body');
        if(!tbody) return;
        tbody.innerHTML = data.length ? '' : '<tr><td colspan="9" class="text-center">Chưa có lớp học nào mở.</td></tr>';

        data.forEach((c, i) => {
            const isRegistered = c.TrangThaiDangKy === 'Đã đăng ký';
            
            // Badge trạng thái
            let statusBadge = `<span class="status-badge status-none">Chưa ĐK</span>`;
            if (isRegistered) statusBadge = `<span class="status-badge status-registered">Đã đăng ký</span>`;
            else if (c.TrangThaiDangKy === 'Đã hủy') statusBadge = `<span class="status-badge status-cancelled">Đã hủy</span>`;

            // Nút hành động
            let actionBtn = '';
            if (isRegistered) {
                actionBtn = `<button class="btn-reg-action btn-cancel" onclick="handleRegistration('${c.MaLopHoc}', '${c.MaMon}', 'CANCEL')">Hủy ĐK</button>`;
            } else {
                actionBtn = `<button class="btn-reg-action btn-register" onclick="handleRegistration('${c.MaLopHoc}', '${c.MaMon}', 'REGISTER')">Đăng ký</button>`;
            }

            const row = `
                <tr>
                    <td style="text-align: center; color: #666;">${i + 1}</td>
                    <td style="text-align: center; font-weight: bold;">${c.MaLopHoc}</td>
                    <td style="text-align: center;">${c.MaMon}</td>
                    <td style="font-weight: 500;">${c.TenMon}</td>
                    <td style="text-align: center;">${c.SoTinChi}</td>
                    <td>${c.TenGV || 'Chưa phân công'}</td>
                    <td style="text-align: center;">${c.SiSoHienTai || 0} / ${c.SiSoToiDa}</td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">${actionBtn}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // 4. Xử lý sự kiện bấm nút
    window.handleRegistration = async function(maLop, maMon, action) {
        const email = localStorage.getItem('userEmail');
        const confirmMsg = action === 'REGISTER' ? `Đăng ký lớp ${maLop}?` : `Hủy lớp ${maLop}?`;
        
        if(!confirm(confirmMsg)) return;

        try {
            const res = await fetch('http://localhost:8000/api/registration/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, maLop, maMon, maHK: currentRegSemester, action })
            });
            const json = await res.json();

            if(json.success) {
                alert(json.message);
                loadRegistrationClasses(currentRegSemester); // Tải lại bảng để cập nhật trạng thái
            } else {
                alert('Lỗi: ' + json.message);
            }
        } catch(e) { alert('Lỗi kết nối!'); }
    }

    // Helper: Tải học kỳ (Copy logic từ hàm cũ hoặc dùng chung)
    async function loadSemestersForRegistration() {
        // ... (Logic giống hệt loadSemestersForStudent, chỉ đổi ID element thành 'reg-semester-filter') ...
        // Bạn có thể copy code từ hàm loadSemestersForStudent xuống đây và thay ID
        // Hoặc viết 1 hàm chung loadSemesters(selectId, callback) để tái sử dụng.
        // Ở đây tôi viết gọn:
        try {
            const res = await fetch('http://localhost:8000/api/semesters');
            const result = await res.json();
            const filter = document.getElementById('reg-semester-filter');
            if(result.success && filter) {
                filter.innerHTML = '';

                const sorted = result.data.sort((a,b) => b.NgayBatDau.localeCompare(a.NgayBatDau));

                let selectedSemester = "";
                const today = new Date();
                today.setHours(0,0,0,0); // Reset giờ để so sánh ngày chuẩn


                sorted.forEach(hk => {
                    const opt = document.createElement('option');
                    opt.value = hk.MaHocKy;
                    opt.text = `${hk.MaHocKy} (${hk.NamHoc})`;
                    filter.appendChild(opt);

                    // --- LOGIC TÌM HỌC KỲ HIỆN TẠI ---
                    const start = new Date(hk.NgayBatDau);
                    const end = new Date(hk.NgayKetThuc);
                    // Mở rộng thời gian cuối ngày để chắc chắn
                    end.setHours(23, 59, 59, 999);

                    if (today >= start && today <= end) {
                        selectedSemester = hk.MaHocKy;
                    }
                });
                // --- XỬ LÝ CHỌN MẶC ĐỊNH ---
                // Nếu không tìm thấy HK nào khớp (ví dụ đang nghỉ hè), chọn cái mới nhất
                if (!selectedSemester && sorted.length > 0) {
                    selectedSemester = sorted[0].MaHocKy;
                }

                // Gán giá trị và tải dữ liệu ngay lập tức
                if (selectedSemester) {
                    filter.value = selectedSemester;
                    currentRegSemester = selectedSemester;
                    console.log("-> Đã chọn học kỳ:", selectedSemester);
                    
                    // Gọi hàm tải danh sách lớp ngay khi vừa vào trang
                    loadRegistrationClasses(currentRegSemester);
                }
            }
        } catch(e) { 
            console.error("Lỗi tải học kỳ đăng ký:", e);
        }
    }

// --- THÊM HÀM NÀY VÀO CUỐI FILE (HOẶC CHỖ HELPERS) ---
    // Hàm hỗ trợ chuyển trang từ nút bấm trong bảng
    window.navigateToUrl = function(urlParams) {
        const newUrl = window.location.pathname + urlParams;
        window.history.pushState({}, '', newUrl);
        
        // Kích hoạt sự kiện popstate để router tự tải trang mới
        const event = new PopStateEvent('popstate');
        window.dispatchEvent(event);
    }