let isClassEditMode = false;
let currentSemesterId = ""; 
let currentSemesterStatus = "";

// BIẾN PHÂN TRANG CHO LỚP HỌC
let allClassesData = [];
let currentClassPage = 1;

// SET LƯU TRỮ ID CÁC DÒNG ĐƯỢC CHỌN (Composite Key: MaLop|MaHK|MaMon)
const selectedClassIds = new Set();

// --- 1. HÀM KHỞI TẠO CHÍNH ---
async function initClassPage() {
    allClassesData = [];
    currentSemesterId = "";
    
    const tbody = document.getElementById('class-table-body');
    if (tbody) {
        // Cập nhật thông báo chờ
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Đang tải danh sách học kỳ...</td></tr>';
    }

    await loadSemestersToCustomFilter();

    setupAddClassButton();
    setupBatchDeleteClassButton(); 
    setupAddClassForm();
}

// --- 2. LOGIC CUSTOM DROPDOWN ---
async function loadSemestersToCustomFilter() {
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

            // A. Xử lý đóng/mở menu (Cloning để xóa sự kiện cũ)
            const newTrigger = trigger.cloneNode(true);
            trigger.parentNode.replaceChild(newTrigger, trigger);
            
            const currentTrigger = document.getElementById('semester-trigger');
            const currentTextDisplay = document.getElementById('selected-semester-text');

            currentTrigger.addEventListener('click', function(e) {
                wrapper.classList.toggle('open');
                e.stopPropagation();
            });

            window.addEventListener('click', function(e) {
                if (!wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });

            let activeSemester = null; // Biến lưu học kỳ hiện hành để auto-select

            // B. Tạo danh sách Option từ API
            result.data.forEach(hk => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-option'; 
                optionDiv.dataset.value = hk.MaHocKy;
                optionDiv.dataset.status = hk.TrangThai; 
                
                // --- LOGIC MỚI: Xử lý hiển thị "-- Hiện hành --" ---
                let label = `${hk.MaHocKy} (${hk.NamHoc})`;
                if (hk.TrangThai === 'Đang diễn ra') {
                    label += ' -- Hiện hành --';
                    // Lưu lại học kỳ này để chọn mặc định
                    activeSemester = {
                        ...hk,
                        displayLabel: label
                    };
                }
                optionDiv.textContent = label;

                // === SỰ KIỆN KHI CHỌN MỘT HỌC KỲ ===
                optionDiv.addEventListener('click', function() {
                    // 1. Cập nhật hiển thị text và trạng thái chọn
                    currentTextDisplay.textContent = this.textContent;
                    currentTrigger.classList.add('selected');
                    wrapper.classList.remove('open');
                    document.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');

                    // 2. Cập nhật dữ liệu học kỳ
                    currentSemesterId = this.dataset.value;
                    currentSemesterStatus = this.dataset.status;
                    if (hiddenInput) hiddenInput.value = currentSemesterId;

                    // 3. Reset checkbox và Tải dữ liệu lớp mới
                    selectedClassIds.clear();
                    updateClassDeleteButtonState();
                    fetchAndInitClassTable(currentSemesterId);
                });

                optionsContainer.appendChild(optionDiv);
            });

            // --- LOGIC MỚI: Tự động chọn học kỳ hiện hành ---
            if (activeSemester) {
                // Cập nhật text hiển thị trên UI
                currentTextDisplay.textContent = activeSemester.displayLabel;
                currentTrigger.classList.add('selected');

                // Set active class cho option tương ứng trong dropdown
                const allOptions = optionsContainer.querySelectorAll('.custom-option');
                allOptions.forEach(opt => {
                    if(opt.dataset.value === activeSemester.MaHocKy) opt.classList.add('selected');
                });

                // Cập nhật biến toàn cục
                currentSemesterId = activeSemester.MaHocKy;
                currentSemesterStatus = activeSemester.TrangThai;
                if (hiddenInput) hiddenInput.value = activeSemester.MaHocKy;

                // Tải dữ liệu ngay lập tức
                fetchAndInitClassTable(currentSemesterId);
            } else {
                // Trường hợp không có học kỳ nào "Đang diễn ra"
                const tbody = document.getElementById('class-table-body');
                if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Vui lòng chọn Học kỳ trên thanh công cụ để xem lớp học.</td></tr>';
            }
        }
    } catch (err) { console.error("Lỗi tải học kỳ:", err); }
}

// 3. Tải danh sách Lớp theo Mã HK
async function fetchAndInitClassTable(maHK) {
    if (!maHK) return;
    try {
        const response = await fetch(`http://localhost:8000/api/classes?maHK=${maHK}`);
        const result = await response.json();
        
        if (result.success) {
            allClassesData = result.data;
            currentClassPage = 1;
            selectedClassIds.clear(); // Clear selected IDs when reloading data
            renderClassTable(currentClassPage);
        }
    } catch (err) { console.error(err); }
}

