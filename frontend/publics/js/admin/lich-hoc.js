let allSchedulesData = [];
let currentSchedulePage = 1;

let currentSemesterIdForSchedule = "";
let currentSemesterStatusForSchedule = ""; // <-- BIẾN MỚI LƯU TRẠNG THÁI
let classListForSchedule = []; 
let isScheduleEditMode = false; 
let currentScheduleOldData = null; // Lưu thông tin cũ để đối chiếu khi sửa

// --- 1. HÀM KHỞI TẠO ---
async function initSchedulePage() {
    // A. Reset dữ liệu và hiển thị thông báo
    allSchedulesData = [];
    currentSemesterIdForSchedule = "";
    currentSemesterStatusForSchedule = ""; // <-- Reset biến trạng thái
    
    const tbody = document.getElementById('schedule-table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Vui lòng chọn Học kỳ trên thanh công cụ để xem lịch học.</td></tr>';
        const paginationEl = document.querySelector('.pagination');
        if (paginationEl) paginationEl.innerHTML = '';
    }

    // B. Gọi hàm tải Custom Dropdown (Đã đồng bộ với lop-hoc.js)
    await loadSemestersToCustomFilterForSchedule();

    // C. Setup các chức năng khác
    setupAddScheduleButton();
    setupAddScheduleForm();
    initWeekOptions();
}

// --- 2. LOGIC CUSTOM DROPDOWN (ĐÃ ĐỒNG BỘ) ---
async function loadSemestersToCustomFilterForSchedule() {
    try {
        const response = await fetch('http://localhost:8000/api/semesters');
        const result = await response.json();

        const wrapper = document.getElementById('semester-custom-wrapper');
        const trigger = document.getElementById('semester-trigger');
        const optionsContainer = document.getElementById('semester-options-container');
        const textDisplay = document.getElementById('selected-semester-text');
        const hiddenInput = document.getElementById('semester-filter-value');

        if (result.success && optionsContainer) {
            optionsContainer.innerHTML = '';

            // A. Xử lý đóng/mở menu (Clone để xóa sự kiện cũ)
            const newTrigger = trigger.cloneNode(true);
            trigger.parentNode.replaceChild(newTrigger, trigger);
            
            // Lấy lại trigger mới sau khi clone để gắn sự kiện
            const currentTrigger = document.getElementById('semester-trigger');
            const currentTextDisplay = document.getElementById('selected-semester-text');

            currentTrigger.addEventListener('click', function(e) {
                wrapper.classList.toggle('open'); 
                e.stopPropagation();
            });

            // Đóng menu khi click ra ngoài
            window.addEventListener('click', function(e) {
                if (wrapper && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });

            // B. Tạo danh sách Option từ API
            result.data.forEach(hk => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-option'; 
                optionDiv.dataset.value = hk.MaHocKy;
                optionDiv.dataset.status = hk.TrangThai; // <-- LƯU TRẠNG THÁI
                optionDiv.textContent = `${hk.MaHocKy} (${hk.NamHoc})`;

                // === SỰ KIỆN KHI CHỌN MỘT HỌC KỲ ===
                optionDiv.addEventListener('click', function() {
                    // 1. Cập nhật giao diện
                    currentTextDisplay.textContent = this.textContent; 
                    
                    currentTrigger.classList.add('selected');

                    wrapper.classList.remove('open');
                    
                    document.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');

                    // 2. Logic dữ liệu (Riêng cho Lịch học)
                    currentSemesterIdForSchedule = this.dataset.value;
                    currentSemesterStatusForSchedule = this.dataset.status; // <-- CẬP NHẬT TRẠNG THÁI
                    if (hiddenInput) hiddenInput.value = currentSemesterIdForSchedule;

                    fetchAndInitScheduleTable(currentSemesterIdForSchedule);
                });

                optionsContainer.appendChild(optionDiv);
            });
        }
    } catch (err) { console.error("Lỗi tải học kỳ:", err); }
}

