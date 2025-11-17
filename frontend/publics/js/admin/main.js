// frontend/publics/js/admin/main.js 

document.addEventListener("DOMContentLoaded", () => {
    const pageTitleSlot = document.getElementById("page-title");
    const controlsSlot = document.getElementById("dynamic-controls-slot");
    const contentAreaSlot = document.querySelector(".content-area");
    const navLinks = document.querySelectorAll(".main-nav .nav-link");

    // --- BIẾN TOÀN CỤC (GLOBAL VARIABLES) ---
    // 1. Người dùng
    let allUsersData = [];
    let currentPage = 1;
    // 2. Môn học
    let allSubjectsData = []; 
    let currentSubjectPage = 1;
    let currentSubjectId = null; // null = Thêm mới, có giá trị = Sửa
    // 3. Học kỳ
    let isSemesterEditMode = false; // Biến cờ cho học kỳ

    const rowsPerPage = 10;

    // ============================================================
    // 1. CÁC HÀM CỐT LÕI (CORE FUNCTIONS)
    // ============================================================

    async function fetchHtml(url) {
        if (!url) return "";
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Tải ${url} thất bại`);
            return await response.text();
        } catch (error) {
            console.error("Fetch error:", error);
            return "<p>Lỗi tải nội dung.</p>";
        }
    }

    async function loadPage(pageUrl, controlsUrl, title) {
        contentAreaSlot.innerHTML = "<h2>Đang tải...</h2>";
        
        try {
            const [pageHtml, controlsHtml] = await Promise.all([
                fetchHtml(pageUrl),
                fetchHtml(controlsUrl)
            ]);

            pageTitleSlot.innerText = title;
            controlsSlot.innerHTML = controlsHtml;
            contentAreaSlot.innerHTML = pageHtml;

            // --- ROUTING: GỌI LOGIC TƯƠNG ỨNG VỚI TỪNG TRANG ---
            
            if (pageUrl.includes('trang-chu.html')) {
                updateDashboardStats();
            }

            if (pageUrl.includes('nguoi-dung.html')) {
                fetchAndInitUserTable();
                setupAddButton(); 
            }

            if (pageUrl.includes('them-nguoi-dung.html')) {
                
                await loadFacultiesToDropdown(); 
                setupAddUserForm();
            }

            if (pageUrl.includes('chi-tiet-nguoi-dung.html')) {
                loadUserDetail();
            }

            if (pageUrl.includes('hoc-ky.html')) {
                loadSemesterList();
                setupAddSemesterButton();
                setupAddSemesterForm();
            }

            if (pageUrl.includes('mon-hoc.html')) {
                fetchAndInitSubjectTable();
                setupAddSubjectButton();
                setupAddSubjectForm();
            }

            if (pageUrl.includes('lop-hoc.html')) {
                initClassPage(); 
            }

            if (pageUrl.includes('lich-hoc.html')) {
                initSchedulePage();
            }

        } catch (error) {
            console.error("Lỗi khi tải trang:", error);
            contentAreaSlot.innerHTML = "<p>Đã xảy ra lỗi khi tải trang.</p>";
        }
    }

    // ============================================================
    // 2. LOGIC MÔN HỌC (SUBJECTS) 
    // ============================================================

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

        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = allSubjectsData.slice(start, end);

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

        renderSubjectPagination();
        attachSubjectActionEvents();
    }

    function renderSubjectPagination() {
        const paginationEl = document.querySelector('.pagination');
        if (!paginationEl) return;
        paginationEl.innerHTML = '';
        const totalPages = Math.ceil(allSubjectsData.length / rowsPerPage);

        const createBtn = (text, page, disabled = false) => {
            const btn = document.createElement('button');
            btn.className = `page-btn ${page === currentSubjectPage ? 'active' : ''}`;
            btn.innerHTML = text;
            btn.disabled = disabled;
            btn.onclick = () => {
                currentSubjectPage = page;
                renderSubjectTable(currentSubjectPage);
            };
            paginationEl.appendChild(btn);
        };

        createBtn('<span class="material-symbols-outlined">chevron_left</span>', currentSubjectPage - 1, currentSubjectPage === 1);
        for (let i = 1; i <= totalPages; i++) createBtn(i, i);
        createBtn('<span class="material-symbols-outlined">chevron_right</span>', currentSubjectPage + 1, currentSubjectPage === totalPages);
    }

    function attachSubjectActionEvents() {
        // Sửa
        document.querySelectorAll('.edit-subject-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const data = JSON.parse(e.currentTarget.dataset.info);
                await openSubjectEditModal(data);
            });
        });
        // Xóa
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
            const resKhoa = await fetch('http://localhost:8000/api/users/faculties');
            const dataKhoa = await resKhoa.json();
            const khoaSelect = document.getElementById('khoaSelect');
            if (khoaSelect) {
                khoaSelect.innerHTML = '<option value="">-- Chọn Khoa --</option>';
                dataKhoa.data.forEach(k => {
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


    // ============================================================
    // 3. LOGIC HỌC KỲ (SEMESTERS)
    // ============================================================

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
                        await fetch(`http://localhost:8000/api/semesters/delete/${id}`, { method: 'DELETE' });
                        loadSemesterList();
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


    // ============================================================
    // 4. LOGIC NGƯỜI DÙNG (USERS) & DASHBOARD - FULL VERSION
    // ============================================================

    // --- A. LOGIC DASHBOARD (Trang chủ) ---
    async function updateDashboardStats() {
        try {
            const response = await fetch('http://localhost:8000/api/dashboard/stats');
            const result = await response.json();
            if (result.success) {
                const ids = ['stat-users', 'stat-subjects', 'stat-classes'];
                const keys = ['users', 'subjects', 'classes'];
                
                ids.forEach((id, index) => {
                    const el = document.getElementById(id);
                    if (el) el.innerText = result.data[keys[index]];
                });
            }
        } catch (error) { console.error("Lỗi tải thống kê:", error); }
    }

    // --- B. LOGIC DANH SÁCH NGƯỜI DÙNG ---
    async function fetchAndInitUserTable() {
        try {
            const response = await fetch('http://localhost:8000/api/users/students');
            const result = await response.json();
            
            if (result.success) {
                // Map dữ liệu để thêm thông tin giả lập (SĐT, Ngày tạo)
                allUsersData = result.data.map(user => ({
                    ...user,
                    Phone: "09" + Math.floor(Math.random() * 90000000 + 10000000),
                    CreatedDate: "23/10/2025"
                }));

                // Reset về trang 1 và vẽ bảng
                currentPage = 1;
                renderUserTable(currentPage);
            }
        } catch (error) { console.error('Lỗi tải danh sách User:', error); }
    }

    function renderUserTable(page) {
        const tbody = document.getElementById('student-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Tính toán cắt trang
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = allUsersData.slice(start, end);

        pageData.forEach(user => {
            const roleClass = user.VaiTro === 'Giảng viên' ? 'font-weight: bold; color: #2563eb;' : 'color: #4B5563;';
            
            const row = `
                <tr>
                    <td style="padding-left: 24px; font-weight: 500;">${user.HoTen}</td>
                    <td style="${roleClass}">${user.VaiTro}</td>
                    <td style="color: #4B5563;">${user.Phone}</td>
                    <td style="color: #4B5563;">${user.Email}</td>
                    <td style="color: #4B5563;">${user.CreatedDate}</td>
                    <td style="text-align: center;">
                        <div style="display: flex; justify-content: center; align-items: center; gap: 15px;">
                            <button class="action-btn delete-user-btn" data-email="${user.Email}" 
                                style="border:none; background:none; cursor:pointer;" title="Xóa người dùng">
                                <span class="material-symbols-outlined" style="color: #ef4444;">delete</span>
                            </button>

                            <a href="#" class="btn-detail" data-email="${user.Email}" 
                               style="color: #9CA3AF; text-decoration: none; font-weight: bold; font-size: 18px;" title="Xem chi tiết">&gt;</a>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        // Gắn sự kiện cho các nút trong bảng
        attachUserActionEvents();
        
        // Vẽ thanh phân trang
        renderUserPagination();
    }

    function attachUserActionEvents() {
        // 1. Sự kiện Xem chi tiết
        document.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const email = e.currentTarget.dataset.email;
                sessionStorage.setItem('selectedUserEmail', email);
                loadPage('pages/chi-tiet-nguoi-dung.html', 'partials/search-bar.html', 'Chi tiết người dùng');
            });
        });

        // 2. Sự kiện Xóa người dùng
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const email = e.currentTarget.dataset.email;
                if (confirm(`Bạn có chắc chắn muốn xóa người dùng ${email}?`)) {
                    try {
                        const response = await fetch(`http://localhost:8000/api/users/delete/${email}`, { method: 'DELETE' });
                        const result = await response.json();

                        if (result.success) {
                            alert('Đã xóa thành công!');
                            fetchAndInitUserTable(); // Tải lại bảng
                        } else {
                            alert('Lỗi: ' + result.message);
                        }
                    } catch (err) { 
                        console.error(err); 
                        alert('Lỗi kết nối server!'); 
                    }
                }
            });
        });
    }

    function renderUserPagination() {
        const paginationEl = document.querySelector('.pagination');
        if (!paginationEl) return;
        paginationEl.innerHTML = '';
        
        const totalPages = Math.ceil(allUsersData.length / rowsPerPage);
        if (totalPages <= 1) return;

        const createBtn = (text, page, disabled = false) => {
            const btn = document.createElement('button');
            btn.className = `page-btn ${page === currentPage ? 'active' : ''}`;
            btn.innerHTML = text;
            btn.disabled = disabled;
            btn.onclick = () => {
                currentPage = page;
                renderUserTable(currentPage);
            };
            paginationEl.appendChild(btn);
        };

        createBtn('<span class="material-symbols-outlined">chevron_left</span>', currentPage - 1, currentPage === 1);
        for (let i = 1; i <= totalPages; i++) createBtn(i, i);
        createBtn('<span class="material-symbols-outlined">chevron_right</span>', currentPage + 1, currentPage === totalPages);
    }

    
    // --- C. LOGIC THÊM MỚI ---
    function setupAddButton() {
        // Sửa selector: Tìm cả .btn-add (trang User) và .btn-blue (các trang khác)
        const btnAdd = document.querySelector('.btn-add, .btn-blue'); 
        
        if (btnAdd && btnAdd.innerText.includes('Thêm')) {
            // Xóa sự kiện cũ bằng cách clone
            const newBtn = btnAdd.cloneNode(true);
            btnAdd.parentNode.replaceChild(newBtn, btnAdd);
            
            newBtn.addEventListener('click', () => {
                loadPage('pages/them-nguoi-dung.html', 'partials/search-bar.html', 'Thêm người dùng');
            });
        }
    }

    function setupAddUserForm() {
        const form = document.getElementById('add-user-form');
        if (!form) return;
        
        

        // Clone form để reset event listener
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            const facultySelect = document.getElementById('faculty-select');
            
            // Validate
            if (password !== confirmPass) { alert('Mật khẩu không khớp!'); return; }
            if (!facultySelect || !facultySelect.value) { alert('Vui lòng chọn Khoa!'); return; }

            const role = document.querySelector('input[name="role"]:checked').value;

            try {
                const response = await fetch('http://localhost:8000/api/users/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        hoTen: fullname, 
                        email: email, 
                        matKhau: password, 
                        vaiTro: role, 
                        khoa: facultySelect.value 
                    })
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('🎉 Thêm thành công!');
                    // Quay về trang danh sách
                    const userLink = document.querySelector('.nav-link[data-title="Người dùng"]');
                    if(userLink) userLink.click();
                } else { 
                    alert('❌ Lỗi: ' + result.message); 
                }
            } catch (error) { console.error(error); alert('Lỗi kết nối server'); }
        });
    }

    
    async function loadFacultiesToDropdown() {
        console.log("Đang bắt đầu tải danh sách khoa..."); 
        
        try {
            // 1. Tìm ô chọn
            const selectEl = document.getElementById('faculty-select');
            if (!selectEl) {
                console.error("LỖI: Không tìm thấy thẻ có id='faculty-select' trong HTML!");
                return;
            }

            // 2. Gọi API
            const response = await fetch('http://localhost:8000/api/users/faculties');
            const result = await response.json();
            
            console.log("Kết quả API Khoa:", result); // Xem dữ liệu trả về

            if (result.success) {
                // 3. Điền dữ liệu
                selectEl.innerHTML = '<option value="">-- Chọn Khoa/Viện --</option>';
                
                result.data.forEach(khoa => {
                    const option = document.createElement('option');
                    option.value = khoa.TenKhoa; 
                    option.text = khoa.TenKhoa;
                    selectEl.appendChild(option);
                });
            } else {
                selectEl.innerHTML = '<option>Lỗi tải dữ liệu từ Server</option>';
            }
        } catch (error) { 
            console.error("Lỗi kết nối hoặc code JS:", error); 
            const selectEl = document.getElementById('faculty-select');
            if(selectEl) selectEl.innerHTML = '<option>Lỗi kết nối</option>';
        }
    }

    async function loadUserDetail() {
        const email = sessionStorage.getItem('selectedUserEmail');
        if (!email) { alert("Không tìm thấy thông tin!"); return; }
        try {
            const response = await fetch(`http://localhost:8000/api/users/detail?email=${email}`);
            const result = await response.json();
            if (result.success) {
                const u = result.data;
                document.getElementById('original-email').value = u.Email;
                document.getElementById('detail-fullname').value = u.HoTen;
                document.getElementById('detail-email').value = u.Email;
                document.getElementById('detail-role').value = u.VaiTro;
                document.getElementById('detail-khoa').value = u.Khoa;
                
                // Giả lập SĐT
                const phoneEl = document.getElementById('detail-phone');
                if(phoneEl) phoneEl.value = "09" + Math.floor(Math.random() * 100000000);
            }
        } catch (error) { console.error(error); }
    }

    // ============================================================
    // 5. NAVIGATION & INIT
    // ============================================================
    navLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            navLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
            loadPage(link.dataset.page, link.dataset.controls, link.dataset.title);
        });
    });

    const defaultActiveLink = document.querySelector(".main-nav .nav-link.active");
    if (defaultActiveLink) {
        loadPage(defaultActiveLink.dataset.page, defaultActiveLink.dataset.controls, defaultActiveLink.dataset.title);
    }

    document.querySelectorAll('.bottom-nav .nav-link').forEach(link => {
        const text = link.querySelector('span:last-child');
        if (text && text.textContent.trim().toLowerCase() === 'log out') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                const isLiveServer = window.location.port === '5500';
                window.location.href = (isLiveServer ? '/frontend/publics' : '') + '/login.html';
            });
        }
    });
});