// 4. Hàm Vẽ Bảng
function renderClassTable(page) {
    const ROWS_PER_PAGE = 7;
    const tbody = document.getElementById('class-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    updateClassDeleteButtonState(); // Cập nhật trạng thái nút xóa

    // Xử lý trường hợp không có dữ liệu
    if (allClassesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Không có lớp học nào trong học kỳ này.</td></tr>';
        return;
    }

    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = allClassesData.slice(start, end);

    if (pageData.length === 0 && page > 1) {
        currentClassPage = page - 1;
        renderClassTable(currentClassPage);
        return;
    }

    pageData.forEach(cls => {
        let badgeClass = 'grey';
        const status = cls.TrangThai || 'Chưa xếp lịch';
        if (status.includes('Đang đăng ký')) badgeClass = 'blue';
        else if (status.includes('Đang học')) badgeClass = 'green';
        else if (status.includes('Đã kết thúc')) badgeClass = 'red';
        else if (status.includes('Đã hủy lớp')) badgeClass = 'red';
        else if (status.includes('Đã xếp lịch')) badgeClass = 'orange';
        else if (status.includes('Kết thúc đăng ký')) badgeClass = 'yellow';

        const dataString = JSON.stringify(cls).replace(/"/g, '&quot;');

        // TẠO KEY DUY NHẤT ĐỂ XÓA (MaLop|MaHK|MaMon)
        const uniqueId = `${cls.MaLopHoc}|${currentSemesterId}|${cls.MaMonHoc}`;
        const isChecked = selectedClassIds.has(uniqueId) ? 'checked' : '';

        const row = `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="class-checkbox" value="${uniqueId}" ${isChecked}>
                </td>
                <td>${cls.MaLopHoc}</td>
                <td>${cls.TenMon || 'N/A'}</td>
                <td>${cls.TenGiangVien || '<span style="color:#999; font-style:italic;">Chưa phân công</span>'}</td>
                <td>${cls.SiSoHienTai} / ${cls.SiSoToiDa}</td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
                <td style="text-align: center;">
                    <button class="action-btn edit-class-btn" data-info="${dataString}" style="border:none; background:none; cursor:pointer; margin-right:8px;">
                        <span class="material-symbols-outlined" style="color:#3b82f6">edit</span>
                    </button>
                    <button class="action-btn delete-class-btn" data-id="${cls.MaLopHoc}" data-mon="${cls.MaMonHoc}" style="border:none; background:none; cursor:pointer;">
                        <span class="material-symbols-outlined" style="color:#ef4444">delete</span>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    
    attachClassActionEvents();
    setupClassCheckboxes(); // Setup sự kiện checkbox
    updateClassDeleteButtonState(); // Cập nhật lại lần nữa
    
    if (typeof renderPagination === 'function') {
        renderPagination(allClassesData.length, ROWS_PER_PAGE, page, (newPage) => {
            currentClassPage = newPage;
            renderClassTable(newPage);
        });
    }
}

// --- 5. HÀM QUẢN LÝ CHECKBOX VÀ XÓA HÀNG LOẠT ---

/**
 * Cập nhật trạng thái của ID trong Set ghi nhớ.
 */
function updateSelectedClassIds(id, isChecked) {
    if (isChecked) {
        selectedClassIds.add(id);
    } else {
        selectedClassIds.delete(id);
    }
}

/**
 * Thiết lập sự kiện cho checkbox Chọn Tất Cả và checkbox con.
 */
function setupClassCheckboxes() {
    const selectAll = document.getElementById('selectAllClassCheckbox');
    const checkboxes = document.querySelectorAll('.class-checkbox');

    if (!selectAll) return;

    // Set trạng thái Select All dựa trên page hiện tại
    const allOnPageChecked = Array.from(checkboxes).length > 0 && Array.from(checkboxes).every(c => c.checked);
    selectAll.checked = allOnPageChecked;

    // Sự kiện nút Chọn Tất Cả
    selectAll.onchange = function () {
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
            updateSelectedClassIds(cb.value, cb.checked);
        });
        updateClassDeleteButtonState();
    };

    // Sự kiện từng checkbox
    checkboxes.forEach(cb => {
        cb.onchange = function () {
            updateSelectedClassIds(this.value, this.checked);

            if (!this.checked) {
                selectAll.checked = false;
            } else {
                const allCheckedOnPage = Array.from(checkboxes).every(c => c.checked);
                if (allCheckedOnPage) selectAll.checked = true;
            }
            updateClassDeleteButtonState();
        };
    });
}

/**
 * Vô hiệu hóa/Kích hoạt nút Xóa dựa trên số lượng mục đã chọn.
 */
function updateClassDeleteButtonState() {
    const deleteBtn = document.querySelector('.btn-icon-delete-class');
    if (deleteBtn) {
        if (selectedClassIds.size > 0) {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
        } else {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.5';
        }
    }
}

/**
 * Xử lý việc xóa nhiều lớp học.
 */
async function handleMultipleDeleteClass(e) {
    e.preventDefault();

    if (currentSemesterStatus === "Đã đóng") {
        alert("Học kỳ đã đóng. Không thể xóa lớp học.");
        return;
    }

    const selectedIds = Array.from(selectedClassIds);
    if (selectedIds.length === 0) {
        alert('Vui lòng chọn ít nhất một lớp học để xóa.');
        return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} lớp học đã chọn?`)) {
        try {
            // Tách chuỗi ID thành object để gửi về Server
            const listToDelete = selectedIds.map(idStr => {
                const [maLop, maHK, maMon] = idStr.split('|');
                return {
                    maLop: maLop,
                    maHK: maHK,
                    maMon: maMon
                };
            });

            // Gọi API Xóa hàng loạt
            const response = await fetch('http://localhost:8000/api/classes/delete-multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classes: listToDelete })
            });

            const result = await response.json();

            if (result.success) {
                alert(`Đã xóa thành công ${selectedIds.length} lớp học!`);
                selectedClassIds.clear(); 
                
                const selectAll = document.getElementById('selectAllClassCheckbox');
                if (selectAll) selectAll.checked = false;

                fetchAndInitClassTable(currentSemesterId);
            } else {
                alert('Lỗi server: ' + result.message);
            }
        } catch (err) { 
            console.error(err);
            alert('Lỗi kết nối hoặc server!'); 
        }
    }
}

// --- 6. GẮN SỰ KIỆN NÚT ---

function attachClassActionEvents() {
    // Sửa
    document.querySelectorAll('.edit-class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (currentSemesterStatus === "Đã đóng") {
                alert("Học kỳ đã đóng. Không thể cập nhật lớp học.");
                return;
            }
            const data = JSON.parse(e.currentTarget.dataset.info);
            openClassEditModal(data);
        });
    });

    // Xóa từng dòng
    document.querySelectorAll('.delete-class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (currentSemesterStatus === "Đã đóng") {
                alert("Học kỳ đã đóng. Không thể xóa lớp học.");
                return;
            }
            
            const maLop = e.currentTarget.dataset.id;
            const maMon = e.currentTarget.dataset.mon;
            if (!currentSemesterId) {
                alert('Chưa chọn học kỳ!');
                return;
            }
            if (confirm(`Xóa lớp ${maLop} (môn ${maMon}) trong học kỳ ${currentSemesterId}?`)) {
                try {
                    const url = `http://localhost:8000/api/classes/delete?maLop=${maLop}&maHK=${currentSemesterId}&maMon=${maMon}`;
                    const res = await fetch(url, { method: 'DELETE' });
                    const result = await res.json().catch(()=>({success:false,message:'Phản hồi không hợp lệ'}));
                    if (result.success) {
                        alert('Đã xóa lớp học!');
                        // Xóa khỏi set nếu có
                        const uniqueId = `${maLop}|${currentSemesterId}|${maMon}`;
                        if(selectedClassIds.has(uniqueId)) selectedClassIds.delete(uniqueId);
                        
                        fetchAndInitClassTable(currentSemesterId);
                    } else {
                        alert('Lỗi xóa lớp: ' + (result.message || 'Không rõ')); 
                    }
                } catch(err) { alert('Lỗi kết nối server!'); }
            }
        });
    });
}

