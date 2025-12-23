let allSubjectsData = [];
let currentSubjectPage = 1;
let currentSubjectId = null;
const rowsPerPage = 7;
const selectedSubjectIds = new Set();
// Biến lưu trạng thái Filter
let currentFilterState = {
    khoa: '',
    tinChi: ''
};

// --- HÀM TẢI VÀ KHỞI TẠO DỮ LIỆU ---

/**
 * Tải dữ liệu môn học từ API có hỗ trợ Filter và Search.
 */
async function fetchAndInitSubjectTable() {
    try {
        const url = new URL('http://localhost:8000/api/subjects');
        
        // 1. Append Filters (Lọc)
        if (currentFilterState.khoa) {
            url.searchParams.append('khoa', currentFilterState.khoa);
        }
        if (currentFilterState.tinChi) {
            url.searchParams.append('tinChi', currentFilterState.tinChi);
        }
        
        // 2. Append Search (Tìm kiếm) - SỬA: Lấy đúng ID và param 'q'
        const searchInput = document.getElementById('subject-search-input');
        if(searchInput && searchInput.value.trim() !== '') {
            url.searchParams.append('q', searchInput.value.trim());
        }

        const response = await fetch(url.toString());
        const result = await response.json();
        
        if (result.success) {
            allSubjectsData = result.data;
            
            // QUAN TRỌNG: Khi tìm kiếm/lọc thay đổi, luôn reset về trang 1
            currentSubjectPage = 1;
            
            selectedSubjectIds.clear(); // Clear selected IDs when reloading data
            renderSubjectTable(currentSubjectPage);
        }
    } catch (error) { 
        console.error('Lỗi tải môn học:', error); 
    }
}

// --- HÀM LOGIC CHO FILTER POPUP ---

function toggleSubjectFilterPopup() {
    const popup = document.getElementById('subject-filter-popup');
    const btn = document.getElementById('btn-subject-filter');
    
    const isHidden = window.getComputedStyle(popup).display === 'none';
    
    if (isHidden) {
        popup.style.display = 'block';
        btn.classList.add('active');
        
        loadSubjectFilterOptions().then(() => {
            const selectKhoa = document.getElementById('subject-filter-khoa');
            const selectTinChi = document.getElementById('subject-filter-tinchi');
            
            if (selectKhoa && currentFilterState.khoa) {
                selectKhoa.value = currentFilterState.khoa;
            }
            if (selectTinChi && currentFilterState.tinChi) {
                selectTinChi.value = String(currentFilterState.tinChi);
            }
        });
    } else {
        closeSubjectFilterPopup();
    }
}

function closeSubjectFilterPopup() {
    const popup = document.getElementById('subject-filter-popup');
    const btn = document.getElementById('btn-subject-filter');
    
    popup.style.display = 'none';
    btn.classList.remove('active');
}

async function loadSubjectFilterOptions() {
    const selectKhoa = document.getElementById('subject-filter-khoa');
    const selectTinChi = document.getElementById('subject-filter-tinchi');
    
    if (selectKhoa && selectKhoa.options.length <= 1) {
        try {
            const response = await fetch('http://localhost:8000/api/users/faculties');
            const result = await response.json();
            if (result.success) {
                result.data.forEach(khoa => {
                    const option = document.createElement('option');
                    option.value = khoa.TenKhoa;
                    option.text = khoa.TenKhoa;
                    selectKhoa.appendChild(option);
                });
            }
        } catch (error) { console.error("Lỗi lấy danh sách khoa:", error); }
    }

    if (selectTinChi) {
        while (selectTinChi.options.length > 1) {
            selectTinChi.remove(1);
        }
        try {
            const response = await fetch('http://localhost:8000/api/subjects/credits');
            const result = await response.json();
            if (result.success) {
                result.data.forEach(tc => {
                    const option = document.createElement('option');
                    option.value = tc;
                    option.text = tc;
                    selectTinChi.appendChild(option);
                });
            }
        } catch (error) { console.error("Lỗi lấy danh sách tín chỉ:", error); }
    }
}

