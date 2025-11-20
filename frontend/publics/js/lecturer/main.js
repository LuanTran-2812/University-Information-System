document.addEventListener("DOMContentLoaded", () => {
    const contentArea = document.querySelector(".content-area");
    const pageTitle = document.getElementById("page-title");

    // Load trang mặc định
    loadPage('pages/trang-chu.html', 'Trang chủ');

    // Xử lý menu
    document.querySelectorAll('.main-nav .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.nav-link.active').classList.remove('active');
            link.classList.add('active');
            loadPage(link.dataset.page, link.dataset.title);
        });
    });

    
    let currentDate = new Date(); // Ngày hiện tại đang xem
    let lecturerScheduleData = []; // Dữ liệu lịch từ API

    async function loadPage(url, title) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                contentArea.innerHTML = await res.text();
                pageTitle.innerText = title;
                
                // === LOGIC RIÊNG CHO TRANG CHỦ ===
                if (url.includes('trang-chu.html')) {
                    await loadLecturerStats();
                }
            }
        } catch (err) { console.error(err); }

        if (url.includes('lich-hoc.html')) {
            await loadLecturerSchedule(); // Lấy dữ liệu trước
            renderCalendar();             // Sau đó vẽ lịch
            setupCalendarControls();      // Gắn sự kiện nút < >
        }
    }

   // === HÀM GỌI API THỐNG KÊ THẬT ( BIỂU ĐỒ) ===
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

    // === LOGIC LỊCH HỌC ===
    
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

                // Điều kiện 2: Phải nằm trong thời gian Học kỳ (QUAN TRỌNG!)
                const semesterStart = new Date(s.NgayBatDau);
                
                // Tính khoảng cách thời gian (ms) từ đầu kỳ đến ngày hiện tại
                const diffTime = currentDayObj - semesterStart;
                
                // Đổi ra số tuần (1 tuần = 1000 * 60 * 60 * 24 * 7 ms)
                // Cộng 1 vì tuần bắt đầu tính là tuần 1
                const currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;

                // Kiểm tra: Ngày này có nằm trong khoảng tuần học không?
                // Ví dụ: Tuần hiện tại là 20, mà lớp chỉ học tuần 1-15 -> Loại
                return currentWeek >= s.TuanBatDau && currentWeek <= s.TuanKetThuc;
            });
            
            // 4. Vẽ sự kiện 
            let eventsHtml = '';
            eventsToday.forEach((ev, idx) => {
                const colorClass = idx % 2 === 0 ? 'event-blue' : 'event-red';
                eventsHtml += `
                    <div class="event-box ${colorClass}">
                        <strong>${ev.MaLopHoc}</strong> - ${ev.TenMon}<br>
                        Phòng: ${ev.PhongHoc} (Tiết ${ev.Tiet})
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

    // Logout
    document.querySelector('.logout-btn').addEventListener('click', (e) => {
        e.preventDefault(); 
        
        localStorage.clear(); 
        
        
        window.location.href = '../login.html'; 
    });
});