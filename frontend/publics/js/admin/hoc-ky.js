let isSemesterEditMode = false; // Biến cờ cho học kỳ

async function loadSemesterList() {
    try {
        const response = await fetch('http://localhost:8000/api/semesters');
        const result = await response.json();

        if (result.success) {
            const tbody = document.getElementById('semester-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';

            result.data.forEach(hk => {
                const rawDate = (d) => d ? d.split('T')[0] : '';
                const displayDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

                let badgeClass = 'grey';
                const status = hk.TrangThai || '';
                if (status.includes('Mở đăng ký')) badgeClass = 'blue';
                else if (status.includes('Đang diễn ra')) badgeClass = 'green';
                else if (status.includes('Đã đóng')) badgeClass = 'red';
                else if (status.includes('Kết thúc')) badgeClass = 'orange';

                const dataString = JSON.stringify({
                    MaHocKy: hk.MaHocKy, NamHoc: hk.NamHoc,
                    NgayBatDau: rawDate(hk.NgayBatDau), NgayKetThuc: rawDate(hk.NgayKetThuc),
                    MoDangKy: rawDate(hk.MoDangKy), DongDangKy: rawDate(hk.DongDangKy),
                    DaKhoa: hk.DaKhoa
                }).replace(/"/g, '&quot;');

                const row = `
                    <tr>
                        <td style="font-weight:500;">${hk.MaHocKy}</td>
                        <td>${hk.NamHoc}</td>
                        <td>${displayDate(hk.NgayBatDau)}</td>
                        <td>${displayDate(hk.NgayKetThuc)}</td>
                        <td>${displayDate(hk.MoDangKy)} - ${displayDate(hk.DongDangKy)}</td>
                        <td><span class="badge ${badgeClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #fff; background-color: ${getBadgeColor(badgeClass)}">${status}</span></td>
                        <td style="text-align: center;">
                            <button class="action-btn edit-semester-btn" data-info="${dataString}" style="border:none; background:none; cursor:pointer; margin-right:10px;"><span class="material-symbols-outlined">edit</span></button>
                            <button class="action-btn delete-semester-btn" data-id="${hk.MaHocKy}" style="border:none; background:none; cursor:pointer;"><span class="material-symbols-outlined" style="color: #ef4444;">delete</span></button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
            attachSemesterActionEvents();
        }
    } catch (error) { console.error('Lỗi tải học kỳ:', error); }
}

function getBadgeColor(type) {
    const colors = { 'blue': '#3b82f6', 'green': '#22c55e', 'red': '#ef4444', 'orange': '#f97316', 'grey': '#9ca3af' };
    return colors[type] || '#9ca3af';
}

function attachSemesterActionEvents() {
    document.querySelectorAll('.edit-semester-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const data = JSON.parse(e.currentTarget.dataset.info);
            openSemesterEditModal(data);
        });
    });
    document.querySelectorAll('.delete-semester-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm(`Xóa học kỳ ${id}?`)) {
                try {
                    // Endpoint /delete/ theo logic gốc + phản hồi kết quả
                    const res = await fetch(`http://localhost:8000/api/semesters/delete/${id}`, { method: 'DELETE' });
                    let ok = true; let result = null;
                    try { result = await res.json(); } catch(_) { ok = false; }
                    if (ok && result && result.success) {
                        alert('Đã xóa học kỳ!');
                    } else {
                        alert('Lỗi xóa học kỳ' + (result && result.message ? ': ' + result.message : '')); 
                    }
                    loadSemesterList(); // Refresh danh sách
                } catch (err) { alert('Lỗi kết nối!'); }
            }
        });
    });
}

function setupAddSemesterButton() {
    const btnAdd = document.querySelector('.btn-add-semester'); 
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            isSemesterEditMode = false;
            document.getElementById('modal-add-semester-form').reset();
            document.getElementById('maHK').disabled = false;
            document.querySelector('#semester-modal h3').innerText = 'Thêm học kỳ';
            openSemesterModal();
        });
    }
}

function openSemesterEditModal(data) {
    isSemesterEditMode = true;
    document.getElementById('editing-semester-id').value = data.MaHocKy;
    document.getElementById('maHK').value = data.MaHocKy;
    document.getElementById('maHK').disabled = true;
    document.getElementById('namHoc').value = data.NamHoc;
    document.getElementById('ngayBatDau').value = data.NgayBatDau;
    document.getElementById('ngayKetThuc').value = data.NgayKetThuc;
    document.getElementById('moDangKy').value = data.MoDangKy;
    document.getElementById('dongDangKy').value = data.DongDangKy;
    document.getElementById('daKhoa').checked = data.DaKhoa;
    document.querySelector('#semester-modal h3').innerText = 'Cập nhật học kỳ';
    openSemesterModal();
}

function setupAddSemesterForm() {
    const form = document.getElementById('modal-add-semester-form');
    if (!form) return;

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            maHK: document.getElementById('maHK').value,
            namHoc: document.getElementById('namHoc').value,
            ngayBatDau: document.getElementById('ngayBatDau').value,
            ngayKetThuc: document.getElementById('ngayKetThuc').value,
            moDangKy: document.getElementById('moDangKy').value,
            dongDangKy: document.getElementById('dongDangKy').value,
            daKhoa: document.getElementById('daKhoa').checked ? 1 : 0
        };

        let url = 'http://localhost:8000/api/semesters/create';
        let method = 'POST';
        if (isSemesterEditMode) {
            // Endpoint /update/ theo logic gốc
            url = `http://localhost:8000/api/semesters/update/${data.maHK}`;
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
                alert(isSemesterEditMode ? 'Cập nhật thành công!' : 'Thêm thành công!');
                closeSemesterModal();
                loadSemesterList();
            } else { alert('❌ ' + result.message); }
        } catch (error) { console.error(error); }
    });
}

window.openSemesterModal = function() { document.getElementById('semester-modal').classList.add('active'); }
window.closeSemesterModal = function() { document.getElementById('semester-modal').classList.remove('active'); }

// Export
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'isSemesterEditMode', { get: () => isSemesterEditMode });
    window.loadSemesterList = loadSemesterList;
    window.setupAddSemesterButton = setupAddSemesterButton;
    window.setupAddSemesterForm = setupAddSemesterForm;
}