function setupBatchDeleteClassButton() {
    const btnDelete = document.querySelector('.btn-icon-delete-class');
    if (btnDelete) {
        // Clone để xóa sự kiện cũ
        const newBtn = btnDelete.cloneNode(true);
        btnDelete.parentNode.replaceChild(newBtn, btnDelete);
        
        newBtn.addEventListener('click', handleMultipleDeleteClass);
        
        // Trạng thái ban đầu
        newBtn.disabled = true;
        newBtn.style.opacity = '0.5';
    }
}

// 4. Tải dữ liệu phụ trợ cho Modal (Môn học & Giảng viên)
async function loadDataForClassModal() {
    try {
        // A. Tải danh sách Môn học
        const resMon = await fetch('http://localhost:8000/api/subjects');
        const dataMon = await resMon.json();
        const monSelect = document.getElementById('classMonHocSelect');
        if (monSelect) {
            monSelect.innerHTML = '<option value="">-- Chọn Môn Học --</option>';
            dataMon.data.forEach(m => {
                monSelect.innerHTML += `<option value="${m.MaMon}">${m.MaMon} - ${m.TenMon}</option>`;
            });
        }

        // B. Tải danh sách Giảng viên 
        const resGV = await fetch('http://localhost:8000/api/classes/lecturers');
        const dataGV = await resGV.json();
        const gvSelect = document.getElementById('classGiangVienSelect');
        if (gvSelect) {
            gvSelect.innerHTML = '<option value="">-- Chưa phân công --</option>';
            dataGV.data.forEach(gv => {
                gvSelect.innerHTML += `<option value="${gv.MSCB}">${gv.HoTen} (${gv.MSCB})</option>`;
            });
        }
    } catch (err) { console.error(err); }
}

