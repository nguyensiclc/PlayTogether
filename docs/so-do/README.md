# Sơ đồ kiến trúc (tạo bằng Archify)

Sơ đồ HTML tương tác dựng bằng [Archify](https://github.com/tt-a1i/archify) (skill tạo sơ đồ từ mô tả hoặc từ mã nguồn). Mở thẳng file `.html` trong trình duyệt; chọn một nút để xem nguồn trong repo.

| Sơ đồ | File | Loại |
|---|---|---|
| Kiến trúc tổng quan: client, gateway, phòng, engine | `kien-truc-tong-quan.html` | architecture |
| Luồng một nước đi, từ lúc chạm đến lúc cả phòng nhận kết quả | `luong-mot-nuoc-di.html` | sequence |

Mỗi sơ đồ có file `*.architecture.json` hoặc `*.sequence.json` là mô tả gốc (nguồn để dựng lại). Số dòng nguồn trong sơ đồ ghim vào commit `f487cf6`; code đổi nhiều thì dựng lại.

## Dựng lại

```bash
git clone --depth 1 https://github.com/tt-a1i/archify /tmp/archify
cd /tmp/archify/archify && npm ci
# ARCHIFY_CHROME: đường dẫn Chrome/Chromium cho bước kiểm tra bằng trình duyệt
ARCHIFY_CHROME=/đường/dẫn/chrome node bin/archify.mjs finalize architecture \
  <repo>/docs/so-do/kien-truc-tong-quan.architecture.json \
  <repo>/docs/so-do/kien-truc-tong-quan.html --repo-root <repo> --quality showcase --json
```

Đổi `architecture` thành `sequence` cho sơ đồ luồng. Lệnh chạy bốn cổng (validate, deliver, check, browser-check); đều phải `pass`. Phần giao diện của Archify hiện chưa có tiếng Việt nên nút và menu hiện tiếng Anh, còn nhãn sơ đồ là tiếng Việt.
