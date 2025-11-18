let allSubjectsData = [];
let currentSubjectPage = 1;
let currentSubjectId = null; // null = Thêm mới, có giá trị = Sửa
const rowsPerPage = 7;

async function fetchAndInitSubjectTable() {
    try {
        const response = await fetch('http://localhost:8000/api/subjects');
        const result = await response.json();
        if (result.success) {
            allSubjectsData = result.data;
            currentSubjectPage = 1;
            renderSubjectTable(currentSubjectPage);
        }
    } catch (error) { console.error('Lỗi tải môn học:', error); }
}

function renderSubjectTable(page) {
    const tbody = document.getElementById('subject-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Tính toán vị trí
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = allSubjectsData.slice(start, end);

    // LOGIC MỚI: Nếu trang hiện tại không còn dữ liệu (do xóa) và không phải trang 1 -> lùi về trang trước
    if (pageData.length === 0 && page > 1) {
        currentSubjectPage = page - 1;
        renderSubjectTable(currentSubjectPage);
        return;
    }

    pageData.forEach(sub => {
        let constraintHTML = '';
        if (sub.MaMonSongHanh) constraintHTML += `<div class="constraint-text"><span class="constraint-label">Song hành:</span> ${sub.MaMonSongHanh}</div>`;
        if (sub.MonTienQuyet) constraintHTML += `<div class="constraint-text"><span class="constraint-label">Tiên quyết:</span> ${sub.MonTienQuyet}</div>`;

        const dataString = JSON.stringify(sub).replace(/"/g, '&quot;');

        const row = `
            <tr>
                <td style="text-align: center;"><input type="checkbox" class="custom-checkbox"></td>
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
}

function attachSubjectActionEvents() {
    // Sửa
    document.querySelectorAll('.edit-subject-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const data = JSON.parse(e.currentTarget.dataset.info);
            await openSubjectEditModal(data);
        });
    });
    // Xóa (Endpoint /delete/ theo logic gốc)
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

async function openSubjectEditModal(data) {
    currentSubjectId = data.MaMon; // SET MODE SỬA
    
    await loadDataForSubjectModal();

    document.getElementById('maMon').value = data.MaMon;
    document.getElementById('maMon').disabled = true; 
    document.getElementById('tenMon').value = data.TenMon;
    document.getElementById('soTinChi').value = data.SoTinChi;
    
    document.getElementById('khoaSelect').value = data.KhoaPhuTrach;
    document.getElementById('songHanhSelect').value = data.MaMonSongHanh || "";
    const tq = data.MonTienQuyet ? data.MonTienQuyet.split(', ')[0] : "";
    document.getElementById('tienQuyetSelect').value = tq;

    document.querySelector('#subject-modal h3').innerText = 'Cập nhật môn học';
    const btnSave = document.getElementById('btn-save-subject');
    if(btnSave) btnSave.innerText = 'Cập nhật';
    
    openSubjectModal();
}

function setupAddSubjectButton() {
    const btnAdd = document.querySelector('.btn-blue'); 
    if (btnAdd) {
        btnAdd.addEventListener('click', (e) => {
            e.preventDefault();
            currentSubjectId = null; // SET MODE THÊM MỚI
            
            document.getElementById('modal-add-subject-form').reset();
            document.getElementById('maMon').disabled = false;
            document.querySelector('#subject-modal h3').innerText = 'Thêm môn học';
            const btnSave = document.getElementById('btn-save-subject');
            if(btnSave) btnSave.innerText = 'Lưu';
            
            openSubjectModal();
        });
    }
}

function setupAddSubjectForm() {
    const form = document.getElementById('modal-add-subject-form');
    if (!form) return;

    
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
            // Endpoint /update/ theo logic gốc
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

async function loadDataForSubjectModal() {
    try {
        // API Tải khoa: /api/users/faculties theo logic gốc
        const resKhoa = await fetch('http://localhost:8000/api/users/faculties');
        const dataKhoa = await resKhoa.json();
        const khoaSelect = document.getElementById('khoaSelect');
        if (khoaSelect) {
            khoaSelect.innerHTML = '<option value="">-- Chọn Khoa --</option>';
            dataKhoa.data.forEach(k => {
                // Dùng TenKhoa làm value theo logic gốc
                khoaSelect.innerHTML += `<option value="${k.TenKhoa}">${k.TenKhoa}</option>`;
            });
        }

        const resMon = await fetch('http://localhost:8000/api/subjects');
        const dataMon = await resMon.json();
        const options = '<option value="">(Không có)</option>' + 
            dataMon.data.map(m => `<option value="${m.MaMon}">${m.MaMon} - ${m.TenMon}</option>`).join('');
        
        const tqSelect = document.getElementById('tienQuyetSelect');
        const shSelect = document.getElementById('songHanhSelect');
        if (tqSelect) tqSelect.innerHTML = options;
        if (shSelect) shSelect.innerHTML = options;

    } catch (err) { console.error(err); }
}

window.openSubjectModal = function() { 
    document.getElementById('subject-modal').classList.add('active'); 
    if(!currentSubjectId) loadDataForSubjectModal(); 
}
window.closeSubjectModal = function() { document.getElementById('subject-modal').classList.remove('active'); }

// Export (giữ logic gốc; dùng getter để luôn phản ánh giá trị mới nhất)
if (typeof window !== 'undefined') {
    window.allSubjectsData = allSubjectsData; // Array tham chiếu trực tiếp
    Object.defineProperty(window, 'currentSubjectPage', { get: () => currentSubjectPage });
    Object.defineProperty(window, 'currentSubjectId', { get: () => currentSubjectId });
    window.fetchAndInitSubjectTable = fetchAndInitSubjectTable;
    window.renderSubjectTable = renderSubjectTable;
    window.setupAddSubjectButton = setupAddSubjectButton;
    window.setupAddSubjectForm = setupAddSubjectForm;
    window.openSubjectModal = window.openSubjectModal;
    window.closeSubjectModal = window.closeSubjectModal;
}