// ============================================================
    // LOGIC LỚP HỌC (CLASSES) - FULL
    // ============================================================


    let isClassEditMode = false;
    let currentSemesterId = ""; 
    
    // BIẾN PHÂN TRANG CHO LỚP HỌC
    let allClassesData = [];
    let currentClassPage = 1;

    // 1. HÀM KHỞI TẠO
    async function initClassPage() {
        await loadSemestersToFilter();
        
        const filter = document.getElementById('semester-filter');
        if(filter) {
            filter.addEventListener('change', (e) => {
                currentSemesterId = e.target.value;
                fetchAndInitClassTable(currentSemesterId);
            });
        }

        setupAddClassButton();
        setupAddClassForm();
    }

    // 2. Tải Học kỳ vào Dropdown Filter (Header)
    async function loadSemestersToFilter() {
        try {
            const response = await fetch('http://localhost:8000/api/semesters');
            const result = await response.json();
            const filter = document.getElementById('semester-filter');
            
            if (result.success && filter) {
                filter.innerHTML = ''; 
                if (result.data.length > 0) {
                    currentSemesterId = result.data[0].MaHocKy;
                    fetchAndInitClassTable(currentSemesterId); 
                }
                result.data.forEach(hk => {
                    const option = document.createElement('option');
                    option.value = hk.MaHocKy;
                    option.text = `${hk.MaHocKy} (${hk.NamHoc})`;
                    filter.appendChild(option);
                });
                filter.value = currentSemesterId;
            }
        } catch (err) { console.error(err); }
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

        const rowsPerPage = 10;
        const tbody = document.getElementById('class-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (allClassesData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Không có lớp học nào trong học kỳ này.</td></tr>';
            // Xóa phân trang nếu không có dữ liệu
            const paginationEl = document.querySelector('.pagination');
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        // Tính toán cắt dữ liệu
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = allClassesData.slice(start, end);

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
        renderClassPagination(); // Vẽ nút phân trang
    }

    // 5. Hàm Vẽ Nút Phân Trang
    function renderClassPagination() {
        const rowsPerPage = 10;
        const paginationEl = document.querySelector('.pagination');
        if (!paginationEl) return;
        paginationEl.innerHTML = '';

        const totalPages = Math.ceil(allClassesData.length / rowsPerPage);
        if (totalPages <= 1) return; // Nếu chỉ có 1 trang thì không cần hiện nút

        const createBtn = (text, page, disabled = false) => {
            const btn = document.createElement('button');
            btn.className = `page-btn ${page === currentClassPage ? 'active' : ''}`;
            btn.innerHTML = text; 
            btn.disabled = disabled;
            btn.onclick = () => {
                currentClassPage = page;
                renderClassTable(currentClassPage);
            };
            paginationEl.appendChild(btn);
        };

        createBtn('<span class="material-symbols-outlined">chevron_left</span>', currentClassPage - 1, currentClassPage === 1);
        
        for (let i = 1; i <= totalPages; i++) {
            createBtn(i, i);
        }

        createBtn('<span class="material-symbols-outlined">chevron_right</span>', currentClassPage + 1, currentClassPage === totalPages);
    }

    function attachClassActionEvents() {
        // Sửa
        document.querySelectorAll('.edit-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const data = JSON.parse(e.currentTarget.dataset.info);
                openClassEditModal(data);
            });
        });

        // Xóa 
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
                // Khi sửa, ta gọi API update/:id (id ở đây là maLop)
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

    // ============================================================
    // LOGIC LỊCH HỌC (CẬP NHẬT: CÓ NÚT SỬA)
    // ============================================================

    let currentSemesterIdForSchedule = "";
    let classListForSchedule = []; 
    let isScheduleEditMode = false; 
    let currentScheduleOldData = null; // Lưu thông tin cũ để đối chiếu khi sửa

    async function initSchedulePage() {
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