function initWeekOptions() {
    const selBD = document.getElementById('scheduleTuanBD');
    const selKT = document.getElementById('scheduleTuanKT');
    if(!selBD) return;
    selBD.innerHTML = ''; selKT.innerHTML = '';
    for(let i=1; i<=20; i++) {
        selBD.innerHTML += `<option value="${i}">${i}</option>`;
        selKT.innerHTML += `<option value="${i}">${i}</option>`;
    }
    selKT.value = 15;
}

// 3. TẢI DỮ LIỆU BẢNG
async function fetchAndInitScheduleTable(maHK) {
    if (!maHK) return;
    try {
        const response = await fetch(`http://localhost:8000/api/schedules?maHK=${maHK}`);
        const result = await response.json();
        
        if (result.success) {
            allSchedulesData = result.data;
            currentSchedulePage = 1;
            renderScheduleTable(currentSchedulePage);
        }
    } catch (err) { console.error(err); }
}

// 4. VẼ BẢNG (PHÂN TRANG)
function renderScheduleTable(page) {
    const ROWS_PER_PAGE = 7; 
    const tbody = document.getElementById('schedule-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Xử lý không có dữ liệu
    if (allSchedulesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">Chưa có lịch học trong học kỳ này.</td></tr>';
        const paginationEl = document.querySelector('.pagination');
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    // Tính toán cắt trang
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = allSchedulesData.slice(start, end);

    // Tự động lùi trang nếu trang hiện tại rỗng
    if (pageData.length === 0 && page > 1) {
        currentSchedulePage = page - 1;
        renderScheduleTable(currentSchedulePage);
        return;
    }

    pageData.forEach(s => {
        const dataString = JSON.stringify(s).replace(/"/g, '&quot;');

        const row = `
            <tr>
                <td style="text-align: center;"><input type="checkbox"></td>
                <td style="font-weight:600; text-align:center;">${s.MaLopHoc}</td>
                <td>${s.TenMon}</td>
                <td>${s.TenGiangVien || '-'}</td>
                <td style="text-align:center; font-weight:bold; color:#2563eb;">${s.PhongHoc}</td>
                <td style="text-align:center;">${s.Thu}</td>
                <td style="text-align:center;">${s.Tiet}</td>
                <td style="text-align:center;">${s.TuanBatDau} - ${s.TuanKetThuc}</td>
                <td style="text-align: center;">
                    <button class="action-btn edit-schedule-btn" data-info="${dataString}" 
                        style="border:none; background:none; cursor:pointer; margin-right:8px;">
                        <span class="material-symbols-outlined" style="color:#3b82f6">edit</span>
                    </button>
                    <button class="action-btn delete-schedule-btn" 
                        data-lop="${s.MaLopHoc}" data-hk="${s.MaHocKy}" data-mon="${s.MaMon}" 
                        data-thu="${s.Thu}" data-tiet="${s.Tiet}" data-phong="${s.PhongHoc}"
                        style="border:none; background:none; cursor:pointer;">
                        <span class="material-symbols-outlined" style="color:#ef4444">delete</span>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    attachScheduleActionEvents();
    
    if (typeof renderPagination === 'function') {
        renderPagination(allSchedulesData.length, ROWS_PER_PAGE, page, (newPage) => {
            currentSchedulePage = newPage;
            renderScheduleTable(newPage);
        });
    }
}

function attachScheduleActionEvents() {
    // 1. Sự kiện Sửa
    document.querySelectorAll('.edit-schedule-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // === KIỂM TRA TRẠNG THÁI (Sửa) ===
            if (currentSemesterStatusForSchedule === "Đã đóng") { // Điều chỉnh chuỗi trạng thái phù hợp
                alert("Học kỳ đã đóng. Không thể cập nhật lịch học.");
                return;
            }
            // =================================
            const button = e.currentTarget; 
            const data = JSON.parse(button.dataset.info);
            await openScheduleEditModal(data);
        });
    });

    // 2. Sự kiện Xóa
    document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // === KIỂM TRA TRẠNG THÁI (Xóa) ===
            if (currentSemesterStatusForSchedule === "Đã đóng") { // Điều chỉnh chuỗi trạng thái phù hợp
                alert("Học kỳ đã đóng. Không thể xóa lịch học.");
                return;
            }
            // =================================
            
            const d = e.currentTarget.dataset;
            if(confirm(`Xóa lịch học lớp ${d.lop} thứ ${d.thu}?`)) {
                const query = `maLop=${d.lop}&maHK=${d.hk}&maMon=${d.mon}&thu=${d.thu}&tiet=${d.tiet}&phong=${d.phong}`;
                try {
                    await fetch(`http://localhost:8000/api/schedules/delete?${query}`, { method: 'DELETE' });
                    fetchAndInitScheduleTable(currentSemesterIdForSchedule);
                } catch(err) { alert('Lỗi kết nối!'); }
            }
        });
    });
}

