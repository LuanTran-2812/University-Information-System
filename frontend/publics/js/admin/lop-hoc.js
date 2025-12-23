let isClassEditMode = false;
let currentSemesterId = ""; 
let currentSemesterStatus = "";
let allClassesData = [];
let currentClassPage = 1;
const selectedClassIds = new Set();
let currentClassFilterState = {
    status: '',
    lecturer: ''
};

// --- 1. KHỞI TẠO ---
async function initClassPage() {
    allClassesData = [];
    currentSemesterId = "";
    
    // Reset filter state
    currentClassFilterState = {
        status: '',
        lecturer: ''
    };

    const tbody = document.getElementById('class-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Đang tải danh sách học kỳ...</td></tr>';

    await loadSemestersToCustomFilter();
    setupAddClassButton();
    setupBatchDeleteClassButton(); 
    setupAddClassForm();
    setupMonHocChangeEvent(); // Gắn sự kiện thay đổi môn học

    // Setup Search
    const searchInput = document.querySelector('.header-actions .search-box input');
    if (searchInput) {
        searchInput.value = ''; // Reset search input
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        const debouncedSearch = debounce(() => {
            fetchAndInitClassTable(currentSemesterId);
        }, 500);

        newSearchInput.addEventListener('input', debouncedSearch);
        newSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                fetchAndInitClassTable(currentSemesterId); 
            }
        });
    }
}

// Hàm Debounce (nếu chưa có global)
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) { clearTimeout(timeoutId); }
        timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
    };
}

// --- 2. LOAD HỌC KỲ (Dropdown Custom) ---
async function loadSemestersToCustomFilter() {
    try {
        const response = await fetch('http://localhost:8000/api/semesters');
        const result = await response.json();
        const wrapper = document.getElementById('semester-custom-wrapper');
        const trigger = document.getElementById('semester-trigger');
        const optionsContainer = document.getElementById('semester-options-container');
        const hiddenInput = document.getElementById('semester-filter-value');

        if (result.success && optionsContainer) {
            optionsContainer.innerHTML = '';
            
            const newTrigger = trigger.cloneNode(true);
            trigger.parentNode.replaceChild(newTrigger, trigger);
            const currentTrigger = document.getElementById('semester-trigger');
            const currentTextDisplay = document.getElementById('selected-semester-text');

            currentTrigger.addEventListener('click', (e) => {
                wrapper.classList.toggle('open');
                e.stopPropagation();
            });
            window.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) wrapper.classList.remove('open');
            });

            let activeSemester = null;

            result.data.forEach(hk => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-option'; 
                optionDiv.dataset.value = hk.MaHocKy;
                optionDiv.dataset.status = hk.TrangThai; 
                
                let label = `${hk.MaHocKy} (${hk.NamHoc})`;
                if (hk.TrangThai === 'Đang diễn ra') {
                    label += ' -- Hiện hành --';
                    activeSemester = { ...hk, displayLabel: label };
                }
                optionDiv.textContent = label;

                optionDiv.addEventListener('click', function() {
                    currentTextDisplay.textContent = this.textContent;
                    currentTrigger.classList.add('selected');
                    wrapper.classList.remove('open');
                    document.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');

                    currentSemesterId = this.dataset.value;
                    currentSemesterStatus = this.dataset.status;
                    if (hiddenInput) hiddenInput.value = currentSemesterId;
                    
                    selectedClassIds.clear();
                    updateClassDeleteButtonState();
                    fetchAndInitClassTable(currentSemesterId);
                });
                optionsContainer.appendChild(optionDiv);
            });

            if (activeSemester) {
                currentTextDisplay.textContent = activeSemester.displayLabel;
                currentTrigger.classList.add('selected');
                currentSemesterId = activeSemester.MaHocKy;
                currentSemesterStatus = activeSemester.TrangThai;
                if (hiddenInput) hiddenInput.value = activeSemester.MaHocKy;
                fetchAndInitClassTable(currentSemesterId);
            } else {
                const tbody = document.getElementById('class-table-body');
                if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Vui lòng chọn Học kỳ để xem.</td></tr>';
            }
        }
    } catch (err) { console.error("Lỗi tải học kỳ:", err); }
}

