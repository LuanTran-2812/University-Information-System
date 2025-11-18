// CẤU HÌNH: Số dòng mỗi trang
const ROWS_PER_PAGE = 7; 
let allUsersData = [];
let currentPage = 1;

// A. Tải danh sách người dùng từ API
async function fetchAndInitUserTable() {
    try {
        const response = await fetch('http://localhost:8000/api/users/students');
        const result = await response.json();
        
        if (result.success) {
            // Giữ nguyên logic từ main-backup: map thêm Phone & CreatedDate
            allUsersData = result.data.map(user => ({
                ...user,
                Phone: "09" + Math.floor(Math.random() * 90000000 + 10000000),
                CreatedDate: "23/10/2025"
            }));
            currentPage = 1;
            renderUserTable(currentPage);
        } else {
            console.error('Lỗi:', result.message);
            alert('Không thể tải danh sách người dùng');
        }
    } catch (error) {
        console.error('Lỗi tải người dùng:', error);
    }
}

// B. Vẽ bảng người dùng (phân trang)
function renderUserTable(page) {
    const tbody = document.getElementById('student-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Tính toán vị trí dựa trên ROWS_PER_PAGE (7 dòng)
    // Lưu ý: Biến ROWS_PER_PAGE phải được khai báo ở trên cùng file (const ROWS_PER_PAGE = 7;)
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = allUsersData.slice(start, end);

    // Xử lý trường hợp trang hiện tại không còn dữ liệu (ví dụ sau khi xóa)
    if (pageData.length === 0 && page > 1) {
        currentPage = page - 1;
        renderUserTable(currentPage);
        return;
    }

    pageData.forEach(user => {
        const roleClass = user.VaiTro === 'Giảng viên' ? 'font-weight: bold; color: #2563eb;' : 'color: #4B5563;';
        
        const row = `
            <tr>
                <td style="text-align: center; width: 50px;">
                    <input type="checkbox" class="custom-checkbox" value="${user.Email}">
                </td>

                <td style="padding-left: 24px; font-weight: 500;">${user.HoTen || 'N/A'}</td>
                <td style="${roleClass}">${user.VaiTro}</td>
                <td style="color: #4B5563;">${user.Phone || ''}</td>
                <td style="color: #4B5563;">${user.Email}</td>
                <td style="color: #4B5563;">${user.CreatedDate || ''}</td>
                
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
    
    if (typeof renderPagination === 'function') {
        renderPagination(allUsersData.length, ROWS_PER_PAGE, page, (newPage) => {
            currentPage = newPage;
            renderUserTable(newPage);
        });
    }
}

// C. Gắn sự kiện cho các nút trong bảng
function attachUserActionEvents() {
    // 1. Xem chi tiết
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = e.currentTarget.dataset.email;
            sessionStorage.setItem('selectedUserEmail', email);
            try {
                if (typeof loadPage === 'function') {
                    loadPage('pages/chi-tiet-nguoi-dung.html', 'partials/search-bar.html', 'Chi tiết người dùng');
                } else {
                    const link = document.querySelector('.nav-link[data-page="pages/chi-tiet-nguoi-dung.html"]');
                    if (link) link.click();
                }
            } catch (err) { console.warn('Không thể điều hướng loadPage:', err); }
        });
    });

    // 2. Xóa người dùng
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

// D. Nút Thêm người dùng
function setupAddButton() {
    const btnAdd = document.querySelector('.btn-add, .btn-blue');
    if (btnAdd && btnAdd.innerText.includes('Thêm')) {
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', () => {
            try {
                if (typeof loadPage === 'function') {
                    loadPage('pages/them-nguoi-dung.html', 'partials/search-bar.html', 'Thêm người dùng');
                } else {
                    const link = document.querySelector('.nav-link[data-page="pages/them-nguoi-dung.html"]');
                    if (link) link.click();
                }
            } catch (err) { console.warn('Không thể điều hướng loadPage:', err); }
        });
    }
}

// E. Form thêm người dùng
function setupAddUserForm() {
    const form = document.getElementById('add-user-form');
    if (!form) return;
    
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            hoTen: document.getElementById('hoTen').value,
            sdt: document.getElementById('sdt').value,
            vaiTro: document.getElementById('vaiTro').value,
            khoa: document.getElementById('khoa').value
        };

        try {
            const response = await fetch('http://localhost:8000/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Thêm người dùng thành công!');
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

// F. Tải danh sách khoa vào dropdown
async function loadFacultiesToDropdown() {
    try {
        const response = await fetch('http://localhost:8000/api/faculties');
        const result = await response.json();
        
        const khoaSelect = document.getElementById('khoa');
        if (!khoaSelect) return;
        
        khoaSelect.innerHTML = '<option value="">-- Chọn Khoa --</option>';
        
        if (result.success && result.data) {
            result.data.forEach(khoa => {
                const option = document.createElement('option');
                option.value = khoa.MaKhoa;
                option.textContent = khoa.TenKhoa;
                khoaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Lỗi tải khoa:', error);
    }
}

// G. Xem chi tiết người dùng
async function loadUserDetail() {
    const email = sessionStorage.getItem('selectedUserEmail');
    if (!email) return;
    
    try {
        const response = await fetch(`http://localhost:8000/api/users/${encodeURIComponent(email)}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const user = result.data;
            document.getElementById('detail-email').innerText = user.Email;
            document.getElementById('detail-hoTen').innerText = user.HoTen || 'N/A';
            document.getElementById('detail-vaiTro').innerText = user.VaiTro;
            document.getElementById('detail-khoa').innerText = user.Khoa || 'N/A';
            document.getElementById('detail-sdt').innerText = user.SDT || 'N/A';
            document.getElementById('detail-ngayTao').innerText = user.NgayTao ? new Date(user.NgayTao).toLocaleDateString('vi-VN') : 'N/A';
        }
    } catch (error) {
        console.error('Lỗi tải chi tiết:', error);
    }
}

// Export functions và variables
if (typeof window !== 'undefined') {
    window.allUsersData = allUsersData;
    window.currentPage = currentPage;
    window.fetchAndInitUserTable = fetchAndInitUserTable;
    window.renderUserTable = renderUserTable;
    window.setupAddButton = setupAddButton;
    window.setupAddUserForm = setupAddUserForm;
    window.loadUserDetail = loadUserDetail;
    window.loadFacultiesToDropdown = loadFacultiesToDropdown;
}