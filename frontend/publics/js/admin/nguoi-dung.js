// CẤU HÌNH: Số dòng mỗi trang
const ROWS_PER_PAGE = 7; 
let allUsersData = [];
let currentPage = 1;
let filteredUsersData = [];

// Set lưu trữ Email các dòng được chọn
const selectedUserEmails = new Set();

// --- A. Tải danh sách người dùng từ API ---
async function fetchAndInitUserTable() {
    try {
        const response = await fetch('http://localhost:8000/api/users/students');
        const result = await response.json();
        
        if (result.success) {
            allUsersData = result.data;
            filteredUsersData = allUsersData.slice();
            currentPage = 1;
            selectedUserEmails.clear(); // Reset lựa chọn khi reload
            renderUserTable(currentPage);
        } else {
            console.error('Lỗi:', result.message);
            alert('Không thể tải danh sách người dùng');
        }
    } catch (error) {
        console.error('Lỗi tải người dùng:', error);
    }
}

// --- B. Vẽ bảng người dùng (phân trang) ---
function renderUserTable(page) {
    const tbody = document.getElementById('student-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Cập nhật trạng thái nút xóa ngay khi render
    updateUserDeleteButtonState();

    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const source = filteredUsersData || [];
    const pageData = source.slice(start, end);

    if (pageData.length === 0 && page > 1) {
        currentPage = page - 1;
        renderUserTable(currentPage);
        return;
    }

    pageData.forEach(user => {
        const roleClass = user.VaiTro === 'Giảng viên' ? 'font-weight: bold; color: #2563eb;' : 'font-weight: bold; color: #FAAD14;';
        
        // Kiểm tra xem user này có đang được chọn không
        const isChecked = selectedUserEmails.has(user.MSSV || user.MSCB) ? 'checked' : '';

        const row = `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="user-checkbox" value="${user.MSSV || user.MSCB}" ${isChecked}>
                </td>
                <td>${user.HoTen || 'N/A'}</td>
                <td style="${roleClass}">${user.VaiTro}</td>
                <td style="color: #4B5563;">${user.MSSV || user.MSCB}</td>
                <td style="color: #4B5563;">${user.Email}</td>
                <td style="color: #4B5563;">${user.Khoa}</td>
                
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

    attachUserActionEvents();
    setupUserCheckboxes();      // Thiết lập sự kiện checkbox
    updateUserDeleteButtonState(); // Cập nhật nút xóa hàng loạt
    
    if (typeof renderPagination === 'function') {
        renderPagination((filteredUsersData || []).length, ROWS_PER_PAGE, page, (newPage) => {
            currentPage = newPage;
            renderUserTable(newPage);
        });
    }
}

function applyUserSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
        filteredUsersData = allUsersData.slice();
    } else {
        filteredUsersData = allUsersData.filter(u => {
            return (
                (u.HoTen || '').toLowerCase().includes(q) ||
                (u.Email || '').toLowerCase().includes(q) ||
                (u.MSSV || u.MSCB || '').toString().toLowerCase().includes(q) ||
                (u.Khoa || '').toLowerCase().includes(q)
            );
        });
    }
    currentPage = 1;
    renderUserTable(currentPage);
}

// --- C. Quản lý Checkbox & Xóa Batch (Logic mới thêm) ---

function updateSelectedUserEmails(id, isChecked) {
    if (isChecked) selectedUserEmails.add(id);
    else selectedUserEmails.delete(id);
}

function setupUserCheckboxes() {
    const selectAll = document.getElementById('selectAllUserCheckbox');
    const checkboxes = document.querySelectorAll('.user-checkbox');

    if (!selectAll) return;

    // Kiểm tra trạng thái "Chọn tất cả" dựa trên các dòng đang hiển thị
    const allOnPageChecked = Array.from(checkboxes).length > 0 && Array.from(checkboxes).every(c => c.checked);
    selectAll.checked = allOnPageChecked;

    // Sự kiện nút Chọn tất cả
    selectAll.onchange = function () {
        checkboxes.forEach(cb => {
            cb.checked = selectAll.checked;
            updateSelectedUserEmails(cb.value, cb.checked);
        });
        updateUserDeleteButtonState();
    };

    // Sự kiện từng checkbox con
    checkboxes.forEach(cb => {
        cb.onchange = function () {
            updateSelectedUserEmails(this.value, this.checked);
            if (!this.checked) selectAll.checked = false;
            else {
                const allCheckedOnPage = Array.from(checkboxes).every(c => c.checked);
                if (allCheckedOnPage) selectAll.checked = true;
            }
            updateUserDeleteButtonState();
        };
    });
}

function updateUserDeleteButtonState() {
    const deleteBtn = document.querySelector('.btn-icon-delete-user');
    if (deleteBtn) {
        if (selectedUserEmails.size > 0) {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
        } else {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.5';
        }
    }
}

async function handleMultipleDeleteUser(e) {
    e.preventDefault();

    const selectedEmails = Array.from(selectedUserEmails);
    if (selectedEmails.length === 0) {
        alert('Vui lòng chọn ít nhất một người dùng để xóa.');
        return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedEmails.length} người dùng đã chọn?`)) {
        try {
            // Giả định API backend hỗ trợ xóa nhiều: POST /api/users/delete-multiple
            // Body: { emails: [...] }
            const response = await fetch('http://localhost:8000/api/users/delete-multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails: selectedEmails })
            });

            const result = await response.json();

            if (result.success) {
                alert(`Đã xóa thành công ${selectedEmails.length} người dùng!`);
                selectedUserEmails.clear();
                
                const selectAll = document.getElementById('selectAllUserCheckbox');
                if (selectAll) selectAll.checked = false;

                fetchAndInitUserTable();
            } else {
                alert('Lỗi server: ' + result.message);
            }
        } catch (err) { 
            console.error(err);
            alert('Lỗi kết nối hoặc server!'); 
        }
    }
}

