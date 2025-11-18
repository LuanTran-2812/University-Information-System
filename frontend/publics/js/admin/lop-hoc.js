let isClassEditMode = false;
let currentSemesterId = ""; 

// BIẾN PHÂN TRANG CHO LỚP HỌC
let allClassesData = [];
let currentClassPage = 1;

// --- 1. HÀM KHỞI TẠO CHÍNH ---
async function initClassPage() {
    allClassesData = [];
    currentSemesterId = "";
    
    const tbody = document.getElementById('class-table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Vui lòng chọn Học kỳ trên thanh công cụ để xem lớp học.</td></tr>';
    }

    await loadSemestersToCustomFilter();

    setupAddClassButton();
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
            
            // Lấy lại trigger mới sau khi clone để gắn sự kiện
            const currentTrigger = document.getElementById('semester-trigger');
            const currentTextDisplay = document.getElementById('selected-semester-text');

            currentTrigger.addEventListener('click', function(e) {
                wrapper.classList.toggle('open');
                e.stopPropagation();
            });

            // Đóng menu khi click ra ngoài
            window.addEventListener('click', function(e) {
                if (!wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });

            // B. Tạo danh sách Option từ API
            result.data.forEach(hk => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-option'; 
                optionDiv.dataset.value = hk.MaHocKy;
                optionDiv.textContent = `${hk.MaHocKy} (${hk.NamHoc})`;

                // === SỰ KIỆN KHI CHỌN MỘT HỌC KỲ ===
                optionDiv.addEventListener('click', function() {
                    currentTextDisplay.textContent = this.textContent; 
                    
                    currentTrigger.classList.add('selected');

                    wrapper.classList.remove('open');
                    
                    document.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');

                    currentSemesterId = this.dataset.value;
                    if (hiddenInput) hiddenInput.value = currentSemesterId;
                    fetchAndInitClassTable(currentSemesterId);
                });

                optionsContainer.appendChild(optionDiv);
            });
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
            // Lưu dữ liệu vào biến toàn cục
            allClassesData = result.data;
            currentClassPage = 1; // Reset về trang 1
            
            // Gọi hàm vẽ bảng
            renderClassTable(currentClassPage);
        }
    } catch (err) { console.error(err); }
}

// 4. Hàm Vẽ Bảng (Cắt 10 dòng)
function renderClassTable(page) {
    const ROWS_PER_PAGE = 7;
    const tbody = document.getElementById('class-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Xử lý trường hợp không có dữ liệu
    if (allClassesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Không có lớp học nào trong học kỳ này.</td></tr>';
        const paginationEl = document.querySelector('.pagination');
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = allClassesData.slice(start, end);

    // LOGIC MỚI: Lùi trang nếu trang hiện tại rỗng
    if (pageData.length === 0 && page > 1) {
        currentClassPage = page - 1;
        renderClassTable(currentClassPage);
        return;
    }

    pageData.forEach(cls => {
        let badgeClass = 'grey';
        const status = cls.TrangThai || 'Chưa xếp lịch';
        
        if (status.includes('Đang học')) badgeClass = 'green';
        else if (status.includes('Đã kết thúc')) badgeClass = 'red';
        else if (status.includes('Đang đăng ký')) badgeClass = 'blue';

        const dataString = JSON.stringify(cls).replace(/"/g, '&quot;');

        const row = `
            <tr>
                <td style="text-align: center;"><input type="checkbox"></td>
                <td>${cls.MaLopHoc}</td>
                <td>${cls.TenMon || 'N/A'}</td>
                <td>${cls.TenGiangVien || '<span style="color:#999; font-style:italic;">Chưa phân công</span>'}</td>
                <td>${cls.SiSoHienTai} / ${cls.SiSoToiDa}</td>
                <td><span class="badge ${badgeClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; color: #fff; background-color: ${getBadgeColor(badgeClass)}">${status}</span></td>
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
    
    if (typeof renderPagination === 'function') {
        renderPagination(allClassesData.length, ROWS_PER_PAGE, page, (newPage) => {
            currentClassPage = newPage;
            renderClassTable(newPage);
        });
    }
}

function attachClassActionEvents() {
    // Sửa
    document.querySelectorAll('.edit-class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const data = JSON.parse(e.currentTarget.dataset.info);
            openClassEditModal(data);
        });
    });

    // Xóa (Dùng Query Params theo logic gốc)
    document.querySelectorAll('.delete-class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const maLop = e.currentTarget.dataset.id;
            const maMon = e.currentTarget.dataset.mon;
            // Học kỳ lấy từ biến toàn cục currentSemesterId
            
            if (confirm(`Bạn có chắc chắn muốn xóa lớp ${maLop} môn ${maMon}?`)) {
                try {
                    const url = `http://localhost:8000/api/classes/delete?maLop=${maLop}&maHK=${currentSemesterId}&maMon=${maMon}`;
                    const res = await fetch(url, { method: 'DELETE' });
                    const result = await res.json();
                    
                    if (result.success) {
                        alert('Đã xóa thành công!');
                        fetchAndInitClassTable(currentSemesterId);
                    } else {
                        alert('Lỗi: ' + result.message);
                    }
                } catch (err) { alert('Lỗi kết nối!'); }
            }
        });
    });
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
            isClassEditMode = false;
            
            // Reset form
            document.getElementById('modal-add-class-form').reset();
            document.getElementById('maLop').disabled = false; // Mở khóa Mã lớp
            document.getElementById('classMonHocSelect').disabled = false; // Mở khóa Môn (vì khóa chính k sửa đc)
            
            document.querySelector('#class-modal h3').innerText = 'Thêm lớp học';
            document.getElementById('btn-save-class').innerText = 'Lưu';
            
            await loadDataForClassModal(); // Tải danh sách môn/GV mới nhất
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
            // Khi sửa, ta gọi API update/:id (id ở đây là maLop) theo logic gốc
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

// === HÀM HỖ TRỢ TÔ MÀU BADGE (DÙNG CHUNG) ===
function getBadgeColor(type) {
    const colors = {
        'blue': '#3b82f6',   // Xanh dương (Đang đăng ký)
        'green': '#22c55e',  // Xanh lá (Đang học)
        'red': '#ef4444',    // Đỏ (Đã kết thúc)
        'orange': '#f97316', // Cam (Sắp mở)
        'grey': '#9ca3af'    // Xám (Mặc định)
    };
    return colors[type] || '#9ca3af';
}

// Export (phản ánh trạng thái động giống logic gốc)
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'isClassEditMode', { get: () => isClassEditMode });
    Object.defineProperty(window, 'currentSemesterId', { get: () => currentSemesterId });
    window.allClassesData = allClassesData; // tham chiếu mảng trực tiếp
    Object.defineProperty(window, 'currentClassPage', { get: () => currentClassPage });
    window.initClassPage = initClassPage;
    window.renderClassTable = renderClassTable;
}