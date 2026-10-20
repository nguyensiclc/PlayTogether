# Quy ước code

Áp dụng cho mọi package (`engine`, `client`, sau này `server`). Phần nào máy kiểm tra được thì do **Biome** kiểm tra (`biome.json`), phần còn lại người review theo tài liệu này.

Trước khi commit, chạy:

```
npm run check      # Biome (định dạng + lint) → typecheck → test
npm run format     # tự sửa định dạng, sắp xếp import và các lỗi lint sửa được an toàn
```

> Vì sao dùng Biome thay cho ESLint + Prettier: dự án dùng TypeScript 7, mà `typescript-eslint` mới hỗ trợ tới TypeScript 6.0. Biome tự đọc cú pháp TypeScript, không phụ thuộc gói `typescript`, và gộp định dạng + lint vào một công cụ.

## 1. Định dạng (Biome tự làm)

- Thụt lề 2 dấu cách, dòng tối đa **120** ký tự, xuống dòng kiểu LF.
- Chuỗi dùng nháy kép `"`, luôn có dấu chấm phẩy, dấu phẩy cuối ở mọi danh sách nhiều dòng.
- Import được sắp xếp tự động.

## 2. Đặt tên

| Loại | Kiểu viết | Ví dụ |
|---|---|---|
| Biến, hàm, thuộc tính | `camelCase` | `validMoves`, `renderLog` |
| Kiểu, interface, class | `PascalCase` | `GameModule`, `BoardDom` |
| Hằng số cấp module (giá trị cố định của luật hay cấu hình) | `UPPER_SNAKE_CASE` | `BU_DAN`, `MAX_DROPS_PER_TURN` |
| Tên file, class CSS | `kebab-case` | `board-dom.ts`, `.status-pill` |

- **Code viết bằng tiếng Anh.** Riêng thuật ngữ luật giữ tiếng Việt không dấu, **đúng như tài liệu luật**: `dan`, `quan`, `buDan`, `latBan`, `camAnQuanNon`, `giaTriQuan`. Không dịch các thuật ngữ này sang tiếng Anh.
- Hàm bắt đầu bằng động từ: `applyMove`, `renderView`, `showResult`.
- Biến boolean bắt đầu bằng `is` / `has` / `can`: `isEmpty`, `hasQuan`, `canLatBan`.
- Không viết tắt khó đoán. Tên ngắn chỉ dùng trong phạm vi vài dòng và theo quy ước chung: `i` là chỉ số ô bàn, `e` là event, `s` là bản sao state trong hàm engine.

## 3. TypeScript

- Bật `strict` và `noUncheckedIndexedAccess` (đã cấu hình trong `tsconfig.base.json`).
- **Không dùng `any`.** Chỉ dùng `as` khi đọc dữ liệu từ ngoài (JSON, DOM, `GameResult.detail`), kèm chú thích nếu chưa hiển nhiên.
- **Không dùng `!` (non-null assertion) trong code sản phẩm.** Dùng hàm truy cập có kiểm tra, khi vi phạm thì ném lỗi có thông điệp rõ:
  - engine: `at(s, i)` cho số dân, `pick(arr, i)` cho mảng;
  - client: `$(root, selector)` cho phần tử DOM, `BoardDom.cell(i)` cho ô bàn.

  File test được phép dùng `!`.
- Kiểu dùng `import type`. Import nội bộ ghi rõ đuôi `.ts`.
- **Chỉ dùng named export**, không dùng `export default`.
- Ưu tiên union type (`"sow" | "latBan"`) thay cho `enum`. Dùng `readonly` cho dữ liệu không đổi.

## 4. Hàm, file, module (clean code)

- **Một hàm làm một việc.** Độ phức tạp nhận thức của mỗi hàm không vượt **15** (Biome kiểm tra). Hàm dài quá khoảng 40 dòng thì cân nhắc tách.
- **Mỗi file một trách nhiệm.** File code (không tính test) nên dưới khoảng 300 dòng. Dài hơn thì tách theo trách nhiệm. Hai ngoại lệ hiện có, vì mỗi file là một khối liền mạch:
  - `engine/o-an-quan/rules.ts` khớp từng bước với thuật toán ở mục 5 tài liệu kỹ thuật. Tách nhỏ hơn sẽ khó đối chiếu với tài liệu.
  - `client/screens/offline.ts` là bộ điều phối ván. Phần dựng giao diện, hiệu ứng, nhật ký và phím tắt đã nằm ở file riêng.
