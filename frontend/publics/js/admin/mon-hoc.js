let allSubjectsData = [];
let currentSubjectPage = 1;
let currentSubjectId = null;
const rowsPerPage = 7;
const selectedSubjectIds = new Set();

// --- HÀM TẢI VÀ KHỞI TẠO DỮ LIỆU ---

/**
 * Tải dữ liệu môn học từ API và khởi tạo bảng.
 */
async function fetchAndInitSubjectTable() {
    try {
        const response = await fetch('http://localhost:8000/api/subjects');
        const result = await response.json();
        if (result.success) {
            allSubjectsData = result.data;
            currentSubjectPage = 1;
            selectedSubjectIds.clear(); // Clear selected IDs when reloading data
            renderSubjectTable(currentSubjectPage);
        }
    } catch (error) { console.error('Lỗi tải môn học:', error); }
}

// --- HÀM HIỂN THỊ BẢNG & PHÂN TRANG (CORE) ---

/**
 * Hàm hiển thị bảng môn học với phân trang và ghi nhớ trạng thái checkbox.
 */
function renderSubjectTable(page) {
    const tbody = document.getElementById('subject-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    updateSubjectDeleteButtonState();

    // Tính toán vị trí
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = allSubjectsData.slice(start, end);

    // LOGIC: Nếu trang hiện tại không còn dữ liệu (do xóa) và không phải trang 1 -> lùi về trang trước
    if (pageData.length === 0 && page > 1) {
        currentSubjectPage = page - 1;
        renderSubjectTable(currentSubjectPage);
        return;
    }

    pageData.forEach(sub => {
        let constraintHTML = '';
        if (sub.MaMonSongHanh) constraintHTML += `<div class="constraint-text"><span class="constraint-label">Song hành:</span> ${sub.MaMonSongHanh}</div>`;

        // Lấy mã môn tiên quyết (loại bỏ tên môn đi kèm nếu có)
        const monTienQuyet = sub.MonTienQuyet ? sub.MonTienQuyet.split(', ')[0] : null;
        if (monTienQuyet) constraintHTML += `<div class="constraint-text"><span class="constraint-label">Tiên quyết:</span> ${monTienQuyet}</div>`;

        // Chuẩn bị dữ liệu cho nút sửa
        const dataString = JSON.stringify(sub).replace(/"/g, '&quot;');

        // KIỂM TRA TRẠNG THÁI GHI NHỚ TRÊN TỪNG DÒNG
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

    // Gọi hàm render phân trang (giả định hàm này tồn tại ngoài code này)
    if (typeof renderPagination === 'function') {
        renderPagination(allSubjectsData.length, rowsPerPage, page, (newPage) => {
            currentSubjectPage = newPage;
            renderSubjectTable(newPage);
        });
    }

    attachSubjectActionEvents();
    setupSubjectCheckboxes(); // Thiết lập sự kiện và trạng thái cho checkbox
    updateSubjectDeleteButtonState();
}

// --- HÀM QUẢN LÝ CHECKBOX VÀ XÓA HÀNG LOẠT ---

/**
 * Cập nhật trạng thái của MaMon trong Set ghi nhớ.
 */
function updateSelectedSubjectIds(maMon, isChecked) {
    if (isChecked) {
        selectedSubjectIds.add(maMon);
    } else {
        selectedSubjectIds.delete(maMon);
    }
}

/**
 * Thiết lập sự kiện cho checkbox Chọn Tất Cả và các checkbox từng dòng.
 */
function setupSubjectCheckboxes() {
    const selectAll = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.subject-checkbox');

    if (!selectAll) return;

    // 💡 Đặt trạng thái ban đầu cho "Chọn Tất Cả" (Chỉ dựa trên các mục HIỂN THỊ)
    const allOnPageChecked = Array.from(checkboxes).length > 0 && Array.from(checkboxes).every(c => c.checked);
    selectAll.checked = allOnPageChecked;


    // Sự kiện cho nút Chọn Tất Cả
    selectAll.onchange = function () {
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
            updateSelectedSubjectIds(cb.value, cb.checked); // Ghi nhớ/bỏ ghi nhớ
        });
        updateSubjectDeleteButtonState();
    };

    // Sự kiện cho từng checkbox
    checkboxes.forEach(cb => {
        cb.onchange = function () {
            updateSelectedSubjectIds(this.value, this.checked);

            if (!this.checked) {
                // Nếu một checkbox bị bỏ chọn, bỏ chọn "Chọn Tất Cả"
                selectAll.checked = false;
            } else {
                // Kiểm tra xem tất cả các checkbox HIỂN THỊ trên trang hiện tại đã được chọn chưa
                const allCheckedOnPage = Array.from(checkboxes).every(c => c.checked);
                if (allCheckedOnPage) selectAll.checked = true;
            }
            updateSubjectDeleteButtonState();
        };
    });
}

/**
 * Vô hiệu hóa/Kích hoạt nút Xóa dựa trên số lượng mục đã chọn.
 */
function updateSubjectDeleteButtonState() {
    const deleteBtn = document.querySelector('.btn-icon-delete-subject');
    const totalCheckedCount = selectedSubjectIds.size; // Dùng Set để lấy tổng số mục đã chọn

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

/**
 * Xử lý việc xóa nhiều môn học đã được chọn.
 */
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
                selectedSubjectIds.clear(); // Xóa sạch Set sau khi xóa thành công
                fetchAndInitSubjectTable();
            } else {
                alert('Lỗi khi xóa: ' + result.message);
            }
        } catch (err) { alert('Lỗi kết nối hoặc server!'); }
    }
}

