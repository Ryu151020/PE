# PE Scheduler · 手套车间生产排班系统

Ứng dụng web sắp ca sản xuất cho xưởng găng tay (song ngữ **Việt / 中文**): lập kế hoạch máy – khuôn – đơn hàng – nhân sự theo ngày, quản lý danh mục, báo cáo tổng hợp và nhập/xuất Excel.
Giao diện theo hệ thống thiết kế **Venus** (indigo `#4318FF`, DM Sans, card bo 20px).

> **Đăng nhập** bằng tài khoản nội bộ (xem bên dưới). **Dữ liệu** được lưu trên **Google Sheets** qua Google Apps Script để nhiều người cùng dùng chung — xem [Kết nối Google Sheets](#kết-nối-google-sheets). Nếu chưa kết nối, ứng dụng chạy ở *chế độ cục bộ* (lưu trong trình duyệt của bạn).

## Yêu cầu

- Node.js **18+** (xem `.nvmrc`)
- npm (hoặc pnpm / yarn)

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:5173
```

Các lệnh khác:

```bash
npm run build      # build production vào thư mục dist/
npm run preview    # chạy thử bản build
```

## Đăng nhập

Màn hình đăng nhập (landing) hiện khi chưa đăng nhập. Tài khoản cố định: **`Intco`** / **`123`** (sửa trong `src/auth/credentials.js`).
Trạng thái đăng nhập lưu trong `localStorage` nên tải lại trang không bị quay về màn hình Login; nút **Đăng xuất** ở góc trên bên phải.

> ⚠ Kiểm tra tài khoản chạy trên trình duyệt nên mật khẩu nằm trong mã JavaScript — chỉ đủ để chặn người xem tò mò, **không phải bảo mật thật**. Lớp bảo vệ dữ liệu thật là *token API* (mục dưới).

## Kết nối Google Sheets

**Cách hoạt động.** Google Sheets là database; Google Apps Script (`gas/code.gs`) là API JSON (`doGet` đọc, `doPost` ghi).
- **Optimistic UI**: mọi thao tác cập nhật giao diện ngay, việc gửi lên Sheets chạy ngầm (gộp 600 ms, chỉ gửi *bản ghi thay đổi*, chia lô nếu lớn).
- **Đọc nhanh**: mở trang là hiện ngay bản lưu trong trình duyệt (cache), song song tải bản mới; mỗi 8 giây chỉ hỏi *version* (rất nhẹ) và chỉ tải phần thay đổi khi có người khác vừa lưu.
- **Không mất dữ liệu**: thay đổi chưa gửi được (mất mạng…) được giữ trong trình duyệt và tự gửi lại; đóng tab sẽ có cảnh báo nếu còn thay đổi chưa gửi.
- **Nhiều người dùng chung**: ghi theo *từng bản ghi* (một nhân viên, một khuôn, một **ngày** kế hoạch). Hai người sửa *hai bản ghi khác nhau* không ghi đè nhau; sửa *cùng một ngày kế hoạch* cùng lúc thì người lưu sau thắng.

### Cài đặt (5 phút)

1. Tạo (hoặc mở) một file **Google Sheets** trống.
2. Menu **Tiện ích mở rộng ▸ Apps Script**. Xóa code mẫu, dán toàn bộ nội dung `gas/code.gs`, bấm **Lưu**.
3. (Tuỳ chọn, khuyến nghị) đặt `var API_TOKEN = 'mot-chuoi-bi-mat'` ở đầu file.
4. Chọn hàm **`setup`** ▸ **Chạy** một lần, cấp quyền khi Google hỏi (tạo sẵn 5 tab: Employees, Molds, Orders, Machines, Schedules).
5. **Triển khai ▸ Tùy chọn triển khai mới ▸ Loại: Ứng dụng web**
   - *Thực thi dưới dạng*: **Tôi (email của bạn)**
   - *Ai có quyền truy cập*: **Bất kỳ ai** (Anyone)
   - Bấm **Triển khai**, sao chép **URL ứng dụng web** (kết thúc bằng `/exec`).
6. Trong app: bấm chip **Đồng bộ** ở góc trên ▸ **Cài đặt kết nối** ▸ dán URL (và Token nếu có) ▸ **Kiểm tra kết nối** ▸ **Lưu**. (Hoặc đặt `VITE_GAS_URL` / `VITE_GAS_TOKEN` trong `.env`, xem `.env.example`.)
7. Lần đầu Sheet còn trống, app hỏi: **nạp dữ liệu mẫu**, **bắt đầu trống** hoặc **đẩy dữ liệu đang có trên trình duyệt**.

**Quyền chia sẻ file Sheets:** *không cần* công khai file. Script chạy dưới quyền của bạn nên file có thể để riêng tư; chỉ **Web App** phải đặt "Anyone". Muốn đồng nghiệp xem trực tiếp file thì chia sẻ riêng cho họ.
**Sau khi sửa `code.gs`** phải **Triển khai ▸ Quản lý bản triển khai ▸ ✏ ▸ Phiên bản mới ▸ Triển khai** thì URL cũ mới nhận code mới.

### Cấu trúc các tab

| Cột | Ý nghĩa |
|---|---|
| A `id` · B `rev` · C `deleted` · D `updatedAt` · E `updatedBy` | Cột hệ thống (deleted=1 là đã xóa, giữ lại để máy khác đồng bộ xóa theo) |
| F `json` · G `json2` · H `json3` | **Nguồn dữ liệu thật** (bản ghi dạng JSON; tự cắt ô vì Sheets giới hạn 50.000 ký tự/ô) |
| I… | Cột dễ đọc do app tự tạo (tên nhân viên, tên khuôn, trạng thái, số máy có công nhân…) |

Sửa tay các cột từ I trở đi **không** đồng bộ ngược vào app — hãy sửa trong app. Dọn các dòng đã xóa: chạy `purgeDeleted()` trong Apps Script (khi mọi người đã đồng bộ).

### Thử khi chưa có Google Sheets

```bash
npm run mock:gas        # chạy NGUYÊN VĂN code.gs trên một "Google Sheets" giả, http://localhost:8787/exec
```
Dán `http://localhost:8787/exec` vào Cài đặt kết nối. Đặt `MOCK_LATENCY_MS=400` để giả lập độ trễ của Google, `MOCK_FILE=./gas/.mock-data.json` để giữ dữ liệu giữa các lần chạy.

### Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| "Phản hồi không phải JSON" | URL không phải bản `/exec`, hoặc quyền truy cập chưa là **Anyone** |
| "Sai token (unauthorized)" | Token trong app khác `API_TOKEN` trong `code.gs` |
| Sửa `code.gs` mà không thấy đổi | Chưa tạo **phiên bản mới** của bản triển khai |
| Chậm 1–3 giây mỗi lần lưu | Bình thường với Apps Script; giao diện không bị chặn vì cập nhật lạc quan |

## Tính năng

| Trang | Nội dung |
|---|---|
| **Kế hoạch sắp đơn** | (kèm thống kê **khuôn mở theo ca**: 1 khuôn có công nhân = 1, tách Ca ngày / Ca đêm / Tổng cộng, bảng + biểu đồ) Lịch theo ngày cho 41 máy × 2 ca: khuôn, đơn hàng, cuộn màng, công nhân / tăng ca / kỹ thuật viên / CN khác. Kéo thả nhân viên giữa các ô, undo/redo, khóa kế hoạch, lấy dữ liệu từ ngày khác, thống kê KPI và thống kê máy mở theo khuôn |
| **Dữ liệu khuôn máy** | Danh mục khuôn (thêm/sửa/xóa, trạng thái) |
| **Dữ liệu đơn hàng** | Đơn đang sản xuất / đã hoàn thiện, gắn khuôn, size, cuộn màng |
| **Nhân sự** | Danh sách đang làm / đã nghỉ, lọc theo vị trí & ngày vào làm, dán từ Excel, khôi phục nhân sự đã nghỉ |
| **Báo cáo tổng hợp** | Nghỉ việc, thâm niên trước khi nghỉ, lý do nghỉ, báo cáo ca ngày/đêm, tăng ca, **tỉ lệ mở máy**, nhân sự theo thời gian, báo cáo theo máy |
| **Dữ liệu** | Xuất / nhập Excel (4 sheet), **xóa dữ liệu** theo khoảng ngày / toàn bộ kế hoạch / toàn bộ dữ liệu (chỉ ADMIN) |

### Thao tác nhanh trong bảng kế hoạch (chế độ *Sửa kế hoạch*)

- Click chọn ô · **Shift+click** hoặc **kéo chuột** để chọn nhiều ô (nhiều dòng & nhiều cột)
- **Ctrl/Cmd+C** copy cả vùng · **Ctrl/Cmd+V** dán (vùng lớn hơn sẽ được lặp lại; cột phải cùng loại, ca ngày ↔ ca đêm dán qua lại được)
- **Delete / Backspace** xóa vùng chọn · **Esc** bỏ chọn
- **Trạng thái máy được lưu theo từng ngày**: đổi ở ngày này không ảnh hưởng ngày khác; thay đổi chỉ có hiệu lực sau khi bấm **Lưu kế hoạch**, và sau khi lưu bảng trở về chế độ chỉ xem (muốn sửa phải bấm *Sửa kế hoạch*, hoặc dùng nút khóa để không ai sửa được)
- Một nhân viên chỉ được xếp một máy trong một ca — ô vi phạm sẽ được bỏ qua và báo lại
- Phím **/** đưa con trỏ vào ô tìm kiếm toàn cục

### Vai trò

Chọn ở góc trên bên phải: `ADMIN`, `MANAGER`, `VIEWER`. Quyền xóa dữ liệu chỉ dành cho ADMIN.

## Cấu trúc thư mục

```
src/
├─ main.jsx                     Điểm vào, nạp CSS (Tailwind → venus.css)
├─ App.jsx                      Root: state "database", vai trò, toast, confirm, chuyển trang
├─ index.css                    Chỉ chứa directive @tailwind
├─ styles/venus.css             Design system Venus: token, card, nút, input, sidebar, modal,
│                               chuyển động, bảng màu ngữ nghĩa (text-ink, bg-canvas, bg-brand…)
├─ auth/                        AuthContext (đăng nhập, lưu phiên), LoginPage (landing), credentials.js
├─ sync/                        useSheetsSync (optimistic UI + đồng bộ), gasClient (fetch/POST), diff, schema, storage
├─ context/AppContext.jsx       AppCtx + hook useApp()
├─ lib/                         Logic thuần (không JSX)
│  ├─ constants.js              Vị trí, trạng thái, lý do nghỉ, màu trạng thái, vai trò…
│  ├─ dates.js                  Tiện ích ngày (dd/mm/yyyy, preset khoảng thời gian…)
│  ├─ seed.js                   Sinh dữ liệu demo
│  ├─ schedule.js               KPI, đọc/ghi giá trị ô, sao chép kế hoạch, lịch sử undo/redo
│  ├─ excel.js                  Xuất/nhập Excel (SheetJS) + parse CSV dán
│  ├─ nav.js                    Danh sách menu
│  └─ styles.js                 Chuỗi class dùng chung (card, btn*, inputCls…)
├─ components/
│  ├─ ui/                       Bi (song ngữ), Badges, CountUp, Segmented, Overlays (Modal/Drawer/Toast),
│  │                            ConfirmDialog, Fields, PageHeader, ChartHelpers (tooltip/trục biểu đồ)
│  ├─ layout/                   Sidebar (viền trượt), Header (lời chào, tìm kiếm, vai trò)
│  ├─ schedule/                 ScheduleTable/Row/ShiftHeader, ScheduleSummary (KPI), Toolbar,
│  │                            EmployeeChip (+popover), CopyScheduleModal, OrdersMoldStats…
│  ├─ employees/                Form, dán từ Excel, drawer chi tiết, lọc ngày, lý do nghỉ
│  ├─ molds/  orders/           Form khuôn, form đơn hàng
│  ├─ reports/                  ReportCard, Th, OpenRateCard (tỉ lệ mở máy)
│  ├─ sync/                     SyncStatus (chip), SheetsSettingsModal, BootScreens
│  └─ data/                     DeleteDataCard
gas/
├─ code.gs                      Google Apps Script (doGet / doPost) — dán vào Google Sheets
└─ mock-server.mjs              Chạy code.gs trên Sheets giả để thử cục bộ
src/pages/                      SchedulePage, MachinesPage, OrdersPage, EmployeesPage,
                                ReportsPage, DataPage
```

## Lưu ý khi phát triển

- **Thứ tự CSS quan trọng**: `venus.css` phải được import *sau* Tailwind (đã làm trong `main.jsx`). Các lớp `.v-btn`, `.v-input`… dựa vào thứ tự này để không bị preflight của Tailwind ghi đè.
- **Bảng màu ngữ nghĩa** nằm cuối `venus.css` (mục *Palette utilities*): dùng `text-ink`, `text-mute`, `bg-canvas`, `bg-brand`, `border-line`… thay cho màu Tailwind mặc định. Muốn đổi màu chủ đạo chỉ cần sửa `--v-primary` và các dòng `#4318FF` trong file này.
- **Song ngữ**: nhãn theo dạng `"Tiếng Việt / 中文"` hoặc component `<Bi vi="…" zh="…" />`. Nhãn dùng chung (vị trí, trạng thái, lý do nghỉ) nằm trong `lib/constants.js`.
- **Font**: DM Sans + Poppins tải từ Google Fonts trong `index.html`; chữ Hán dùng font hệ thống (PingFang SC / Microsoft YaHei / Noto Sans SC).
- Biểu đồ dùng **Recharts**, icon dùng **lucide-react 0.383.0** (ghim phiên bản để tên icon không đổi).

## Hướng phát triển

- Xác thực & phân quyền thật (đăng nhập phía máy chủ, vai trò theo tài khoản) thay cho tài khoản cố định và bộ chọn vai trò demo.
- Nếu nhiều người sửa *cùng một ngày kế hoạch* thường xuyên: tách ghi theo từng máy (dòng) thay vì cả ngày.
- Thêm test (Vitest + Testing Library) cho `lib/schedule.js` (KPI, `applyCellValue`) — các hàm này là logic thuần nên dễ kiểm thử.
