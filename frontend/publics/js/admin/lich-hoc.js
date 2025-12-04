// --- KHAI BÁO BIẾN TOÀN CỤC ---
let allSchedulesData = [];
let currentSchedulePage = 1;
let currentSemesterIdForSchedule = "";
let currentSemesterStatusForSchedule = "";
let classListForSchedule = []; 
let isScheduleEditMode = false; 
let currentScheduleOldData = null;

// Set lưu trữ ID các dòng được chọn (Composite Key)
const selectedScheduleIds = new Set(); 

// --- 1. HÀM KHỞI TẠO CHÍNH ---
async function initSchedulePage() {
    // Reset dữ liệu khi vào trang
    allSchedulesData = [];
    currentSemesterIdForSchedule = "";
    currentSemesterStatusForSchedule = "";
    
    const tbody = document.getElementById('schedule-table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Vui lòng chọn Học kỳ trên thanh công cụ để xem lịch học.</td></tr>';
        const paginationEl = document.querySelector('.pagination');
        if (paginationEl) paginationEl.innerHTML = '';
    }

    await loadSemestersToCustomFilterForSchedule();
    
    // Setup các nút và form
    setupAddScheduleButton();
    setupBatchDeleteButton();
    setupAddScheduleForm();
    initWeekOptions();
}

