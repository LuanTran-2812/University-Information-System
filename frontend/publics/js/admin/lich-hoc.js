let currentSemesterIdForSchedule = "";
let classListForSchedule = []; 
let isScheduleEditMode = false; 
let currentScheduleOldData = null; // Lưu thông tin cũ để đối chiếu khi sửa

async function initSchedulePage() {
    // Phải dùng hàm loadSemestersToFilter của Lớp học (vì nó có sẵn trong file gốc)
    // Tạm thời định nghĩa lại ở đây
    async function loadSemestersToFilter() {
        try {
            const response = await fetch('http://localhost:8000/api/semesters');
            const result = await response.json();
            const filter = document.getElementById('semester-filter');
            
            if (result.success && filter) {
                filter.innerHTML = ''; 
                if (result.data.length > 0) {
                    currentSemesterIdForSchedule = result.data[0].MaHocKy;
                    // fetchAndInitScheduleTable(currentSemesterIdForSchedule); // Sẽ gọi ở dưới
                }
                result.data.forEach(hk => {
                    const option = document.createElement('option');
                    option.value = hk.MaHocKy;
                    option.text = `${hk.MaHocKy} (${hk.NamHoc})`;
                    filter.appendChild(option);
                });
                filter.value = currentSemesterIdForSchedule;
            }
        } catch (err) { console.error(err); }
    }
    
    await loadSemestersToFilter(); 
    
    const filter = document.getElementById('semester-filter');
    if(filter) {
        // Reset event listener bằng cách clone
        const newFilter = filter.cloneNode(true);
        filter.parentNode.replaceChild(newFilter, filter);
        
        newFilter.addEventListener('change', (e) => {
            currentSemesterIdForSchedule = e.target.value;
            fetchAndInitScheduleTable(currentSemesterIdForSchedule);
        });
        
        if(newFilter.options.length > 0) {
            currentSemesterIdForSchedule = newFilter.value;
            fetchAndInitScheduleTable(currentSemesterIdForSchedule);
        }
    }

    setupAddScheduleButton();
    setupAddScheduleForm();
    initWeekOptions();
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

async function fetchAndInitScheduleTable(maHK) {
    if (!maHK) return;
    try {
        const response = await fetch(`http://localhost:8000/api/schedules?maHK=${maHK}`);
        const result = await response.json();
        
        const tbody = document.getElementById('schedule-table-body');
        tbody.innerHTML = '';
        
        if (result.success) {
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">Chưa có lịch học.</td></tr>';
                return;
            }

            result.data.forEach(s => {
                // Chuẩn bị dữ liệu cho nút Sửa
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
        }
    } catch (err) { console.error(err); }
}

function attachScheduleActionEvents() {
    // 1. Sự kiện Sửa
    document.querySelectorAll('.edit-schedule-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Lấy data từ nút
            const button = e.currentTarget; // Đảm bảo lấy đúng thẻ button
            const data = JSON.parse(button.dataset.info);
            await openScheduleEditModal(data);
        });
    });

    // 2. Sự kiện Xóa
    document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const d = e.currentTarget.dataset;
            if(confirm(`Xóa lịch học lớp ${d.lop} thứ ${d.thu}?`)) {
                const query = `maLop=${d.lop}&maHK=${d.hk}&maMon=${d.mon}&thu=${d.thu}&tiet=${d.tiet}&phong=${d.phong}`;
                await fetch(`http://localhost:8000/api/schedules/delete?${query}`, { method: 'DELETE' });
                fetchAndInitScheduleTable(currentSemesterIdForSchedule);
            }
        });
    });
}

// === LOGIC MODAL SỬA/THÊM ===

function setupAddScheduleButton() {
    const btn = document.querySelector('.btn-add-schedule');
    if(btn) {
        btn.addEventListener('click', async () => {
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
    // 1. Chọn đúng lớp trong dropdown (Value là "MaLop|MaMon")
    const selectVal = `${data.MaLopHoc}|${data.MaMon}`;
    document.getElementById('scheduleClassSelect').value = selectVal;
    document.getElementById('scheduleClassSelect').disabled = true; // Không cho sửa lớp

    // 2. Điền tên môn, GV (Giả lập sự kiện change)
    document.getElementById('scheduleMonName').value = data.TenMon;
    document.getElementById('scheduleGVName').value = data.TenGiangVien;

    // 3. Điền các thông tin khác
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

        // Sự kiện chọn lớp -> Tự điền tên
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
        
        // Lấy giá trị từ các ô input
        const valPhong = document.getElementById('schedulePhong').value;
        const valThu = document.getElementById('scheduleThu').value;
        const valTiet = document.getElementById('scheduleTiet').value;
        const valTuanBD = document.getElementById('scheduleTuanBD').value;
        const valTuanKT = document.getElementById('scheduleTuanKT').value;

        // Tạo payload "bao sân" (Chứa cả tên biến cho API Thêm và API Sửa)
        const payload = {
            maLop: maLop,
            maMon: maMon,
            maHK: currentSemesterIdForSchedule,
            
            // 1. Dữ liệu cho API THÊM (Create)
            phong: valPhong,
            thu: valThu,
            tiet: valTiet,
            tuanBD: valTuanBD,
            tuanKT: valTuanKT,

            // 2. Dữ liệu cho API SỬA (Update - có chữ new)
            newPhong: valPhong,
            newThu: valThu,
            newTiet: valTiet,
            newTuanBD: valTuanBD,
            newTuanKT: valTuanKT,
            
            // 3. Dữ liệu cũ (Chỉ dùng khi Sửa)
            oldPhong: isScheduleEditMode ? currentScheduleOldData.PhongHoc : null,
            oldThu: isScheduleEditMode ? currentScheduleOldData.Thu : null,
            oldTiet: isScheduleEditMode ? currentScheduleOldData.Tiet : null
        };

        // Chọn API
        let url = 'http://localhost:8000/api/schedules/create';
        let method = 'POST';
        if (isScheduleEditMode) {
            // Endpoint /update/ (không có params) theo logic gốc
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

// Export (thêm getter để phản ánh trạng thái động giống file gốc)
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'currentSemesterIdForSchedule', { get: () => currentSemesterIdForSchedule });
    Object.defineProperty(window, 'isScheduleEditMode', { get: () => isScheduleEditMode });
    Object.defineProperty(window, 'currentScheduleOldData', { get: () => currentScheduleOldData });
    window.classListForSchedule = classListForSchedule; // mảng tham chiếu
    window.initSchedulePage = initSchedulePage;
    window.fetchAndInitScheduleTable = fetchAndInitScheduleTable;
    window.openScheduleEditModal = openScheduleEditModal;
    window.setupAddScheduleButton = setupAddScheduleButton;
    window.setupAddScheduleForm = setupAddScheduleForm;
    window.loadClassesForScheduleModal = loadClassesForScheduleModal;
    window.closeScheduleModal = window.closeScheduleModal;
}