function applySubjectFilter() {
    const khoaVal = document.getElementById('subject-filter-khoa').value;
    const tinChiVal = document.getElementById('subject-filter-tinchi').value;

    currentFilterState.khoa = khoaVal;
    currentFilterState.tinChi = tinChiVal;

    fetchAndInitSubjectTable();
    closeSubjectFilterPopup();
}

document.addEventListener('click', function(event) {
    const popup = document.getElementById('subject-filter-popup');
    const btn = document.getElementById('btn-subject-filter');
    if (popup && btn && !popup.contains(event.target) && !btn.contains(event.target)) {
        closeSubjectFilterPopup();
    }
});


// --- HÀM HIỂN THỊ BẢNG & PHÂN TRANG (CORE) ---

function renderSubjectTable(page) {
    const tbody = document.getElementById('subject-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    updateSubjectDeleteButtonState();

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = allSubjectsData.slice(start, end);

    if (pageData.length === 0 && page > 1) {
        currentSubjectPage = page - 1;
        renderSubjectTable(currentSubjectPage);
        return;
    }

    pageData.forEach(sub => {
        let constraintHTML = '';
        if (sub.MaMonSongHanh) constraintHTML += `<div class="constraint-text"><span class="constraint-label">Song hành:</span> ${sub.MaMonSongHanh}</div>`;
        const monTienQuyet = sub.MonTienQuyet ? sub.MonTienQuyet.split(', ')[0] : null;
        if (monTienQuyet) constraintHTML += `<div class="constraint-text"><span class="constraint-label">Tiên quyết:</span> ${monTienQuyet}</div>`;

        const dataString = JSON.stringify(sub).replace(/"/g, '&quot;');
        const isChecked = selectedSubjectIds.has(sub.MaMon) ? 'checked' : '';

        const row = `
            <tr>
                <td style="text-align: center;"><input type="checkbox" class="subject-checkbox" value="${sub.MaMon}" ${isChecked}></td>
                <td style="font-weight: 500;">${sub.MaMon}</td>
                <td>${sub.TenMon}</td>
                <td style="text-align: center;">${sub.SoTinChi}</td>
                <td>${sub.KhoaPhuTrach}</td>
                <td>${constraintHTML}</td>
                <td style="text-align: center;">
                    <button class="action-btn edit-subject-btn" data-info="${dataString}" style="border:none; background:none; cursor:pointer; margin-right:10px;">
                        <span class="material-symbols-outlined" style="color: #3b82f6;">edit</span>
                    </button>
                    <button class="action-btn delete-subject-btn" data-id="${sub.MaMon}" style="border:none; background:none; cursor:pointer;">
                        <span class="material-symbols-outlined" style="color: #ef4444;">delete</span>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    if (typeof renderPagination === 'function') {
        renderPagination(allSubjectsData.length, rowsPerPage, page, (newPage) => {
            currentSubjectPage = newPage;
            renderSubjectTable(newPage);
        });
    }

    attachSubjectActionEvents();
    setupSubjectCheckboxes();
    updateSubjectDeleteButtonState();
}

// --- HÀM QUẢN LÝ CHECKBOX ---
function updateSelectedSubjectIds(maMon, isChecked) {
    if (isChecked) selectedSubjectIds.add(maMon);
    else selectedSubjectIds.delete(maMon);
}

function setupSubjectCheckboxes() {
    const selectAll = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.subject-checkbox');

    if (!selectAll) return;
    const allOnPageChecked = Array.from(checkboxes).length > 0 && Array.from(checkboxes).every(c => c.checked);
    selectAll.checked = allOnPageChecked;

    selectAll.onchange = function () {
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
            updateSelectedSubjectIds(cb.value, cb.checked);
        });
        updateSubjectDeleteButtonState();
    };

    checkboxes.forEach(cb => {
        cb.onchange = function () {
            updateSelectedSubjectIds(this.value, this.checked);
            if (!this.checked) selectAll.checked = false;
            else {
                const allCheckedOnPage = Array.from(checkboxes).every(c => c.checked);
                if (allCheckedOnPage) selectAll.checked = true;
            }
            updateSubjectDeleteButtonState();
        };
    });
}

function updateSubjectDeleteButtonState() {
    const deleteBtn = document.querySelector('.btn-icon-delete-subject');
    const totalCheckedCount = selectedSubjectIds.size;
    if (deleteBtn) {
        if (totalCheckedCount > 0) {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
        } else {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.5';
        }
    }
}

async function handleMultipleDelete(e) {
    e.preventDefault();
    const selectedIds = Array.from(selectedSubjectIds);
    if (selectedIds.length === 0) {
        alert('Vui lòng chọn ít nhất một môn học để xóa.');
        return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} môn học đã chọn?`)) {
        try {
            const res = await fetch(`http://localhost:8000/api/subjects/delete-multiple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maMons: selectedIds })
            });
            const result = await res.json();
            if (result.success) {
                alert(`Đã xóa thành công ${selectedIds.length} môn học!`);
                selectedSubjectIds.clear();
                fetchAndInitSubjectTable();
            } else {
                alert('Lỗi khi xóa: ' + result.message);
            }
        } catch (err) { alert('Lỗi kết nối hoặc server!'); }
    }
}

// --- HÀM XỬ LÝ SỬA & MODAL ---
function attachSubjectActionEvents() {
    document.querySelectorAll('.edit-subject-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const data = JSON.parse(e.currentTarget.dataset.info);
            await openSubjectEditModal(data);
        });
    });

    document.querySelectorAll('.delete-subject-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm(`Bạn có chắc chắn muốn xóa môn ${id}?`)) {
                try {
                    const res = await fetch(`http://localhost:8000/api/subjects/delete/${id}`, { method: 'DELETE' });
                    const result = await res.json();
                    if (result.success) {
                        alert('Đã xóa môn học!');
                        fetchAndInitSubjectTable();
                    } else {
                        alert('Lỗi: ' + result.message);
                    }
                } catch (err) { alert('Lỗi kết nối!'); }
            }
        });
    });
}