// --- 3. LOAD & RENDER BẢNG LỚP HỌC ---
async function fetchAndInitClassTable(maHK) {
    if (!maHK) return;
    try {
        const url = new URL('http://localhost:8000/api/classes');
        url.searchParams.append('maHK', maHK);

        // Append Filters
        if (currentClassFilterState.status) {
            url.searchParams.append('status', currentClassFilterState.status);
        }
        if (currentClassFilterState.lecturer) {
            url.searchParams.append('lecturer', currentClassFilterState.lecturer);
        }

        // Append Search
        const searchInput = document.querySelector('.header-actions .search-box input');
        if (searchInput && searchInput.value.trim() !== '') {
            url.searchParams.append('q', searchInput.value.trim());
        }

        const response = await fetch(url.toString());
        const result = await response.json();
        if (result.success) {
            allClassesData = result.data;
            currentClassPage = 1;
            selectedClassIds.clear();
            renderClassTable(currentClassPage);
        }
    } catch (err) { console.error(err); }
}

function renderClassTable(page) {
    const ROWS_PER_PAGE = 7;
    const tbody = document.getElementById('class-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    updateClassDeleteButtonState();

    if (allClassesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Không có lớp học nào.</td></tr>';
        return;
    }

    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = allClassesData.slice(start, end);

    pageData.forEach(cls => {
        let badgeClass = 'grey';
        const status = cls.TrangThai || 'Chưa xếp lịch';
        if (status.includes('Đang đăng ký')) badgeClass = 'blue';
        else if (status.includes('Đang học')) badgeClass = 'green';
        else if (status.includes('Đã kết thúc') || status.includes('Đã hủy')) badgeClass = 'red';
        else if (status.includes('Đã xếp lịch')) badgeClass = 'orange';
        else if (status.includes('Kết thúc đăng ký')) badgeClass = 'yellow';

        const dataString = JSON.stringify(cls).replace(/"/g, '&quot;');
        const uniqueId = `${cls.MaLopHoc}|${currentSemesterId}|${cls.MaMonHoc}`;
        const isChecked = selectedClassIds.has(uniqueId) ? 'checked' : '';

        const row = `
            <tr>
                <td style="text-align: center;"><input type="checkbox" class="class-checkbox" value="${uniqueId}" ${isChecked}></td>
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
    setupClassCheckboxes(); 
    updateClassDeleteButtonState();
    
    if (typeof renderPagination === 'function') {
        renderPagination(allClassesData.length, ROWS_PER_PAGE, page, (newPage) => {
            currentClassPage = newPage;
            renderClassTable(newPage);
        });
    }
}

// --- FILTER LOGIC ---
function toggleClassFilterPopup() {
    const popup = document.getElementById('class-filter-popup');
    const btn = document.getElementById('btn-class-filter');
    
    const isHidden = window.getComputedStyle(popup).display === 'none';
    
    if (isHidden) {
        popup.style.display = 'block';
        btn.classList.add('active');
        loadClassFilterOptions().then(() => {
            // Restore state
            const selectStatus = document.getElementById('class-filter-status');
            const selectLecturer = document.getElementById('class-filter-lecturer');
            
            if (selectStatus) selectStatus.value = currentClassFilterState.status;
            if (selectLecturer) selectLecturer.value = currentClassFilterState.lecturer;
        });
    } else {
        closeClassFilterPopup();
    }
}

function closeClassFilterPopup() {
    const popup = document.getElementById('class-filter-popup');
    const btn = document.getElementById('btn-class-filter');
    popup.style.display = 'none';
    btn.classList.remove('active');
}

async function loadClassFilterOptions() {
    const selectLecturer = document.getElementById('class-filter-lecturer');
    
    // Nếu đã có data (nhiều hơn 1 option "Tất cả") thì không gọi lại API
    if (selectLecturer && selectLecturer.options.length <= 1) {
        try {
            const response = await fetch('http://localhost:8000/api/classes/lecturers');
            const result = await response.json();
            
            if (result.success) {
                result.data.forEach(gv => {
                    const option = document.createElement('option');
                    option.value = gv.HoTen;
                    option.text = gv.HoTen;
                    selectLecturer.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách giảng viên cho filter:", error);
        }
    }
}

function applyClassFilterButton() {
    const statusVal = document.getElementById('class-filter-status').value;
    const lecturerVal = document.getElementById('class-filter-lecturer').value;

    currentClassFilterState.status = statusVal;
    currentClassFilterState.lecturer = lecturerVal;

    fetchAndInitClassTable(currentSemesterId);
    closeClassFilterPopup();
}

// Close popup when clicking outside
document.addEventListener('click', function(event) {
    const popup = document.getElementById('class-filter-popup');
    const btn = document.getElementById('btn-class-filter');
    if (popup && btn && !popup.contains(event.target) && !btn.contains(event.target)) {
        closeClassFilterPopup();
    }
});

window.toggleClassFilterPopup = toggleClassFilterPopup;
window.closeClassFilterPopup = closeClassFilterPopup;
window.applyClassFilterButton = applyClassFilterButton;

// --- 4. CHECKBOX & DELETE ---
function updateSelectedClassIds(id, isChecked) {
    if (isChecked) selectedClassIds.add(id);
    else selectedClassIds.delete(id);
}

function setupClassCheckboxes() {
    const selectAll = document.getElementById('selectAllClassCheckbox');
    const checkboxes = document.querySelectorAll('.class-checkbox');
    if (!selectAll) return;
    const allOnPageChecked = Array.from(checkboxes).length > 0 && Array.from(checkboxes).every(c => c.checked);
    selectAll.checked = allOnPageChecked;
    selectAll.onchange = function () {
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
            updateSelectedClassIds(cb.value, cb.checked);
        });
        updateClassDeleteButtonState();
    };
    checkboxes.forEach(cb => {
        cb.onchange = function () {
            updateSelectedClassIds(this.value, this.checked);
            if (!this.checked) selectAll.checked = false;
            else {
                const allCheckedOnPage = Array.from(checkboxes).every(c => c.checked);
                if (allCheckedOnPage) selectAll.checked = true;
            }
            updateClassDeleteButtonState();
        };
    });
}

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

async function handleMultipleDeleteClass(e) {
    e.preventDefault();
    if (currentSemesterStatus === "Đã đóng") { alert("Học kỳ đã đóng!"); return; }
    const selectedIds = Array.from(selectedClassIds);
    if (selectedIds.length === 0) return;

    if (confirm(`Xóa ${selectedIds.length} lớp học?`)) {
        try {
            const listToDelete = selectedIds.map(idStr => {
                const [maLop, maHK, maMon] = idStr.split('|');
                return { maLop, maHK, maMon };
            });
            const response = await fetch('http://localhost:8000/api/classes/delete-multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classes: listToDelete })
            });
            const result = await response.json();
            if (result.success) {
                alert(`Đã xóa thành công!`);
                selectedClassIds.clear(); 
                document.getElementById('selectAllClassCheckbox').checked = false;
                fetchAndInitClassTable(currentSemesterId);
            } else { alert('Lỗi: ' + result.message); }
        } catch (err) { alert('Lỗi server!'); }
    }
}

function attachClassActionEvents() {
    document.querySelectorAll('.edit-class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (currentSemesterStatus === "Đã đóng") { alert("Học kỳ đã đóng!"); return; }
            const data = JSON.parse(e.currentTarget.dataset.info);
            openClassEditModal(data);
        });
    });
    document.querySelectorAll('.delete-class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (currentSemesterStatus === "Đã đóng") { alert("Học kỳ đã đóng!"); return; }
            const maLop = e.currentTarget.dataset.id;
            const maMon = e.currentTarget.dataset.mon;
            if (confirm(`Xóa lớp ${maLop}?`)) {
                try {
                    const res = await fetch(`http://localhost:8000/api/classes/delete?maLop=${maLop}&maHK=${currentSemesterId}&maMon=${maMon}`, { method: 'DELETE' });
                    const result = await res.json();
                    if (result.success) {
                        alert('Đã xóa!');
                        const uniqueId = `${maLop}|${currentSemesterId}|${maMon}`;
                        if(selectedClassIds.has(uniqueId)) selectedClassIds.delete(uniqueId);
                        fetchAndInitClassTable(currentSemesterId);
                    } else {
                        alert('Lỗi: ' + result.message);
                    }
                } catch(err) { alert('Lỗi kết nối!'); }
            }
        });
    });
}

