# UIS (University Information System)

Hệ thống thông tin trường đại học với frontend tĩnh và Node.js backend, sử dụng SQL Server.

## Cấu trúc dự án

```
UIS/
├── backend/                 # Backend Node.js
│   ├── src/
│   │   ├── config/         # Cấu hình (database, etc.)
│   │   ├── controllers/    # Xử lý logic từ routes
│   │   ├── middleware/     # Middleware (auth, logging)
│   │   ├── routes/        # Định nghĩa API endpoints
│   │   └── services/      # Business logic & database
│   ├── .env               # Biến môi trường
│   └── server.js         # Entry point
│
└── frontend/
    └── publics/
        ├── css/          # Stylesheets
        ├── js/           # JavaScript client
        ├── img/          # Images/assets
        └── *.html        # HTML pages

## Yêu cầu hệ thống

- Node.js >= 14
- SQL Server (Express hoặc Developer Edition)
- Visual Studio Code + Live Server extension (để chạy frontend)

## Cài đặt & Chạy

### 1. Clone & Cài đặt dependencies

```powershell
# Clone repository
git clone <repository-url>
cd UIS

# Cài đặt backend dependencies
cd backend
npm install

# Cài đặt frontend dependencies (nếu có)
cd ../frontend
# npm install (nếu có package.json)
```

### 2. Cấu hình Environment

```powershell
# Trong thư mục backend
cd backend
copy .env.example .env
```

Chỉnh sửa `.env`:
```env
PORT=8000
MSSQL_CONNECTION_STRING=Server=localhost\\SQLEXPRESS;Database=DATH;User Id=sa;Password=your_password;TrustServerCertificate=true
JWT_SECRET=your_secret_key
```

### 3. Chạy ứng dụng

1. Chạy Backend:
```powershell
cd backend
npm run dev
```
Backend sẽ chạy ở http://localhost:8000

2. Chạy Frontend:
- Mở VS Code
- Cài Extension "Live Server"
- Click chuột phải vào `frontend/publics/login.html`
- Chọn "Open with Live Server"
Frontend sẽ chạy ở http://127.0.0.1:5500

## API Endpoints

- POST /api/auth/login
  - Body: { email, password }
  - Returns: { token }

- POST /api/auth/register
  - Body: { email, password }
  - Returns: { email, createdAt }

## Môi trường phát triển

- Backend: http://localhost:8000
- Frontend: http://127.0.0.1:5500 (VS Code Live Server)
- Database: SQL Server (localhost\\SQLEXPRESS)

## Xử lý lỗi thường gặp

1. Lỗi kết nối SQL Server:
   - Kiểm tra SQL Server đang chạy
   - Xác nhận tên instance (SQLEXPRESS hoặc MSSQLSERVER)
   - Kiểm tra credentials trong .env

2. CORS errors:
   - Backend đã cấu hình CORS cho một số origin cụ thể
   - Nếu dùng port khác, cập nhật CORS trong `backend/src/app.js`