let allSubjectsForModal = []; 
let tqTomSelect = null; 

async function openSubjectEditModal(data) {
    currentSubjectId = data.MaMon; 
    await loadDataForSubjectModal(); 
    try {
        const res = await fetch(`http://localhost:8000/api/subjects/${currentSubjectId}`);
        const result = await res.json();
        if (!result.success) { alert('Không thể tải thông tin chi tiết môn học'); return; }
        const detail = result.data;

        document.getElementById('maMon').value = detail.MaMon;
        document.getElementById('maMon').disabled = true; 
        document.getElementById('tenMon').value = detail.TenMon;
        document.getElementById('soTinChi').value = detail.SoTinChi;

        const khoaSelect = document.getElementById('khoaSelect');
        khoaSelect.value = detail.KhoaPhuTrach;
        updateSubjectOptions(detail.KhoaPhuTrach);

        document.getElementById('songHanhSelect').value = detail.MaMonSongHanh || "";
        
        const tqValues = detail.MonTienQuyet ? detail.MonTienQuyet.split(',').map(s => s.trim()) : [];
        if (tqTomSelect) { tqTomSelect.setValue(tqValues); }

        const grades = detail.grades || {};
        document.getElementById('Quiz').value = grades['Quiz'] || 0;
        document.getElementById('ThiNghiem').value = grades['Thí nghiệm'] || 0;
        document.getElementById('BTL').value = grades['BTL'] || 0;
        document.getElementById('GiuaKy').value = grades['Giữa kì'] || 0;
        document.getElementById('CuoiKy').value = grades['Cuối kì'] || 0;

    } catch (err) { console.error('Lỗi tải chi tiết môn học:', err); }

    document.querySelector('#subject-modal h3').innerText = 'Cập nhật môn học';
    const btnSave = document.getElementById('btn-save-subject');
    if (btnSave) btnSave.innerText = 'Cập nhật';
    openSubjectModal();
}