function setupBatchDeleteClassButton() {
    const btnDelete = document.querySelector('.btn-icon-delete-class');
    if (btnDelete) {
        const newBtn = btnDelete.cloneNode(true);
        btnDelete.parentNode.replaceChild(newBtn, btnDelete);
        newBtn.addEventListener('click', handleMultipleDeleteClass);
        newBtn.disabled = true;
        newBtn.style.opacity = '0.5';
    }
}

// --- 5. LOGIC MODAL ---

// A. Load cấu trúc điểm (Dùng cho Form Thêm - Lấy theo Môn học)
async function loadGradeStructure(maMon) {
    if (!maMon) {
        resetGradeInputs();
        return;
    }
    
    try {
        const res = await fetch(`http://localhost:8000/api/subjects/${maMon}`);
        const result = await res.json();
        if (result.success && result.data && result.data.grades) {
            fillGradeInputs(result.data.grades);
        }
    } catch (err) {
        console.error('Lỗi tải cấu trúc điểm môn học:', err);
    }
}

// A2. Load cấu trúc điểm của LỚP (Dùng cho Form Sửa - Lấy theo Lớp)
async function loadClassGradeStructure(maLop, maHK, maMon) {
    try {
        const res = await fetch(`http://localhost:8000/api/classes/grade-structure?maLop=${maLop}&maHK=${maHK}&maMon=${maMon}`);
        const result = await res.json();
        if (result.success && result.data && result.data.grades) {
            fillGradeInputs(result.data.grades);
            
            // Optional: Hiển thị thông báo nếu đang dùng cấu trúc lịch sử
            if (result.data.source === 'history') {
                console.log('Đang hiển thị cấu trúc điểm LỊCH SỬ của lớp.');
            }
        }
    } catch (err) {
        console.error('Lỗi tải cấu trúc điểm lớp học:', err);
    }
}