// 5. Xử lý Modal Thêm/Sửa
function setupAddClassButton() {
    const btnAdd = document.querySelector('.btn-add-class'); 
    if (btnAdd) {
        btnAdd.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!currentSemesterId) { 
                alert("Vui lòng chọn Học kỳ trước khi thêm lớp học!");
                return;
            }
            
            // === KIỂM TRA TRẠNG THÁI ===
            if (currentSemesterStatus === "Đã đóng") { 
                alert("Học kỳ đã đóng. Không thể thêm mới lớp học.");
                return;
            }

            isClassEditMode = false;
            const form = document.getElementById('modal-add-class-form');
            if (form) form.reset();
            const maLopEl = document.getElementById('maLop');
            const monSelectEl = document.getElementById('classMonHocSelect');
            if (maLopEl) maLopEl.disabled = false;
            if (monSelectEl) monSelectEl.disabled = false;
            const titleEl = document.querySelector('#class-modal h3');
            if (titleEl) titleEl.innerText = 'Thêm lớp học';
            const btnSave = document.getElementById('btn-save-class');
            if (btnSave) btnSave.innerText = 'Lưu';
            await loadDataForClassModal();
            openClassModal();
        });
    }
}

async function openClassEditModal(data) {
    isClassEditMode = true;
    await loadDataForClassModal();

    // Điền dữ liệu cũ
    document.getElementById('maLop').value = data.MaLopHoc;
    document.getElementById('siSoMax').value = data.SiSoToiDa;
    
    // Chọn đúng Dropdown
    document.getElementById('classMonHocSelect').value = data.MaMonHoc;
    document.getElementById('classGiangVienSelect').value = data.MSCB || "";

    // Khóa các trường Khóa Chính (Không được sửa)
    document.getElementById('maLop').disabled = true;
    document.getElementById('classMonHocSelect').disabled = true; 

    document.querySelector('#class-modal h3').innerText = 'Cập nhật lớp học';
    document.getElementById('btn-save-class').innerText = 'Cập nhật';
    
    openClassModal();
}

function setupAddClassForm() {
    const form = document.getElementById('modal-add-class-form');
    if (!form) return;

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            maLop: document.getElementById('maLop').value,
            maHK: currentSemesterId, // Lấy từ biến toàn cục filter
            maMon: document.getElementById('classMonHocSelect').value,
            siSoMax: document.getElementById('siSoMax').value,
            mscb: document.getElementById('classGiangVienSelect').value
        };

        if (!data.maMon) { alert("Vui lòng chọn môn học!"); return; }
        if (!data.maHK) { alert("Chưa chọn học kỳ!"); return; }

        let url = 'http://localhost:8000/api/classes/create';
        let method = 'POST';

        if (isClassEditMode) {
            url = `http://localhost:8000/api/classes/update/${data.maLop}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                alert(isClassEditMode ? 'Cập nhật thành công!' : 'Thêm thành công!');
                closeClassModal();
                fetchAndInitClassTable(currentSemesterId);
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) { console.error(error); alert('Lỗi kết nối server'); }
    });
}

// Helper Modal
window.openClassModal = function() { document.getElementById('class-modal').classList.add('active'); }
window.closeClassModal = function() { document.getElementById('class-modal').classList.remove('active'); }


// Export
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'isClassEditMode', { get: () => isClassEditMode });
    Object.defineProperty(window, 'currentSemesterId', { get: () => currentSemesterId });
    Object.defineProperty(window, 'currentSemesterStatus', { get: () => currentSemesterStatus });
    window.allClassesData = allClassesData; 
    Object.defineProperty(window, 'currentClassPage', { get: () => currentClassPage });
    window.initClassPage = initClassPage;
    window.renderClassTable = renderClassTable;
    // Export thêm cho tính năng xóa hàng loạt
    window.selectedClassIds = selectedClassIds;
    window.updateSelectedClassIds = updateSelectedClassIds;
}