async function loadDataForSubjectModal() {
    try {
        const resKhoa = await fetch('http://localhost:8000/api/users/faculties');
        const dataKhoa = await resKhoa.json();
        const khoaSelect = document.getElementById('khoaSelect');
        // Ở đây dùng cloneNode cho Modal là OK vì modal đóng mở liên tục
        const newKhoaSelect = khoaSelect.cloneNode(true);
        khoaSelect.parentNode.replaceChild(newKhoaSelect, khoaSelect);
        
        if (newKhoaSelect) {
            newKhoaSelect.innerHTML = '<option value="">-- Chọn Khoa --</option>';
            dataKhoa.data.forEach(k => {
                newKhoaSelect.innerHTML += `<option value="${k.TenKhoa}">${k.TenKhoa}</option>`;
            });
            newKhoaSelect.addEventListener('change', function() { updateSubjectOptions(this.value); });
        }

        const resMon = await fetch('http://localhost:8000/api/subjects');
        const dataMon = await resMon.json();
        allSubjectsForModal = dataMon.data || [];
        
        if (!tqTomSelect && document.getElementById('tienQuyetSelect') && typeof TomSelect !== 'undefined') {
            tqTomSelect = new TomSelect("#tienQuyetSelect", {
                plugins: ['remove_button'], create: false, placeholder: "Chọn môn tiên quyết...", maxItems: null, valueField: 'value', labelField: 'text', searchField: 'text', options: [],
                render: { option: (data, escape) => '<div>' + escape(data.text) + '</div>', item: (data, escape) => '<div>' + escape(data.text) + '</div>' }
            });
        }
        updateSubjectOptions(""); 
    } catch (err) { console.error('Lỗi tải dữ liệu modal:', err); }
}

function updateSubjectOptions(selectedKhoa) {
    const shSelect = document.getElementById('songHanhSelect');
    let filteredSubjects = allSubjectsForModal;
    if (selectedKhoa) filteredSubjects = allSubjectsForModal.filter(s => s.KhoaPhuTrach === selectedKhoa);
    if (currentSubjectId) filteredSubjects = filteredSubjects.filter(s => s.MaMon !== currentSubjectId);

    const optionsHTML = '<option value="">Chọn môn song hành...</option>' + filteredSubjects.map(m => `<option value="${m.MaMon}">${m.MaMon} - ${m.TenMon}</option>`).join('');
    if (shSelect) shSelect.innerHTML = optionsHTML;

    if (tqTomSelect) {
        tqTomSelect.clear(); tqTomSelect.clearOptions(); 
        const newOptions = filteredSubjects.map(m => ({ value: m.MaMon, text: `${m.MaMon} - ${m.TenMon}` }));
        tqTomSelect.addOption(newOptions); tqTomSelect.refreshOptions(false);
    }
}

// --- HÀM THIẾT LẬP SỰ KIỆN NÚT VÀ FORM ---
function setupAddSubjectButton() {
    const btnAdd = document.querySelector('#btn-add-subject'); 
    if (btnAdd) {
        btnAdd.addEventListener('click', async (e) => {
            e.preventDefault();
            currentSubjectId = null; 
            document.getElementById('modal-add-subject-form').reset();
            if (tqTomSelect) tqTomSelect.clear(); 
            document.getElementById('maMon').disabled = false;
            document.querySelector('#subject-modal h3').innerText = 'Thêm môn học';
            const btnSave = document.getElementById('btn-save-subject');
            if (btnSave) btnSave.innerText = 'Lưu';
            await loadDataForSubjectModal(); 
            openSubjectModal();
        });
    }

    const btnDelete = document.querySelector('.btn-icon-delete-subject');
    if (btnDelete) btnDelete.addEventListener('click', handleMultipleDelete);
    updateSubjectDeleteButtonState();
}