// === LOGIC MODAL SỬA/THÊM (GIỮ NGUYÊN) ===

function setupAddScheduleButton() {
    const btn = document.querySelector('.btn-add-schedule');
    if(btn) {
        btn.addEventListener('click', async () => {
            
            // 1. Kiểm tra đã chọn HK chưa (Logic cũ)
            if (!currentSemesterIdForSchedule) {
                alert("Vui lòng chọn học kỳ trước khi thêm lịch!");
                return;
            }
            
            // 2. KIỂM TRA TRẠNG THÁI (Thêm)
            if (currentSemesterStatusForSchedule === "Đã đóng") { // Điều chỉnh chuỗi trạng thái phù hợp
                alert("Học kỳ đã đóng. Không thể thêm mới lịch học.");
                return;
            }
            // =================================
            
            isScheduleEditMode = false; // Chế độ Thêm
            document.getElementById('modal-add-schedule-form').reset();
            document.getElementById('scheduleGVName').value = '';
            document.getElementById('scheduleMonName').value = '';
            
            // Mở khóa chọn Lớp
            document.getElementById('scheduleClassSelect').disabled = false;
            document.querySelector('#schedule-modal h3').innerText = 'Thêm lịch học';
            
            await loadClassesForScheduleModal();
            document.getElementById('schedule-modal').classList.add('active');
        });
    }
}

async function openScheduleEditModal(data) {
    isScheduleEditMode = true; // Chế độ Sửa
    currentScheduleOldData = data; // Lưu thông tin cũ

    await loadClassesForScheduleModal();

    // Điền dữ liệu cũ
    const selectVal = `${data.MaLopHoc}|${data.MaMon}`;
    document.getElementById('scheduleClassSelect').value = selectVal;
    document.getElementById('scheduleClassSelect').disabled = true; // Không cho sửa lớp

    // Điền tên môn, GV
    document.getElementById('scheduleMonName').value = data.TenMon;
    document.getElementById('scheduleGVName').value = data.TenGiangVien;

    // Điền các thông tin khác
    document.getElementById('schedulePhong').value = data.PhongHoc;
    document.getElementById('scheduleThu').value = data.Thu;
    document.getElementById('scheduleTiet').value = data.Tiet;
    document.getElementById('scheduleTuanBD').value = data.TuanBatDau;
    document.getElementById('scheduleTuanKT').value = data.TuanKetThuc;

    document.querySelector('#schedule-modal h3').innerText = 'Cập nhật lịch học';
    document.getElementById('schedule-modal').classList.add('active');
}