// --- D. Gắn sự kiện & Nút chức năng ---

function attachUserActionEvents() {
    // 1. Xem chi tiết
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = e.currentTarget.dataset.email; 
            
            try {
                // 1. Tạo URL chứa Query Param
                const targetUrl = `/admin/nguoi-dung/chi-tiet?email=${encodeURIComponent(email)}`;
                
                // 2. Push URL này lên browser
                history.pushState(null, '', targetUrl);

                // 3. Gọi hàm loadPage
                if (typeof loadPage === 'function') {
                    loadPage('/admin/pages/chi-tiet-nguoi-dung.html', '/admin/partials/search-bar.html', 'Chi tiết người dùng');
                }
            } catch (err) { console.warn('Lỗi điều hướng:', err); }
        });
    });

    // 2. Xóa từng người dùng (Giữ lại logic cũ)
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const email = e.target.closest('.delete-user-btn').dataset.email;
            if (!confirm(`Bạn có chắc muốn xóa người dùng "${email}"?`)) return;

            try {
                const response = await fetch(`http://localhost:8000/api/users/${encodeURIComponent(email)}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('Xóa thành công!');
                    // Xóa khỏi set nếu có
                    if(selectedUserEmails.has(email)) selectedUserEmails.delete(email);
                    fetchAndInitUserTable();
                } else {
                    alert('Lỗi: ' + result.message);
                }
            } catch (error) {
                console.error(error);
                alert('Lỗi khi xóa người dùng');
            }
        });
    });
}

function setupUserButtons() {
    // 1. Nút Thêm
    const btnAdd = document.querySelector('.btn-add-user');
    if (btnAdd && btnAdd.innerText.includes('Thêm')) {
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', () => {
            try {
                // 1. Định nghĩa URL ảo muốn hiển thị
                const targetUrl = '/admin/nguoi-dung/them-nguoi-dung';
                
                // 2. Thay đổi URL trên thanh địa chỉ (không reload)
                history.pushState(null, '', targetUrl);

                // 3. Gọi hàm loadPage để tải nội dung
                if (typeof loadPage === 'function') {
                    loadPage('/admin/pages/them-nguoi-dung.html', '/admin/partials/search-bar.html', 'Thêm người dùng');
                } else {
                    console.error("Hàm loadPage chưa được khởi tạo!");
                }
            } catch (err) { console.warn('Không thể điều hướng loadPage:', err); }
        });
    }

    // 2. Nút Xóa Hàng Loạt (Logic mới)
    const btnDeleteBatch = document.querySelector('.btn-icon-delete-user');
    if (btnDeleteBatch) {
        const newBtnDel = btnDeleteBatch.cloneNode(true);
        btnDeleteBatch.parentNode.replaceChild(newBtnDel, btnDeleteBatch);
        
        newBtnDel.addEventListener('click', handleMultipleDeleteUser);
        
        // Khởi tạo trạng thái disable ban đầu
        newBtnDel.disabled = true;
        newBtnDel.style.opacity = '0.5';
    }
}

// --- E. Form & Dropdown ---
function setupAddUserForm() {
    const form = document.getElementById('add-user-form');
    if (!form) return;
    
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Lấy vai trò từ radio button
        const roleRadios = document.getElementsByName('role');
        let selectedRole = 'Sinh viên'; // Mặc định
        roleRadios.forEach(radio => {
            if (radio.checked) selectedRole = radio.value;
        });
        
        const data = {
            hoTen: document.getElementById('fullname').value,
            password: document.getElementById('password').value,
            phone: document.getElementById('phone').value || null,
            address: document.getElementById('address').value || null,
            role: selectedRole,
            faculty: document.getElementById('faculty-select').value
        };

        // Validate
        if (!data.faculty) {
            alert('Vui lòng chọn Khoa / Viện!');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Backend trả về NewCode (chữ hoa từ SQL), không phải newCode
                const newCode = result.NewCode || 'N/A';
                const newEmail = result.NewEmail || result.newEmail || 'N/A';
                
                alert(`Thêm người dùng thành công!\n- Mã số: ${newCode}\n- Email: ${newEmail}`);
                newForm.reset();
                const userLink = document.querySelector('.nav-link[data-page="pages/nguoi-dung.html"]');
                if (userLink) userLink.click();
            } else {
                alert('Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi khi thêm người dùng');
        }
    });
}

async function loadFacultiesToDropdown() {
    try {
        const response = await fetch('http://localhost:8000/api/users/faculties');
        const result = await response.json();
        
        const khoaSelect = document.getElementById('faculty-select');
        if (!khoaSelect) return;
        
        khoaSelect.innerHTML = '<option value="">-- Chọn Khoa --</option>';
        
        if (result.success && result.data) {
            result.data.forEach(khoa => {
                const option = document.createElement('option');
                option.value = khoa.TenKhoa; // Dùng TenKhoa làm value vì bảng Khoa dùng TenKhoa là PRIMARY KEY
                option.textContent = khoa.TenKhoa;
                khoaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Lỗi tải khoa:', error);
    }
}

async function loadUserDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get('email');

    if (!email) {
        email = sessionStorage.getItem('selectedUserEmail');
    }

    if (!email) {
        alert("Không tìm thấy thông tin người dùng!");
        return;
    }
    
    try {
        // 1. Tải danh sách khoa trước
        await loadFacultiesToDropdownForDetail(); 

        // 2. Gọi API lấy dữ liệu chi tiết người dùng
        const response = await fetch(`http://localhost:8000/api/users/detail?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const user = result.data;

            // 3. Đổ dữ liệu vào form dựa trên cấu trúc HTML hiện có
            // Từ Database: SinhVien/GiangVien có các cột: MSSV/MSCB, Email, HoTen, Khoa, DiaChi, SDT, (GPA), VaiTro
            
            document.getElementById('detail-fullname').value = user.HoTen || 'N/A';
            document.getElementById('detail-email').value = user.Email || 'N/A';
            document.getElementById('detail-id').value = user.MSSV || user.MSCB || 'N/A';
            document.getElementById('detail-password').value = user.MatKhau || 'N/A';
            document.getElementById('detail-phone').value = user.SDT || 'Chưa cập nhật';
            document.getElementById('detail-address').value = user.DiaChi || 'Chưa cập nhật';
            
            // 4. Xử lý Select Khoa (API trả về TenKhoa)
            const facultySelect = document.getElementById('detail-faculty');
            if (facultySelect && user.Khoa) {
                // Tìm option có text khớp với TenKhoa
                const options = facultySelect.options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].textContent === user.Khoa) {
                        facultySelect.selectedIndex = i;
                        break;
                    }
                }
            }

            // 5. Xử lý Radio Button (Role) - VaiTro: "Sinh viên" hoặc "Giảng viên"
            const roleRadios = document.getElementsByName('role');
            roleRadios.forEach(radio => {
                if (radio.value === user.VaiTro) {
                    radio.checked = true;
                }
            });
        } else {
            alert('Không tìm thấy thông tin người dùng!');
        }

        const btnBack = document.getElementById('btn-back-user-list');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                // 1. Đổi URL về trang danh sách
                const targetUrl = '/admin/nguoi-dung';
                history.pushState(null, '', targetUrl);

                // 2. Load lại trang danh sách người dùng
                if (typeof loadPage === 'function') {
                    loadPage('/admin/pages/nguoi-dung.html', '/admin/partials/search-bar.html', 'Người dùng');
                }
                
                // 3. Highlight lại Sidebar (để chắc chắn menu vẫn sáng đúng chỗ)
                const parentLink = document.querySelector(`.main-nav .nav-link[href="/admin/nguoi-dung"]`);
                if (parentLink) {
                    document.querySelectorAll(".main-nav .nav-link").forEach(item => item.classList.remove("active"));
                    parentLink.classList.add("active");
                }
            });
        }
    } catch (error) {
        console.error('Lỗi tải chi tiết:', error);
        alert('Lỗi khi tải thông tin người dùng!');
    }
}

