# LMH FocusBlock

Tiện ích cá nhân mở rộng dành cho Google Chrome nhằm giảm thiểu quảng cáo và các yếu tố gây mất tập trung trong quá trình học tập và làm việc.

---

## 1. Giới thiệu tổng quan

**LMH FocusBlock** được xây dựng với triết lý:
- **100% Cục bộ (Offline-first & Local execution):** Không máy chủ backend, không yêu cầu tài khoản, không kết nối API AI hoặc dịch vụ bên ngoài.
- **Bảo mật & Tôn trọng quyền riêng tư:** Không thu thập lịch sử duyệt web, không telemetry, không phân tích hành vi.
- **Chuẩn Chrome Manifest V3:** Khai báo quyền tối thiểu (`declarativeNetRequest`, `storage`, `activeTab`), chạy nền qua Service Worker, không dùng bất kỳ API lỗi thời nào của Manifest V2 (như `webRequestBlocking`).
- **Giao diện tối giản:** Tuân thủ nhận diện thương hiệu với màu chủ đạo `#0033CC`, nền trắng thuần, không gradient hay hiệu ứng màu mè gây phân tâm. Không sử dụng số liệu ảo (fake counter).

---

## 2. Kiến trúc hệ thống

Dự án được phân tách thành các module độc lập, tách biệt ranh giới rõ ràng:

```
c:\Chặn quảng cáo chorme\
├── dist/                              # Thư mục build sẵn sàng nạp vào Chrome
│   ├── manifest.json                  # Cấu hình Manifest V3
│   ├── background.js                  # Chrome Service Worker (standalone bundle)
│   ├── content.js                     # Content script (IIFE độc lập)
│   ├── popup.html, popup.js, popup.css# Giao diện quản lý cá nhân
│   ├── rules/sample-ads.json          # Bộ quy tắc mạng tĩnh (DNR)
│   └── icons/                         # Bộ biểu tượng 16x16, 32x32, 48x48, 128x128
├── src/
│   ├── common/                        # Dùng chung (types, constants, url-utils, storage)
│   ├── modules/
│   │   ├── network-blocker/           # Bộ chặn tầng mạng (DNR rule builder & helpers)
│   │   ├── content-blocker/           # Bộ ẩn phần tử giao diện DOM (Cosmetic filtering)
│   │   ├── popup-guard/               # Bộ bảo vệ chống popup/popunder gây phiền
│   │   └── youtube/                   # Module YouTube (Nền tảng kiến trúc/stub)
│   ├── background/                    # Service worker & RulesetManager
│   ├── content/                       # Content script orchestrator
│   └── popup/                         # Giao diện popup Vanilla HTML/CSS/TypeScript
├── rules/
│   └── sample-ads.json                # Định nghĩa 20 quy tắc mẫu DNR
├── scripts/
│   ├── generate-icons.js              # Tạo icon chuẩn PNG bằng zlib thuần
│   └── build.js                       # Pipeline build đa mục tiêu qua Vite
├── tests/                             # Bộ kiểm thử đơn vị với Vitest
└── package.json, tsconfig.json, vite.config.ts
```

---

## 3. Cơ chế hoạt động & Tính năng đã hoàn thành

### 3.1. Chặn mạng bằng declarativeNetRequest (DNR)
- Sử dụng static ruleset (`rules/sample-ads.json`) bao gồm 20 quy tắc chặn các mạng quảng cáo phổ biến (`doubleclick.net`, `googlesyndication.com`, `adservice.google.com`, `adnxs.com`, `criteo.com`, `outbrain.com`, `taboola.com`, `popads.net`, `popcash.net`, `google-analytics.com`, `adsbygoogle.js`, ...).
- **Ruleset Manager**: Quản lý trạng thái kích hoạt của static rulesets và cho phép nạp thêm các bộ lọc mở rộng chuyển đổi sang DNR.

### 3.2. Cơ chế bật/tắt theo website đồng bộ (Per-site Whitelist)
- Cơ chế bật/tắt theo từng trang web áp dụng đồng thời cho **cả 2 tầng**:
  1. **Tầng mạng (Network Layer):** Khi một trang web được đưa vào Whitelist (hoặc tắt chặn trên trang đó), `RulesetManager` tự động tạo một Dynamic Rule DNR với hành động `allowAllRequests` và độ ưu tiên cao (`priority: 9999`) cho initiator domain tương ứng. Mọi request xuất phát từ trang này sẽ được cho phép, vượt qua các quy tắc chặn tĩnh một cách an toàn và tối ưu hiệu năng.
  2. **Tầng nội dung (Content Scripts):** Content script kiểm tra trạng thái trang hiện tại với Background. Nếu trang nằm trong danh sách cho phép hoặc tính năng bảo vệ toàn cục đang tắt, Content script sẽ ngưng toàn bộ việc chèn CSS ẩn quảng cáo và gỡ bỏ bộ chặn popup.

### 3.3. Bộ lọc giao diện (Content Blocker / Cosmetic Filter)
- Tự động chèn CSS ẩn các khung quảng cáo rỗng, placeholder của banner tài trợ (`.adsbygoogle`, `[data-ad-client]`, `[class*="ad-banner"]`, ...).
- Sử dụng `MutationObserver` để ẩn ngay lập tức các phần tử quảng cáo tải động mà không gây giật lag trình duyệt.

### 3.4. Bộ chống cửa sổ bật lên (Popup Guard)
- Ngăn chặn các hành vi clickjacking và mã script giả lập sự kiện click (`!event.isTrusted`) vào các liên kết `target="_blank"` để mở tab quảng cáo ngầm.