function resetGradeInputs() {
    ['classQuiz', 'classThiNghiem', 'classBTL', 'classGiuaKy', 'classCuoiKy'].forEach(id => document.getElementById(id).value = '');
}

function fillGradeInputs(grades) {
    document.getElementById('classQuiz').value = (grades['Quiz'] || 0) + '%';
    document.getElementById('classThiNghiem').value = (grades['Thí nghiệm'] || 0) + '%';
    document.getElementById('classBTL').value = (grades['BTL'] || 0) + '%';
    document.getElementById('classGiuaKy').value = (grades['Giữa kì'] || 0) + '%';
    document.getElementById('classCuoiKy').value = (grades['Cuối kì'] || 0) + '%';
}

function setupMonHocChangeEvent() {
    const select = document.getElementById('classMonHocSelect');
    if(select) {
        select.onchange = function() { 
            loadGradeStructure(this.value);
            
            // Lọc giảng viên theo khoa của môn học
            const selectedOption = this.options[this.selectedIndex];
            const khoa = selectedOption.getAttribute('data-khoa');
            filterLecturersByFaculty(khoa);
        }
    }
}

function filterLecturersByFaculty(khoa) {
    const gvSelect = document.getElementById('classGiangVienSelect');
    if (!gvSelect) return;
    
    const allOptions = Array.from(gvSelect.querySelectorAll('option'));
    
    // Reset hiển thị tất cả trước khi lọc (trừ option đầu tiên)
    allOptions.forEach(opt => {
        if (opt.value === "") return;
        const gvKhoa = opt.getAttribute('data-khoa');
        
        if (khoa && gvKhoa !== khoa) {
            opt.style.display = 'none';
        } else {
            opt.style.display = 'block';
        }
    });
    
    // Reset giá trị nếu giảng viên đang chọn bị ẩn
    const currentSelected = gvSelect.selectedOptions[0];
    if (currentSelected && currentSelected.style.display === 'none') {
        gvSelect.value = "";
    }
}