// --- HÀM XỬ LÝ SỬA & MODAL ---

/**
 * Gắn sự kiện cho các nút Sửa và Xóa trong bảng.
 */
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

/**
 * Mở modal sửa môn học với dữ liệu đã cho.
 */
async function openSubjectEditModal(data) {
    currentSubjectId = data.MaMon; // SET MODE SỬA

    await loadDataForSubjectModal(); // Tải danh sách khoa và môn học

    document.getElementById('maMon').value = data.MaMon;
    document.getElementById('maMon').disabled = true; // Không cho sửa Mã môn khi cập nhật
    document.getElementById('tenMon').value = data.TenMon;
    document.getElementById('soTinChi').value = data.SoTinChi;

    document.getElementById('khoaSelect').value = data.KhoaPhuTrach;
    document.getElementById('songHanhSelect').value = data.MaMonSongHanh || "";
    // Lấy mã môn tiên quyết
    const tq = data.MonTienQuyet ? data.MonTienQuyet.split(', ')[0] : "";
    document.getElementById('tienQuyetSelect').value = tq;

    document.querySelector('#subject-modal h3').innerText = 'Cập nhật môn học';
    const btnSave = document.getElementById('btn-save-subject');
    if (btnSave) btnSave.innerText = 'Cập nhật';

    openSubjectModal();
}

/**
 * Tải dữ liệu cần thiết cho modal Thêm/Cập nhật (Khoa, Môn học).
 */
async function loadDataForSubjectModal() {
    try {
        // Tải danh sách Khoa
        const resKhoa = await fetch('http://localhost:8000/api/users/faculties');
        const dataKhoa = await resKhoa.json();
        const khoaSelect = document.getElementById('khoaSelect');
        if (khoaSelect) {
            khoaSelect.innerHTML = '<option value="">-- Chọn Khoa --</option>';
            dataKhoa.data.forEach(k => {
                // Dùng TenKhoa làm value
                khoaSelect.innerHTML += `<option value="${k.TenKhoa}">${k.TenKhoa}</option>`;
            });
        }

        // Tải danh sách Môn học (cho Tiên Quyết & Song Hành)
        const resMon = await fetch('http://localhost:8000/api/subjects');
        const dataMon = await resMon.json();
        const options = '<option value="">(Không có)</option>' +
            dataMon.data.map(m => `<option value="${m.MaMon}">${m.MaMon} - ${m.TenMon}</option>`).join('');

        const tqSelect = document.getElementById('tienQuyetSelect');
        const shSelect = document.getElementById('songHanhSelect');
        if (tqSelect) tqSelect.innerHTML = options;
        if (shSelect) shSelect.innerHTML = options;

    } catch (err) { console.error('Lỗi tải dữ liệu modal:', err); }
}

