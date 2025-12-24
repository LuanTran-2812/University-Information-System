// courses-dashboard.js

async function loadCoursesDashboard() {
    const API_BASE = window.API_BASE || ''; 
    const AUTH_TOKEN = window.AUTH_TOKEN || null;
    const STUDENT_ID = window.STUDENT_ID || null;
    const PAGE_SIZE = 6; // số lượng khóa học hiển thị 1 trang

    const coursesGrid = document.querySelector('.courses-grid');
    if (!coursesGrid) {
    console.warn('⛔ Không phải trang courses – bỏ qua renderCourses');
    return;
}
    const statusSelectTrigger = document.querySelector('#selected-status-text');
    const semesterSelectTrigger = document.querySelector('#selected-semester-text');
    const filterSelects = document.querySelectorAll('.custom-select-wrapper');
    const searchInput = document.querySelector('#course-search-input');
    const paginationContainer = document.querySelector('.pagination');

    let allCourses = [];
    let filteredCourses = [];
    let currentPage = 1;

    // Hàm tạo các card khóa học
    function renderCourses(courses, page = 1) {
        coursesGrid.innerHTML = '';
        const start = (page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageCourses = courses.slice(start, end);

        if (!pageCourses.length) {
            coursesGrid.innerHTML = '<p>Không có khóa học nào.</p>';
            return;
        }

        pageCourses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.tabIndex = 0;
            card.dataset.id = course.id;

            card.innerHTML = `
                <div class="course-content">
                    <p class="course-description">
                        <strong>${course.title}</strong><br>
                        <span class="muted">${course.code || ''} | ${course.classCode || ''}</span><br>
                        <small class="muted">${course.term || ''}</small>
                    </p>
                </div>
            `;

            // Bấm vào card chuyển tới trang chi tiết
            card.addEventListener('click', () => {
                // Lưu courseId vào sessionStorage
                sessionStorage.setItem('currentCourseId', course.id);
                
                // Cập nhật active tab trong sidebar
                const infoLink = document.querySelector('.nav-link[data-page="pages/course.html"]');
                if (infoLink) {
                    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                    infoLink.classList.add('active');
                }
                
                // Load trang chi tiết
                window.loadPage(
                    'pages/course.html',
                    'partials/search-bar.html',
                    'Chi tiết khóa học'
                );
            });

            coursesGrid.appendChild(card);
        });

        renderPagination(courses.length, page);
    }

    // Render phân trang
    function renderPagination(totalItems, page) {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalItems / PAGE_SIZE);
        if (totalPages <= 1) return;

        const createPageBtn = (text, pageNumber, isActive = false) => {
            const btn = document.createElement('button');
            btn.className = `page-btn${isActive ? ' active' : ''}`;
            btn.textContent = text;
            btn.addEventListener('click', () => {
                currentPage = pageNumber;
                renderCourses(filteredCourses, currentPage);
            });
            return btn;
        };

        // Nút previous
        const prevBtn = createPageBtn('<', Math.max(1, page - 1));
        paginationContainer.appendChild(prevBtn);

        // Nút số trang (giản lược khi nhiều trang)
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
                paginationContainer.appendChild(createPageBtn(i, i, i === page));
            } else if (Math.abs(i - page) === 2) {
                const dots = document.createElement('span');
                dots.className = 'dots';
                dots.textContent = '...';
                paginationContainer.appendChild(dots);
            }
        }

        // Nút next
        const nextBtn = createPageBtn('>', Math.min(totalPages, page + 1));
        paginationContainer.appendChild(nextBtn);
    }

    // Lọc & sắp xếp
    function applyFilters() {
        const statusValue = document.querySelector('#selected-status-text').parentElement.dataset.value || '';
        const semesterValue = document.querySelector('#selected-semester-text').parentElement.dataset.value || '';
        const sortValue = document.querySelectorAll('.custom-select-wrapper')[2]
                            .querySelector('.custom-select-trigger').dataset.value || '';
        const searchValue = searchInput?.value.trim().toLowerCase() || '';

        filteredCourses = allCourses.filter(c => {
            const matchStatus = statusValue ? c.status === statusValue : true;
            const matchSemester = semesterValue ? c.term === semesterValue : true;
            const matchSearch = searchValue
                ? c.title.toLowerCase().includes(searchValue) || c.code.toLowerCase().includes(searchValue)
                : true;
            return matchStatus && matchSemester && matchSearch;
        });

        // Sắp xếp
        if (sortValue) {
            switch (sortValue) {
                case 'name-asc': filteredCourses.sort((a,b)=>a.title.localeCompare(b.title)); break;
                case 'name-desc': filteredCourses.sort((a,b)=>b.title.localeCompare(a.title)); break;
                case 'recent-asc': filteredCourses.sort((a,b)=>new Date(a.lastAccess)-new Date(b.lastAccess)); break;
                case 'recent-desc': filteredCourses.sort((a,b)=>new Date(b.lastAccess)-new Date(a.lastAccess)); break;
            }
        }

        currentPage = 1;
        renderCourses(filteredCourses, currentPage);
    }

    // Event cho search input
    if (searchInput) {
        searchInput.addEventListener('input', () => applyFilters());
    }

    // Event cho custom selects
    filterSelects.forEach(wrapper => {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const menu = wrapper.querySelector('.custom-select-menu');
        const options = menu.querySelectorAll('.custom-option');

        trigger.addEventListener('click', () => {
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                trigger.querySelector('span').textContent = opt.textContent;
                trigger.dataset.value = opt.dataset.value; // <-- cập nhật data-value
                menu.style.display = 'none';
                applyFilters();
            });
        });

        document.addEventListener('click', e => {
            if (!wrapper.contains(e.target)) menu.style.display = 'none';
        });
    });

    // Fetch dữ liệu từ API
    async function fetchCourses() {
        try {
            const url = `${API_BASE}/api/student/courses${STUDENT_ID ? `?studentId=${STUDENT_ID}` : ''}`;
            const res = await fetch(url, {
                headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}
            });
            if (!res.ok) throw new Error('Không thể tải dữ liệu');

            const data = await res.json();
            // Chuẩn hóa dữ liệu
            allCourses = (data.courses || []).map(c => ({
                id: c.id,
                title: c.title,
                code: c.code,
                term: c.term,
                status: c.status,
                image: c.image,
                lastAccess: c.lastAccess // ISO string
            }));

            filteredCourses = [...allCourses];
            renderCourses(filteredCourses, currentPage);
        } catch (err) {
            console.error(err);
            // Fallback: mock data
            allCourses = [
            { id: 1, title: 'Giải tích 2', code: 'MT1005', classCode: 'L01', term: 'HK241', status: 'Đã hoàn thành'},
            { id: 2, title: 'Hoá đại cương', code: 'CH1003', classCode: 'L02', term: 'HK241', status: 'Đã hoàn thành'},
            { id: 3, title: 'Vật lý 1', code: 'PH1003', classCode: 'L03', term: 'HK241', status: 'Đã hoàn thành'},
            { id: 4, title: 'Lập trình C++', code: 'IT2001', classCode: 'L04', term: 'HK242', status: 'Đã hoàn thành'},
            { id: 5, title: 'Cơ sở dữ liệu', code: 'IT2002', classCode: 'L01', term: 'HK242', status: 'Đã hoàn thành'},
            { id: 6, title: 'Mạng máy tính', code: 'IT2003', classCode: 'L02', term: 'HK243', status: 'Đã hoàn thành'},
            { id: 7, title: 'Toán rời rạc', code: 'MT1006', classCode: 'L03', term: 'HK243', status: 'Đã hoàn thành'},
            { id: 8, title: 'Kỹ thuật số', code: 'EE1001', classCode: 'L04', term: 'HK243', status: 'Đã hoàn thành'},
            { id: 9, title: 'Điện tử cơ bản', code: 'EE1002', classCode: 'L01', term: 'HK251', status: 'Đang học'},
            { id: 10, title: 'Hệ điều hành', code: 'IT2004', classCode: 'L02', term: 'HK251', status: 'Đang học'},
            { id: 11, title: 'Nhập môn AI', code: 'IT3001', classCode: 'L03', term: 'HK251', status: 'Đang học'},
            { id: 12, title: 'An ninh mạng', code: 'IT3002', classCode: 'L04', term: 'HK251', status: 'Đang học'}
        ];
            filteredCourses = [...allCourses];
            renderCourses(filteredCourses, currentPage);
        }
    }

    fetchCourses();
}

// Khởi tạo dashboard
if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', loadCoursesDashboard);