// B. Load danh sách sinh viên
async function loadStudentList(maLop, maHK, maMon) {
    const tbody = document.getElementById('student-list-tbody');
    const badge = document.getElementById('student-count-badge');
    
    // Hiển thị loading trong bảng
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">Đang tải danh sách...</td></tr>';
    badge.innerText = '...';

    try {
        const response = await fetch(`http://localhost:8000/api/classes/students?maLop=${maLop}&maHK=${maHK}&maMon=${maMon}`);
        const result = await response.json();

        tbody.innerHTML = ''; 
        if (result.success && result.data.length > 0) {
            badge.innerText = `${result.data.length} SV`;
            badge.className = 'badge blue';
            result.data.forEach((sv, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${sv.MSSV}</td>
                    <td>${sv.HoTen}</td>
                    <td>
                        <button type="button" onclick="removeStudentFromClass('${maLop}', '${maHK}', '${maMon}', '${sv.MSSV}')" style="border:none; background:none; cursor:pointer;" title="Xóa sinh viên">
                            <span class="material-symbols-outlined" style="color:#ef4444; font-size:18px;">do_not_disturb_on</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            // Không có sinh viên -> Hiện bảng trống báo "Chưa có sinh viên"
            badge.innerText = '0 SV';
            badge.className = 'badge grey';
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; font-style:italic;">Lớp chưa có sinh viên nào.</td></tr>';
        }
    } catch (err) {
        // Lỗi kết nối (hoặc chưa có API) -> Vẫn hiện bảng nhưng báo lỗi
        console.warn("Chưa tải được sinh viên:", err);
        badge.innerText = '0 SV';
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:orange; padding:20px;">Lỗi kết nối dữ liệu sinh viên.</td></tr>';
    }
}

window.removeStudentFromClass = async function(maLop, maHK, maMon, mssv) {
    if(!confirm(`Xóa sinh viên ${mssv} khỏi lớp này?`)) return;
    try {
        const res = await fetch(`http://localhost:8000/api/classes/students/${mssv}?maLop=${maLop}&maHK=${maHK}&maMon=${maMon}`, { method: 'DELETE' });
        const result = await res.json();
        if(result.success) {
            alert('Đã xóa sinh viên.');
            loadStudentList(maLop, maHK, maMon);
        } else { alert('Lỗi: ' + result.message); }
    } catch(e) { alert('Lỗi server'); }
};

// C. Modal Helper
async function loadDataForClassModal() {
    try {
        const resMon = await fetch('http://localhost:8000/api/subjects');
        const dataMon = await resMon.json();
        const monSelect = document.getElementById('classMonHocSelect');
        const currentVal = monSelect.value; // Giữ giá trị nếu đang chọn
        if (monSelect) {
            monSelect.innerHTML = '<option value="">-- Chọn Môn Học --</option>';
            dataMon.data.forEach(m => {
                monSelect.innerHTML += `<option value="${m.MaMon}" data-khoa="${m.KhoaPhuTrach}">${m.MaMon} - ${m.TenMon}</option>`;
            });
            if(currentVal) monSelect.value = currentVal;
        }

        const resGV = await fetch('http://localhost:8000/api/classes/lecturers');
        const dataGV = await resGV.json();
        const gvSelect = document.getElementById('classGiangVienSelect');
        const currentGV = gvSelect.value;
        if (gvSelect) {
            gvSelect.innerHTML = '<option value="">-- Chưa phân công --</option>';
            dataGV.data.forEach(gv => {
                gvSelect.innerHTML += `<option value="${gv.MSCB}" data-khoa="${gv.Khoa}">${gv.HoTen}</option>`;
            });
            if(currentGV) gvSelect.value = currentGV;
        }
    } catch (err) { console.error(err); }
}

// D. Nút THÊM LỚP
function setupAddClassButton() {
    const btnAdd = document.querySelector('.btn-add-class'); 
    if (btnAdd) {
        btnAdd.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!currentSemesterId) { alert("Vui lòng chọn Học kỳ!"); return; }
            if (currentSemesterStatus === "Đã đóng") { alert("Học kỳ đã đóng!"); return; }

            isClassEditMode = false;
            document.getElementById('modal-add-class-form').reset();
            
            // --- ĐÂY LÀ ĐOẠN ẨN GIAO DIỆN ---
            // Ẩn Mã lớp, Hiện full Sĩ số
            document.getElementById('group-ma-lop').style.display = 'none';
            document.getElementById('group-si-so').classList.add('grid-span-full');
            
            // ẨN CỘT PHẢI & CHECKBOX HỦY (Mode Thêm không cần)
            document.getElementById('student-list-panel').style.display = 'none';
            document.getElementById('cancel-class-wrapper').style.display = 'none';

            document.getElementById('maLop').disabled = false;
            document.getElementById('classMonHocSelect').disabled = false;
            
            await loadDataForClassModal();
            loadGradeStructure(''); 

            document.querySelector('#class-modal h3').innerText = 'Thêm lớp học';
            document.getElementById('btn-save-class').innerText = 'Lưu';
            openClassModal();
        });
    }
}