// --- 2. LOGIC DROPDOWN HỌC KỲ ---
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
            // Clone để reset event listener cũ
            const newTrigger = trigger.cloneNode(true);
            trigger.parentNode.replaceChild(newTrigger, trigger);
            
            const currentTrigger = document.getElementById('semester-trigger');
            const currentTextDisplay = document.getElementById('selected-semester-text');

            currentTrigger.addEventListener('click', function(e) {
                wrapper.classList.toggle('open'); 
                e.stopPropagation();
            });

            window.addEventListener('click', function(e) {
                if (wrapper && !wrapper.contains(e.target)) wrapper.classList.remove('open');
            });

            result.data.forEach(hk => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-option'; 
                optionDiv.dataset.value = hk.MaHocKy;
                optionDiv.dataset.status = hk.TrangThai;
                optionDiv.textContent = `${hk.MaHocKy} (${hk.NamHoc})`;

                optionDiv.addEventListener('click', function() {
                    currentTextDisplay.textContent = this.textContent; 
                    currentTrigger.classList.add('selected');
                    wrapper.classList.remove('open');
                    document.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');

                    currentSemesterIdForSchedule = this.dataset.value;
                    currentSemesterStatusForSchedule = this.dataset.status;
                    if (hiddenInput) hiddenInput.value = currentSemesterIdForSchedule;

                    // Reset checkbox và load dữ liệu mới
                    selectedScheduleIds.clear(); 
                    updateDeleteButtonState();
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

// --- 3. TẢI DỮ LIỆU LỊCH HỌC ---
async function fetchAndInitScheduleTable(maHK) {
    if (!maHK) return;
    try {
        const response = await fetch(`http://localhost:8000/api/schedules?maHK=${maHK}`);
        const result = await response.json();
        if (result.success) {
            allSchedulesData = result.data;
            currentSchedulePage = 1;
            selectedScheduleIds.clear(); // Reset selection khi reload data
            renderScheduleTable(currentSchedulePage);
        }
    } catch (err) { console.error(err); }
}

// --- 4. RENDER BẢNG ---
function renderScheduleTable(page) {
    const ROWS_PER_PAGE = 7; 
    const tbody = document.getElementById('schedule-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Cập nhật trạng thái nút xóa ngay khi render
    updateDeleteButtonState();

    if (allSchedulesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">Chưa có lịch học trong học kỳ này.</td></tr>';
        return;
    }

    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = allSchedulesData.slice(start, end);

    if (pageData.length === 0 && page > 1) {
        currentSchedulePage = page - 1;
        renderScheduleTable(currentSchedulePage);
        return;
    }

    pageData.forEach(s => {
        const dataString = JSON.stringify(s).replace(/"/g, '&quot;');

        // Tạo ID duy nhất từ nhiều trường (Composite Key)
        const uniqueId = `${s.MaLopHoc}|${s.MaHocKy}|${s.MaMon}|${s.Thu}|${s.Tiet}|${s.PhongHoc}`;
        const isChecked = selectedScheduleIds.has(uniqueId) ? 'checked' : '';

        const row = `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="schedule-checkbox" value="${uniqueId}" ${isChecked}>
                </td>
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

                    <button class="action-btn delete-schedule-btn" data-id="${uniqueId}" 
                        style="border:none; background:none; cursor:pointer;">
                        <span class="material-symbols-outlined" style="color:#ef4444">delete</span>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    attachScheduleActionEvents();
    setupScheduleCheckboxes();
    updateDeleteButtonState();

    if (typeof renderPagination === 'function') {
        renderPagination(allSchedulesData.length, ROWS_PER_PAGE, page, (newPage) => {
            currentSchedulePage = newPage;
            renderScheduleTable(newPage);
        });
    }
}

// --- 5. QUẢN LÝ CHECKBOX & XÓA BATCH ---
function updateSelectedScheduleIds(id, isChecked) {
    if (isChecked) selectedScheduleIds.add(id);
    else selectedScheduleIds.delete(id);
}

function setupScheduleCheckboxes() {
    const selectAll = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.schedule-checkbox');

    if (!selectAll) return;

    const allOnPageChecked = Array.from(checkboxes).length > 0 && Array.from(checkboxes).every(c => c.checked);
    selectAll.checked = allOnPageChecked;

    selectAll.onchange = function () {
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
            updateSelectedScheduleIds(cb.value, cb.checked);
        });
        updateDeleteButtonState();
    };

    checkboxes.forEach(cb => {
        cb.onchange = function () {
            updateSelectedScheduleIds(this.value, this.checked);
            if (!this.checked) selectAll.checked = false;
            else {
                const allCheckedOnPage = Array.from(checkboxes).every(c => c.checked);
                if (allCheckedOnPage) selectAll.checked = true;
            }
            updateDeleteButtonState();
        };
    });
}

function updateDeleteButtonState() {
    const deleteBtn = document.querySelector('.btn-icon-delete-schedule'); 
    if (deleteBtn) {
        if (selectedScheduleIds.size > 0) {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
        } else {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.5';
        }
    }
}

async function handleMultipleDeleteSchedule(e) {
    e.preventDefault();

    if (currentSemesterStatusForSchedule === "Đã đóng") {
        alert("Học kỳ đã đóng. Không thể xóa lịch học.");
        return;
    }

    const selectedIds = Array.from(selectedScheduleIds);
    if (selectedIds.length === 0) {
        alert('Vui lòng chọn ít nhất một lịch học để xóa.');
        return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} lịch học đã chọn?`)) {
        try {
            // Tách chuỗi ID thành object (Bao gồm cả MaHK)
            const listToDelete = selectedIds.map(idStr => {
                const [maLop, maHK, maMon, thu, tiet, phong] = idStr.split('|');
                return {
                    MaLopHoc: maLop,
                    MaHocKy: maHK, 
                    MaMon: maMon,
                    Thu: thu,
                    Tiet: tiet,
                    PhongHoc: phong
                };
            });

            const response = await fetch('http://localhost:8000/api/schedules/delete-multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedules: listToDelete })
            });

            const result = await response.json();

            if (result.success) {
                alert(`Đã xóa thành công ${selectedIds.length} lịch học!`);
                selectedScheduleIds.clear();
                
                const selectAll = document.getElementById('selectAllCheckbox');
                if (selectAll) selectAll.checked = false;

                fetchAndInitScheduleTable(currentSemesterIdForSchedule);
            } else {
                alert('Lỗi server: ' + result.message);
            }
        } catch (err) { 
            console.error(err);
            alert('Lỗi kết nối hoặc server!'); 
        }
    }
}

// --- 6. SỰ KIỆN NÚT THÊM/SỬA/XÓA ---
function attachScheduleActionEvents() {
    document.querySelectorAll('.edit-schedule-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (currentSemesterStatusForSchedule === "Đã đóng") {
                alert("Học kỳ đã đóng. Không thể cập nhật lịch học.");
                return;
            }
            const button = e.currentTarget; 
            const data = JSON.parse(button.dataset.info);
            await openScheduleEditModal(data);
        });
    });

    document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (currentSemesterStatusForSchedule === "Đã đóng") {
                alert("Học kỳ đã đóng. Không thể xóa lịch học.");
                return;
            }

            const rawId = e.currentTarget.dataset.id;
            const [maLop, maHK, maMon, thu, tiet, phong] = rawId.split('|');

            if (confirm(`Xóa lịch lớp ${maLop} (Thứ ${thu}, Tiết ${tiet})?`)) {
                try {
                    const params = new URLSearchParams({
                        maLop: maLop,
                        maHK: maHK,
                        maMon: maMon,
                        thu: thu,
                        tiet: tiet,
                        phong: phong
                    });

                    const response = await fetch(`http://localhost:8000/api/schedules/delete?${params.toString()}`, {
                        method: 'DELETE'
                    });

                    const result = await response.json();

                    if (result.success) {
                        alert('Đã xóa lịch học!');
                        
                        if(selectedScheduleIds.has(rawId)) {
                            selectedScheduleIds.delete(rawId);
                        }

                        fetchAndInitScheduleTable(currentSemesterIdForSchedule);
                    } else {
                        alert('Lỗi xóa: ' + (result.message || 'Không rõ'));
                    }
                } catch (err) {
                    console.error(err);
                    alert('Lỗi kết nối server!');
                }
            }
        });
    });
}

