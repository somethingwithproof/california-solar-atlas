> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Trình khám phá tĩnh có chức năng tìm kiếm cho dữ liệu điện mặt trời phân tán được báo cáo trên toàn bộ 483 thành phố hợp nhất và tất cả 58 hạt tại California.

## Tính năng

- Tìm kiếm mọi thành phố hợp nhất tại California và duyệt toàn bộ 58 hạt.
- Xem công suất DC được báo cáo, dải sản lượng điện hằng năm đã hiệu chỉnh theo vùng khí hậu và năm lắp đặt, mức tăng trưởng 5 năm, các nhóm khách hàng và số lượng điểm lắp đặt có kết hợp lưu trữ.
- Bản đồ phân vùng màu (choropleth) tương tác toàn tiểu bang sử dụng ranh giới đa giác chính thức của các thành phố hợp nhất.
- Bảng xếp hạng thành phố với các bộ lọc theo dân số, phạm vi phủ sóng của công ty điện lực và khu vực bưu chính, cùng tính năng so sánh trực tiếp tối đa bốn thành phố.
- URL chia sẻ được cho từng thành phố và hạt, xuất dữ liệu CSV và SVG, cùng thông tin minh bạch về các giới hạn của dữ liệu.
- 45 ngôn ngữ giao diện (20 ngôn ngữ Bậc 1, 15 ngôn ngữ châu Phi và 10 ngôn ngữ châu Á) với tính năng tự động nhận diện ngôn ngữ trình duyệt, bộ chọn ngôn ngữ ở đầu trang và hỗ trợ bố cục RTL.

## Bản địa hóa

Các chuỗi giao diện nằm trong `src/locales/` với 45 ngôn ngữ địa phương. Khi tải trang, ứng dụng kiểm tra `?lang=`, `localStorage` và `navigator.languages` / `navigator.language`, sau đó quay về tiếng Anh nếu không khớp. Các ngôn ngữ RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) tự động thiết lập `dir="rtl"`.

## Chạy cục bộ

```bash
npm ci
npm run dev
npm test
npm run build
```

Xem đầy đủ [README tiếng Anh](../../../README.md) để biết chi tiết về phương pháp luận, quy trình xử lý dữ liệu và các bản phát hành Parquet. Phát hành theo giấy phép [MIT](../../../LICENSE).