### 3.5. Module YouTube (Foundation)
- Đã thiết lập cấu trúc interface `IYouTubeModule` và lớp nền tảng sẵn sàng để mở rộng tính năng nâng cao ở các giai đoạn sau.

### 3.6. Giao diện Popup quản lý cá nhân
- **Màu sắc thương hiệu:** `#0033CC`, nền trắng, thiết kế dạng thẻ phẳng, không gradient, không hiệu ứng rối mắt.
- **Công tắc bảo vệ toàn cục:** Bật/Tắt toàn bộ tiện ích.
- **Công tắc theo trang hiện tại:** Hiển thị tên miền trang đang mở, trạng thái ("Đang chặn" hoặc "Đã cho phép") và công tắc chuyển đổi trực tiếp.
- **Quản lý danh sách cho phép (Whitelist):** Xem danh sách, thêm tên miền thủ công (có kiểm tra tính hợp lệ), xóa tên miền ra khỏi danh sách.
- **Thống kê trung thực:** Chỉ hiển thị số quy tắc DNR và số lượng tên miền trong Whitelist; cam kết không dùng bộ đếm số lượng ảo.
- **Tùy chọn nâng cao:** Bật/tắt riêng lẻ bộ lọc giao diện (Cosmetic) và bảo vệ Popup.

---

## 4. Hướng dẫn cài đặt vào Google Chrome

1. Mở trình duyệt Google Chrome (hoặc Brave, Microsoft Edge, Cốc Cốc).
2. Truy cập vào đường dẫn: `chrome://extensions/`
3. Bật chế độ dành cho nhà phát triển (**Developer mode**) ở góc trên bên phải màn hình.
4. Nhấn nút **Tải tiện ích đã giải nén** (**Load unpacked**).
5. Chọn thư mục `dist` tại đường dẫn của dự án:
   ```
   c:\Chặn quảng cáo chorme\dist
   ```
6. Tiện ích **LMH FocusBlock** sẽ xuất hiện trên thanh công cụ của Chrome với biểu tượng huy hiệu chữ `FB` xanh `#0033CC`. Ghim tiện ích vào thanh công cụ để sử dụng thuận tiện.

---

## 5. Hướng dẫn kiểm thử

### Kiểm thử tự động (Automated Tests & Chromium E2E)
Chạy các lệnh kiểm tra trong terminal:
```bash
# 1. Kiểm tra kiểu TypeScript nghiêm ngặt (Strict Typecheck)
npm run typecheck

# 2. Chạy bộ unit tests (35 bài test)
npm test

# 3. Chạy kiểm thử tự động toàn diện trên trình duyệt Chromium thực tế (22 bài test E2E)
npm run test:e2e

# 4. Chạy toàn bộ kiểm thử (Unit tests + Chromium E2E)
npm run test:all

# 5. Build gói sản phẩm (Production Build)
npm run build
```

### Kiểm thử thực tế trên trình duyệt (Manual Functional Verification)
1. **Kiểm tra chặn mạng:** Truy cập một trang tin tức hoặc trang web có chứa Google AdSense/DoubleClick (hoặc trang thử nghiệm adblock như `adblock-tester.com`). Mở tab Network trong DevTools (`F12`), các request gửi đến `doubleclick.net`, `googlesyndication.com` sẽ bị chặn với trạng thái `(blocked:other)`.
2. **Kiểm tra Popup và Bật/Tắt trên trang:**
   - Mở popup **LMH FocusBlock**.
   - Tên miền trang hiện tại sẽ được nhận diện tự động (ví dụ: `dantri.com.vn` hoặc `vnexpress.net`).
   - Gạt tắt công tắc "Chặn quảng cáo trên trang này". Trạng thái chuyển sang "Đã cho phép".
   - Tải lại trang: Trang sẽ hiển thị bình thường vì dynamic rule `allowAllRequests` đã áp dụng cho trang này.
   - Gạt bật lại: Trang lập tức được bảo vệ trở lại.
3. **Kiểm tra danh sách cho phép:**
   - Trong popup, nhập `tuoitre.vn` vào ô nhập và nhấn **Thêm**.
   - Tên miền lập tức xuất hiện trong danh sách và hiển thị nút **Xóa**.
   - Nhấn nút **Xóa** để loại bỏ khỏi danh sách.
4. **Kiểm tra bảo vệ toàn cục:**
   - Gạt công tắc trên thanh Header để tạm dừng bảo vệ toàn hệ thống. Banner đổi sang màu đỏ "Đã tạm dừng bảo vệ".

---

## 6. Danh sách các hạn chế hiện tại (Current Limitations)

Theo đúng phạm vi yêu cầu giai đoạn nền tảng và network blocking:
1. **YouTube Smart Skip:** Chưa triển khai thuật toán tự động bấm "Skip Ad" hoặc tăng tốc video quảng cáo trên YouTube trong giai đoạn này (kiến trúc module đã sẵn sàng tại `src/modules/youtube`).
2. **Bộ quy tắc mạng tĩnh:** Đang sử dụng bộ 20 quy tắc mẫu chuẩn hóa cho các mạng quảng cáo phổ biến nhất. Chưa tích hợp toàn bộ tập hàng chục nghìn luật từ EasyList/AdGuard để giữ dung lượng siêu nhẹ cho tiện ích học tập cá nhân.
3. **Trang nội bộ trình duyệt:** Các trang `chrome://`, `chrome-extension://`, `edge://` và Web Store được Chrome bảo vệ nghiêm ngặt bằng cơ chế sandbox nên extension sẽ hiển thị trạng thái "Không áp dụng" theo đúng chuẩn bảo mật của Chromium.