async function loadClassesForScheduleModal() {
    const select = document.getElementById('scheduleClassSelect');
    select.innerHTML = '<option>Đang tải...</option>';
    
    const response = await fetch(`http://localhost:8000/api/classes?maHK=${currentSemesterIdForSchedule}`);
    const result = await response.json();
    
    if(result.success) {
        classListForSchedule = result.data; 
        select.innerHTML = '<option value="">-- Chọn Lớp --</option>';
        result.data.forEach(cls => {
            const val = `${cls.MaLopHoc}|${cls.MaMonHoc}`; 
            select.innerHTML += `<option value="${val}">${cls.MaLopHoc} - ${cls.TenMon}</option>`;
        });

        select.addEventListener('change', (e) => {
            const [maLop, maMon] = e.target.value.split('|');
            const selectedClass = classListForSchedule.find(c => c.MaLopHoc === maLop && c.MaMonHoc === maMon);
            if(selectedClass) {
                document.getElementById('scheduleMonName').value = selectedClass.TenMon;
                document.getElementById('scheduleGVName').value = selectedClass.TenGiangVien || 'Chưa phân công';
            }
        });
    }
}

function setupAddScheduleForm() {
    const form = document.getElementById('modal-add-schedule-form');
    if(!form) return;
    
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const [maLop, maMon] = document.getElementById('scheduleClassSelect').value.split('|');
        
        const valPhong = document.getElementById('schedulePhong').value;
        const valThu = document.getElementById('scheduleThu').value;
        const valTiet = document.getElementById('scheduleTiet').value;
        const valTuanBD = document.getElementById('scheduleTuanBD').value;
        const valTuanKT = document.getElementById('scheduleTuanKT').value;

        const payload = {
            maLop: maLop,
            maMon: maMon,
            maHK: currentSemesterIdForSchedule,
            
            phong: valPhong,
            thu: valThu,
            tiet: valTiet,
            tuanBD: valTuanBD,
            tuanKT: valTuanKT,

            newPhong: valPhong,
            newThu: valThu,
            newTiet: valTiet,
            newTuanBD: valTuanBD,
            newTuanKT: valTuanKT,
            
            oldPhong: isScheduleEditMode ? currentScheduleOldData.PhongHoc : null,
            oldThu: isScheduleEditMode ? currentScheduleOldData.Thu : null,
            oldTiet: isScheduleEditMode ? currentScheduleOldData.Tiet : null
        };

        let url = 'http://localhost:8000/api/schedules/create';
        let method = 'POST';
        if (isScheduleEditMode) {
            url = 'http://localhost:8000/api/schedules/update';
            method = 'PUT';
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if(result.success) {
                alert(isScheduleEditMode ? 'Cập nhật thành công!' : 'Thêm lịch thành công!');
                window.closeScheduleModal();
                fetchAndInitScheduleTable(currentSemesterIdForSchedule);
            } else {
                alert('Lỗi: ' + result.message);
            }
        } catch (err) { alert('Lỗi kết nối!'); }
    });
}

window.closeScheduleModal = function() { document.getElementById('schedule-modal').classList.remove('active'); }

// Export
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'currentSemesterIdForSchedule', { get: () => currentSemesterIdForSchedule });
    Object.defineProperty(window, 'currentSemesterStatusForSchedule', { get: () => currentSemesterStatusForSchedule }); // <-- EXPORT MỚI
    Object.defineProperty(window, 'isScheduleEditMode', { get: () => isScheduleEditMode });
    Object.defineProperty(window, 'currentScheduleOldData', { get: () => currentScheduleOldData });
    
    window.allSchedulesData = allSchedulesData; 
    Object.defineProperty(window, 'currentSchedulePage', { get: () => currentSchedulePage });
    
    window.classListForSchedule = classListForSchedule;
    window.initSchedulePage = initSchedulePage;
    window.fetchAndInitScheduleTable = fetchAndInitScheduleTable;
    window.renderScheduleTable = renderScheduleTable; 
    window.openScheduleEditModal = openScheduleEditModal;
    window.setupAddScheduleButton = setupAddScheduleButton;
    window.setupAddScheduleForm = setupAddScheduleForm;
    window.loadClassesForScheduleModal = loadClassesForScheduleModal;
    window.closeScheduleModal = window.closeScheduleModal;
}