// --- HÀM THIẾT LẬP SỰ KIỆN NÚT VÀ FORM ---

/**
 * Thiết lập sự kiện cho nút Thêm môn học và Xóa môn học.
 */
function setupAddSubjectButton() {
    // Thêm môn học
    const btnAdd = document.querySelector('.btn-blue');
    if (btnAdd) {
        btnAdd.addEventListener('click', async (e) => {
            e.preventDefault();
            currentSubjectId = null; // SET MODE THÊM MỚI

            document.getElementById('modal-add-subject-form').reset();
            document.getElementById('maMon').disabled = false;
            document.querySelector('#subject-modal h3').innerText = 'Thêm môn học';
            const btnSave = document.getElementById('btn-save-subject');
            if (btnSave) btnSave.innerText = 'Lưu';

            await loadDataForSubjectModal(); // Tải dữ liệu cho form rỗng
            openSubjectModal();
        });
    }

    // Xóa môn học hàng loạt
    const btnDelete = document.querySelector('.btn-icon-delete-subject');
    if (btnDelete) {
        // Gắn sự kiện Xóa hàng loạt đã được sửa
        btnDelete.addEventListener('click', handleMultipleDelete);
    }

    updateSubjectDeleteButtonState();
}

/**
 * Thiết lập sự kiện cho form Thêm/Cập nhật môn học.
 */
function setupAddSubjectForm() {
    const form = document.getElementById('modal-add-subject-form');
    if (!form) return;

    // Clone và replace form để tránh sự kiện submit bị đính kèm nhiều lần
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            maMon: document.getElementById('maMon').value,
            tenMon: document.getElementById('tenMon').value,
            soTinChi: document.getElementById('soTinChi').value,
            khoa: document.getElementById('khoaSelect').value,
            maMonTienQuyet: document.getElementById('tienQuyetSelect').value,
            maMonSongHanh: document.getElementById('songHanhSelect').value
        };

        let url = 'http://localhost:8000/api/subjects/create';
        let method = 'POST';

        if (currentSubjectId) {
            url = `http://localhost:8000/api/subjects/update/${currentSubjectId}`;
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
                alert(currentSubjectId ? 'Cập nhật thành công!' : 'Thêm thành công!');
                closeSubjectModal();
                fetchAndInitSubjectTable();
            } else {
                alert('❌ Lỗi: ' + result.message);
            }
        } catch (error) { console.error(error); alert('Lỗi kết nối server'); }
    });
}

// --- HÀM MỞ/ĐÓNG MODAL ---

/** Mở modal môn học. */
window.openSubjectModal = function () {
    document.getElementById('subject-modal').classList.add('active');
}

/** Đóng modal môn học. */
window.closeSubjectModal = function () {
    document.getElementById('subject-modal').classList.remove('active');
}


// --- KHỞI TẠO BAN ĐẦU ---

// Giả định bạn gọi các hàm này khi DOMContentLoaded hoặc khi trang sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    fetchAndInitSubjectTable();
    setupAddSubjectButton(); // Thiết lập sự kiện cho nút Thêm/Xóa
    setupAddSubjectForm();   // Thiết lập sự kiện cho form
});

// --- EXPORT (Nếu cần truy cập từ console hoặc file khác) ---

if (typeof window !== 'undefined') {
    window.allSubjectsData = allSubjectsData;
    Object.defineProperty(window, 'currentSubjectPage', { get: () => currentSubjectPage });
    Object.defineProperty(window, 'currentSubjectId', { get: () => currentSubjectId });
    window.fetchAndInitSubjectTable = fetchAndInitSubjectTable;
    window.renderSubjectTable = renderSubjectTable;
    window.setupAddSubjectButton = setupAddSubjectButton;
    window.setupAddSubjectForm = setupAddSubjectForm;
    window.openSubjectModal = window.openSubjectModal;
    window.closeSubjectModal = window.closeSubjectModal;
    window.updateSelectedSubjectIds = updateSelectedSubjectIds; // Export hàm quản lý Set
    window.selectedSubjectIds = selectedSubjectIds; // Export Set
}