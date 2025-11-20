const BACKEND_URL = 'http://localhost:8000/api';

document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Logic chuyển đổi View ---
  const showLoginFormButton = document.getElementById('show-login-form');
  const initialView = document.getElementById('initial-view');
  const loginForm = document.getElementById('login-form');

  if (showLoginFormButton) {
      showLoginFormButton.addEventListener('click', () => {
          if (initialView) initialView.classList.add('hidden');
          if (loginForm) loginForm.classList.remove('hidden');
      });
  }

  // Guest button -> direct dashboard for guests
  const guestBtn = document.getElementById('guest-btn');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      const isLiveServer = window.location.port === '5500';
      const basePath = isLiveServer ? '/frontend/publics' : '';
      window.location.href = basePath + '/dashboard-guest.html';
    });
  }

  // --- 2. Logic Hiện/Ẩn mật khẩu ---
  const eyeToggle = document.querySelector('.eye');
  if (eyeToggle) {
    eyeToggle.addEventListener('click', function() {
      const passwordInput = document.getElementById('password');
      passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
    });
  }

  // --- 2b. Quay lại View ban đầu ---
  const backToInitial = document.getElementById('back-to-initial');
  if (backToInitial) {
    backToInitial.addEventListener('click', () => {
      if (loginForm) loginForm.classList.add('hidden');
      if (initialView) initialView.classList.remove('hidden');
    });
  }

  // --- 3. Logic Gửi Form Đăng nhập ---
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault(); 
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch(`${BACKEND_URL}/auth/login`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        console.log(data);
        
        if (response.ok) {
          // 1. Lưu Token
          localStorage.setItem('token', data.token);
          
          // 2. Lưu Email (QUAN TRỌNG: Để trang Giảng viên biết ai đang đăng nhập)
          localStorage.setItem('userEmail', email); 
          
          // Xác định đường dẫn cơ sở (cho Live Server)
          const isLiveServer = window.location.port === '5500';
          const basePath = isLiveServer ? '/frontend/publics' : '';
          
          // Ưu tiên dùng redirectUrl từ Backend gửi về
          if (data.redirectUrl) {
            // Backend trả về dạng /admin/index.html -> ta ghép với basePath
            const redirectPath = basePath + data.redirectUrl;
            window.location.href = redirectPath;
          } else {
            // Fallback: Tự kiểm tra vai trò nếu backend không gửi redirectUrl
            const rawRole = (data.role || '');
            const normalized = rawRole.normalize ? rawRole.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : rawRole;
            const roleKey = normalized.replace(/\s+/g, '').toLowerCase();
            
            console.log('Raw role:', rawRole, 'Normalized:', roleKey);

            if (roleKey === 'admin') {
              window.location.href = basePath + '/admin/index.html';
            } else if (roleKey === 'giangvien' || roleKey.includes('giang')) {
              window.location.href = basePath + '/lecturer/index.html'; // Đã sửa lại đúng đường dẫn folder lecturer
            } else if (roleKey === 'sinhvien' || roleKey.includes('sinh')) {
              window.location.href = basePath + '/student/index.html'; // Dự phòng cho sinh viên
            } else {
              alert('Vai trò của bạn chưa được định nghĩa: ' + rawRole);
            }
          }
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error during login:', error);
        alert('Lỗi kết nối đến Server!');
      }
    });
  }
});