function setupAddSubjectForm() {
    const form = document.getElementById('modal-add-subject-form');
    if (!form) return;
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let maMonTienQuyet = "";
        if (tqTomSelect) maMonTienQuyet = tqTomSelect.getValue().join(',');
        else {
            const tqSelect = document.getElementById('tienQuyetSelect');
            const selectedTQ = Array.from(tqSelect.selectedOptions).map(opt => opt.value).filter(v => v !== "");
            maMonTienQuyet = selectedTQ.join(',');
        }

        const data = {
            maMon: document.getElementById('maMon').value,
            tenMon: document.getElementById('tenMon').value,
            soTinChi: document.getElementById('soTinChi').value,
            khoa: document.getElementById('khoaSelect').value,
            maMonTienQuyet: maMonTienQuyet,
            maMonSongHanh: document.getElementById('songHanhSelect').value,
            grades: {
                Quiz: parseInt(document.getElementById('Quiz').value) || 0,
                ThiNghiem: parseInt(document.getElementById('ThiNghiem').value) || 0,
                BTL: parseInt(document.getElementById('BTL').value) || 0,
                GiuaKy: parseInt(document.getElementById('GiuaKy').value) || 0,
                CuoiKy: parseInt(document.getElementById('CuoiKy').value) || 0
            }
        };

        let url = 'http://localhost:8000/api/subjects/create';
        let method = 'POST';
        if (currentSubjectId) {
            url = `http://localhost:8000/api/subjects/update/${currentSubjectId}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const result = await response.json();
            if (result.success) {
                alert(currentSubjectId ? 'Cập nhật thành công!' : 'Thêm thành công!');
                closeSubjectModal();
                fetchAndInitSubjectTable();
            } else { alert('Lỗi: ' + result.message); }
        } catch (error) { console.error(error); alert('Lỗi kết nối server'); }
    });
}

window.openSubjectModal = function () { document.getElementById('subject-modal').classList.add('active'); }
window.closeSubjectModal = function () { document.getElementById('subject-modal').classList.remove('active'); }


// --- UTILITIES & INIT ---

/** Biến cờ: Đánh dấu xem trang Môn học đã được khởi tạo chưa */
let isSubjectPageInitialized = false; 

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/** Hàm khởi tạo chính */
function initSubjectPage() {
    const searchInput = document.getElementById('subject-search-input');
    
    // Double check: Nếu không có input thì thoát ngay
    if (!searchInput) return;

    console.log("--> Bắt đầu khởi tạo logic trang Môn học");

    // 1. Tải dữ liệu bảng (Chỉ chạy 1 lần khi init)
    fetchAndInitSubjectTable();
    
    // 2. Setup nút Thêm và Form
    setupAddSubjectButton(); 
    setupAddSubjectForm();   

    // 3. Xử lý Tìm kiếm (Auto Search)
    const handleAutoSearch = debounce((e) => {
        // Chỉ gọi tìm kiếm, không gọi lại initSubjectPage
        fetchAndInitSubjectTable();
    }, 500);

    // Gỡ sự kiện cũ trước khi gán mới (để an toàn)
    searchInput.removeEventListener('input', handleAutoSearch);
    searchInput.addEventListener('input', handleAutoSearch);

    // Sự kiện Enter
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            fetchAndInitSubjectTable(); 
        }
    });
}

// --- LOGIC TỰ ĐỘNG PHÁT HIỆN TRANG ---

const contentArea = document.querySelector('.content-area');

if (contentArea) {
    const observer = new MutationObserver(() => {
        const searchInput = document.getElementById('subject-search-input');
        
        if (searchInput) {
            if (!isSubjectPageInitialized) {
                isSubjectPageInitialized = true;
                initSubjectPage();
            }

        } else {
            isSubjectPageInitialized = false; 
        }
    });
    observer.observe(contentArea, { childList: true, subtree: true });
}

const initialSearchInput = document.getElementById('subject-search-input');
if (initialSearchInput && !isSubjectPageInitialized) {
    isSubjectPageInitialized = true;
    initSubjectPage();
}