- **Không có số "ma thuật":** giá trị có ý nghĩa luật hay cấu hình phải đặt tên (`BU_DAN = 5`, `QUAN_GIA_MIN = 5`, `DURATION_MS`).
- **Return sớm** thay cho `if` lồng sâu. Không lồng quá 3 cấp.
- Ưu tiên bảng tra (`Record<…>`) hoặc map handler thay cho `switch` hay chuỗi `if` dài.
- Không để code chết, code bị comment lại, hay `console.log` (Biome chặn `console`).
- Không đổi giá trị tham số đầu vào. Engine luôn làm việc trên bản sao.

## 5. Engine (`packages/engine`)

- **Hàm thuần:** không sửa state đầu vào, không I/O, không `Date.now()`, không `Math.random()` (nhận `Rng` qua tham số), không phụ thuộc DOM hay Node.
- Lỗi do người chơi (đi sai lượt, ô không hợp lệ…) → trả `{ error: CODE }` theo mã của giao thức. Lỗi do bug (vi phạm bất biến) → `throw new Error(...)`.
- Mỗi luật mới phải có test. Thế cờ trong test có chú thích tính tay và tham chiếu mục tài liệu.

## 6. Client (`packages/client`)

- **Không chứa luật:** mọi câu hỏi "đi được gì, kết quả ra sao" đều hỏi engine (`validMoves`, `applyMove`).
- Màn hình (`screens/`) chỉ điều phối. Phần vẽ tái sử dụng được nằm trong `o-an-quan/` (bàn, thẻ người chơi, hộp hỏi, kết quả). Tiện ích DOM dùng chung nằm ở `dom.ts`, biểu tượng ở `icons.ts`.
- Phần dựng HTML viết thành **hàm thuần trả về chuỗi** (`resultHtml`, `latBanSheetHtml`). Phần gắn sự kiện và trạng thái nằm ở màn hình.
- Đưa dữ liệu vào DOM bằng `textContent`. Khi phải dùng `innerHTML` với chuỗi động thì bọc bằng `escapeHtml`.
- **CSS:**
  - **Màu đặc (mã hex) phải dùng token** `var(--…)` khai báo trong `:root`. Màu mới thì thêm vào `:root` và vào bảng màu trong `docs/design/README.md`. Bóng đổ và lớp phủ trong suốt (`rgba(…)` với độ trong) được viết trực tiếp.
  - Class viết `kebab-case`. Bố cục desktop đặt trong `@media (min-width: 1024px)`.
  - Viết từ chung đến riêng: quy tắc cho thẻ (`kbd`, `h1`) đặt trước quy tắc riêng của thành phần (`.btn kbd`). Selector được giới hạn trong thành phần (`.result th`, `.g-side .log li`). Biome tắt `noDescendingSpecificity` cho CSS, vì quy tắc này coi mọi selector cùng kết thúc bằng một thẻ là xung đột, trong khi selector của dự án nhắm vào các phần tử khác nhau trong từng thành phần.
  - Không dùng `!important`, trừ các tiện ích ẩn/hiện (`[hidden]`, `.mobile-only`, `.desk-only`). Những chỗ đó phải có chú thích `biome-ignore` ghi lý do.
- Vùng chạm tối thiểu 44px. Chữ trên giao diện viết tiếng Việt.

## 7. Comment

- Viết bằng **tiếng Việt**. Giải thích **vì sao**, không nhắc lại code **làm gì**.
- Khi code hiện thực một mục tài liệu hay một câu trả lời thì ghi tham chiếu: `(luật mục 6)`, `(Q17)`, `(UX mục 4)`.
- Mỗi file mở đầu bằng 1–2 dòng nói vai trò của file.
- Hàm, kiểu, thuộc tính được export thì có JSDoc ngắn khi tên chưa đủ rõ nghĩa.

## 8. Test

- File `*.test.ts` đặt cạnh file được test.
- Tên test viết tiếng Việt, mô tả tình huống và kỳ vọng. Có mã test trong tài liệu kế hoạch thì ghi kèm (`T13 — lặp nước`).
- Mỗi test theo thứ tự chuẩn bị → thực hiện → kiểm tra. Dữ liệu nhỏ, tính tay được.
- Fuzz và mọi thứ ngẫu nhiên dùng `createRng(seed)` với seed cố định, để chạy lại được.
- Sửa bug thì thêm test tái hiện bug đó.

## 9. Git

- Commit nhỏ, mỗi commit một việc hoặc một mốc. Phải chạy `npm run check` xanh trước khi commit.
- Message viết tiếng Việt: dòng đầu tóm tắt, không quá 72 ký tự; thân là gạch đầu dòng nêu thay đổi chính.