// E. Nút CẬP NHẬT
async function openClassEditModal(data) {
    isClassEditMode = true;
    await loadDataForClassModal();
    // Hiện Mã lớp, Thu gọn Sĩ số
    document.getElementById('group-ma-lop').style.display = 'block'; 
    document.getElementById('group-si-so').classList.remove('grid-span-full');
    
    // HIỆN CỘT PHẢI & CHECKBOX HỦY
    document.getElementById('student-list-panel').style.display = 'flex'; 
    document.getElementById('cancel-class-wrapper').style.display = 'block';

    // Điền dữ liệu
    document.getElementById('maLop').value = data.MaLopHoc;
    document.getElementById('siSoMax').value = data.SiSoToiDa;
    document.getElementById('classMonHocSelect').value = data.MaMonHoc;
    
    // Trigger change để load cấu trúc điểm và lọc giảng viên
    loadClassGradeStructure(data.MaLopHoc, data.MaHocKy, data.MaMonHoc);
    
    // Lấy khoa của môn học để lọc giảng viên
    const monSelect = document.getElementById('classMonHocSelect');
    const selectedOption = monSelect.querySelector(`option[value="${data.MaMonHoc}"]`);
    if (selectedOption) {
        const khoa = selectedOption.getAttribute('data-khoa');
        filterLecturersByFaculty(khoa);
    }

    document.getElementById('classGiangVienSelect').value = data.MSCB || "";
    
    // Xử lý checkbox Hủy lớp
    const chkHuyLop = document.getElementById('chkHuyLop');
    chkHuyLop.checked = (data.TrangThai === 'Đã hủy lớp');
    
    // Logic: Chỉ cho phép chọn hủy khi trạng thái là "Kết thúc đăng ký"
    chkHuyLop.onclick = function(e) {
        const allowedStatus = 'Kết thúc đăng ký';
        
        // Nếu đang check (muốn hủy) mà trạng thái không phải Kết thúc đăng ký
        if (this.checked && data.TrangThai !== allowedStatus && data.TrangThai !== 'Đã hủy lớp') {
            e.preventDefault();
            alert(`Không thể hủy lớp ở trạng thái "${data.TrangThai}".\nChỉ có thể hủy khi lớp ở trạng thái "${allowedStatus}".`);
            return false;
        }
    };

    document.getElementById('maLop').disabled = true;
    document.getElementById('classMonHocSelect').disabled = true; 

    // GỌI HÀM LOAD CẤU TRÚC VÀ SINH VIÊN
    loadStudentList(data.MaLopHoc, data.MaHocKy, data.MaMonHoc); // Hàm này sẽ vẽ bảng

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
            maHK: currentSemesterId,
            maMon: document.getElementById('classMonHocSelect').value,
            siSoMax: document.getElementById('siSoMax').value,
            mscb: document.getElementById('classGiangVienSelect').value,
            huyLop: document.getElementById('chkHuyLop').checked 
        };
        if (!data.maMon) { alert("Vui lòng chọn môn học!"); return; }

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
                alert(result.message);
                closeClassModal();
                fetchAndInitClassTable(currentSemesterId);
            } else { alert('Lỗi: ' + result.message); }
        } catch (error) { console.error(error); alert('Lỗi kết nối server'); }
    });
}

window.openClassModal = function() { document.getElementById('class-modal').classList.add('active'); }
window.closeClassModal = function() { document.getElementById('class-modal').classList.remove('active'); }

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'isClassEditMode', { get: () => isClassEditMode });
    Object.defineProperty(window, 'currentSemesterId', { get: () => currentSemesterId });
    Object.defineProperty(window, 'currentSemesterStatus', { get: () => currentSemesterStatus });
    window.allClassesData = allClassesData; 
    Object.defineProperty(window, 'currentClassPage', { get: () => currentClassPage });
    window.initClassPage = initClassPage;
    window.renderClassTable = renderClassTable;
    window.selectedClassIds = selectedClassIds;
    window.updateSelectedClassIds = updateSelectedClassIds;
}