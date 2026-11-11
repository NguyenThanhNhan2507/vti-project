# CRM VTI

Hệ thống quản lý khách hàng và cơ hội bán hàng nội bộ, làm theo đề tài "Xây dựng dịch vụ web nội bộ" (Mock Project SAP).

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Hệ điều hành | Ubuntu Server 22.04 (chạy trên VirtualBox) |
| Máy chủ web | Nginx (reverse proxy) |
| Ứng dụng | Node.js 22 LTS, Express |
| Cơ sở dữ liệu | PostgreSQL 14 (chạy trên máy riêng) |
| DNS nội bộ | Bind9 |
| Xác thực | bcrypt (băm mật khẩu), JWT (token đăng nhập 8 giờ) |
| Giao diện | HTML, CSS, JavaScript thuần |

## Mô hình triển khai

```
Trình duyệt ──► DNS (Bind9)
            ──► Web VM: Nginx :80 ──► Node.js :3000
                                          │
                                          ▼
                                   DB VM: PostgreSQL :5432
```

Các địa chỉ IP cụ thể trong môi trường thật được thay bằng `192.168.x.x` trong tài liệu này.

## Phân quyền

| Vai trò | Khách hàng | Cơ hội bán hàng | Quản lý người dùng |
|---|---|---|---|
| Quản trị viên (admin) | Xem tất cả, thêm, chọn người phụ trách | Xem tất cả | Có |
| Quản lý (manager) | Xem tất cả, thêm, chọn người phụ trách | Xem tất cả | Không |
| Nhân viên kinh doanh (sales) | Chỉ khách do mình phụ trách, thêm khách cho mình | Chỉ cơ hội của khách mình phụ trách | Không |

## Cấu trúc thư mục

```
vti-project/
├── migrations/          # Script tạo bảng CSDL (001_init.sql)
├── public/              # Giao diện web tĩnh
│   ├── css/             # Kiểu dáng chung
│   ├── js/              # Script phía trình duyệt (session, layout, từng trang)
│   └── pages/           # Các trang HTML
├── src/
│   ├── config/          # Kết nối PostgreSQL
│   ├── controllers/     # Xử lý nghiệp vụ cho từng nhóm API
│   ├── middleware/      # Kiểm tra token và vai trò
│   ├── routes/          # Khai báo đường dẫn API
│   ├── scripts/         # Công cụ dòng lệnh (tạo admin đầu tiên)
│   └── app.js           # Điểm khởi động ứng dụng
├── .env.example         # Mẫu biến môi trường (không có giá trị thật)
└── package.json
```

## API chính

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/health` | Kiểm tra ứng dụng đang chạy |
| POST | `/api/auth/login` | Đăng nhập, trả về token |
| GET | `/api/users` | Danh sách người dùng (admin) |
| POST | `/api/users` | Thêm người dùng (admin) |
| PATCH | `/api/users/:id` | Đổi vai trò, khóa/mở khóa, đổi họ tên (admin) |
| POST | `/api/users/:id/reset-password` | Đặt lại mật khẩu (admin) |
| GET | `/api/customers?q=` | Danh sách khách hàng, tìm theo tên, công ty, số điện thoại |
| POST | `/api/customers` | Thêm khách hàng |
| GET | `/api/customers/assignees` | Danh sách người phụ trách (admin, manager) |
| GET | `/api/deals` | Danh sách cơ hội bán hàng |

## Cài đặt và chạy

### 1. Chuẩn bị cơ sở dữ liệu

Tạo user và database trên PostgreSQL, sau đó chạy script tạo bảng:

```bash
psql -U <user> -d <database> -f migrations/001_init.sql
```

### 2. Cấu hình ứng dụng

Sao chép file mẫu rồi điền giá trị thật:

```bash
cp .env.example .env
```

| Biến | Ý nghĩa |
|---|---|
| `PORT` | Cổng ứng dụng lắng nghe, mặc định 3000 |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | Chuỗi bí mật ký token, nên dài và ngẫu nhiên |

### 3. Cài thư viện và chạy

```bash
npm install
node src/scripts/create-admin.js <tài-khoản> <mật-khẩu> "<họ-tên>"
node src/app.js
```

Chạy dưới dạng dịch vụ systemd để tự khởi động lại khi máy khởi động lại. Nginx chuyển tiếp yêu cầu từ cổng 80 vào cổng 3000.

## Ghi chú

- File `.env` không được đưa lên repo. Chỉ giữ `.env.example`.
- Mật khẩu người dùng được băm bằng bcrypt, không lưu dạng gốc.
- Khi tài khoản bị khóa, người dùng nhập đúng mật khẩu sẽ thấy thông báo liên hệ quản trị viên.

## Triển khai tự động

- Máy điều khiển Ansible (192.168.1.110) kiểm tra nhánh `main` trên GitHub mỗi 5 phút bằng cron
- Khi có commit mới, playbook `deploy_crm.yml` được chạy: kéo code mới, cài thư viện npm, khởi động lại service `vti-project` và kiểm tra web.
- Triển khai thủ công: `ansible-playbook -i inventory.ini deploy_crm.yml` (chạy trên máy điều khiển)