function setupBatchDeleteButton() {
    const btnDelete = document.querySelector('.btn-icon-delete-schedule');
    if (btnDelete) {
        const newBtn = btnDelete.cloneNode(true);
        btnDelete.parentNode.replaceChild(newBtn, btnDelete);
        newBtn.addEventListener('click', handleMultipleDeleteSchedule);
        newBtn.disabled = true;
        newBtn.style.opacity = '0.5';
    }
}

function setupAddScheduleButton() {
    const btn = document.querySelector('.btn-add-schedule') || document.querySelector('.btn-blue');
    if(btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', async () => {
            if (!currentSemesterIdForSchedule) {
                alert("Vui lòng chọn học kỳ trước khi thêm lịch!");
                return;
            }
            if (currentSemesterStatusForSchedule === "Đã đóng") {
                alert("Học kỳ đã đóng. Không thể thêm mới lịch học.");
                return;
            }
            isScheduleEditMode = false; 
            document.getElementById('modal-add-schedule-form').reset();
            document.getElementById('scheduleGVName').value = '';
            document.getElementById('scheduleMonName').value = '';
            document.getElementById('scheduleClassSelect').disabled = false;
            document.querySelector('#schedule-modal h3').innerText = 'Thêm lịch học';
            await loadClassesForScheduleModal();
            document.getElementById('schedule-modal').classList.add('active');
        });
    }
}

// --- 7. MODAL LOGIC ---
async function openScheduleEditModal(data) {
    isScheduleEditMode = true;
    currentScheduleOldData = data;
    await loadClassesForScheduleModal();
    const selectVal = `${data.MaLopHoc}|${data.MaMon}`;
    document.getElementById('scheduleClassSelect').value = selectVal;
    document.getElementById('scheduleClassSelect').disabled = true;
    document.getElementById('scheduleMonName').value = data.TenMon;
    document.getElementById('scheduleGVName').value = data.TenGiangVien;
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

window.closeScheduleModal = function() { 
    document.getElementById('schedule-modal').classList.remove('active'); 
};

// --- 8. KÍCH HOẠT (MAIN EXECUTION) ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('schedule-table-body')) {
        initSchedulePage();
    }
});

// --- 9. EXPORTS ---
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'currentSemesterIdForSchedule', { get: () => currentSemesterIdForSchedule });
    Object.defineProperty(window, 'currentSemesterStatusForSchedule', { get: () => currentSemesterStatusForSchedule });
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
    
    window.updateSelectedScheduleIds = updateSelectedScheduleIds;
    window.selectedScheduleIds = selectedScheduleIds;
}