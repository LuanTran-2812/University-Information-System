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
      // Determine base path based on current location
      const isLiveServer = window.location.port === '5500';
      const basePath = isLiveServer ? '/frontend/publics' : '';
      window.location.href = basePath + '/user/index.html';
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

  // --- 2b. Quay lại View ban đầu (từ form về initial view) ---
  const backToInitial = document.getElementById('back-to-initial');
  if (backToInitial) {
    backToInitial.addEventListener('click', () => {
      // Ẩn form đăng nhập, hiện view chọn vai trò
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
        
        if (response.ok) {
          if (data.redirectUrl) {
            window.location.href = data.redirectUrl; 
          } else {
            alert("Đăng nhập thành công nhưng không xác định được trang đích. Vui lòng liên hệ Admin.");
          }
        } else {
          alert(data.message || 'Đăng nhập thất bại');
        }
      } catch (error) {
        console.error('Error during login:', error);
      }
    });
  }
});