// Hàm phụ: Load danh sách khoa vào select box của trang chi tiết
async function loadFacultiesToDropdownForDetail() {
    try {
        const response = await fetch('http://localhost:8000/api/users/faculties');
        const result = await response.json();
        
        const khoaSelect = document.getElementById('detail-faculty');
        if (!khoaSelect) return;
        
        khoaSelect.innerHTML = '<option value="">-- Khoa / Viện --</option>';
        
        if (result.success && result.data) {
            result.data.forEach(khoa => {
                const option = document.createElement('option');
                option.value = khoa.TenKhoa; // Dùng TenKhoa làm value vì DB lưu TenKhoa
                option.textContent = khoa.TenKhoa;
                khoaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Lỗi tải danh sách khoa:', error);
    }
}

// Export hàm để main.js gọi được
if (typeof window !== 'undefined') {
    window.loadUserDetail = loadUserDetail;
}

// --- F. Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('student-table-body')) {
        fetchAndInitUserTable();
        setupUserButtons(); // Setup cả nút thêm và nút xóa hàng loạt
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                applyUserSearch(e.target.value);
            });
        }
    }
});

// Export functions và variables
if (typeof window !== 'undefined') {
    window.allUsersData = allUsersData;
    window.currentPage = currentPage;
    window.fetchAndInitUserTable = fetchAndInitUserTable;
    window.renderUserTable = renderUserTable;
    window.setupUserButtons = setupUserButtons;
    window.setupAddUserForm = setupAddUserForm;
    window.loadUserDetail = loadUserDetail;
    window.loadFacultiesToDropdown = loadFacultiesToDropdown;
    
    // Export thêm biến quản lý xóa
    window.selectedUserEmails = selectedUserEmails;
    window.updateSelectedUserEmails = updateSelectedUserEmails;
}