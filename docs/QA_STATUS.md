# Trạng thái QA / Xác minh — 2026-10-15

## Đã xác minh
- `npx tsc -b`: typecheck đầy đủ, không lỗi. `npx vite build`: build + PWA precache thành công.
- `npm test` (vitest): 112 test đạt, gồm domain rules, insights, boss catalog, achievements, Mock API (ledger, pause/resume, boss, achievement, migration, validation), `httpClient`, và a11y của Modal và overlay ăn mừng (jsdom + Testing Library, gồm StrictMode), level-up, huy hiệu chặng và hình học mô hình nhân vật (dáng nam) và trang bị theo level.
- Mô hình nhân vật wireframe 3D (canvas) trên Chrome: xoay, hover/focus một chỉ số làm sáng bộ phận và vẽ đường kẻ, chế độ `prefers-reduced-motion` (đứng yên, hover vẫn vẽ lại), 1440/390/320px; trang bị dạng giáp ôm sát (mũ, giáp vai, giáp ngực, găng, giày) bậc 1–4 phát sáng theo màu từng lĩnh vực, có công cụ "Xem thử bậc trang bị" (chỉ ở chế độ demo, không đổi dữ liệu; mặc định hiển thị bậc thật); thời gian vẽ ~1 ms/khung (trung vị) ở DPR 2 trước khi thêm trang bị.
- Chrome headless (CDP) trên bản dev: Today/Journey/Insights ở 1440×900, 390×844, 320×568 không tràn ngang; chụp màn hình đã xem.
- Luồng tương tác thật trong Chrome: hoàn thành/hoàn tác quest (toast + effects), hạ/hoàn tác boss, thu hồi/cấp lại achievement, overlay level-up, level lĩnh vực và hạ boss kèm huy hiệu chặng (focus trap, Esc, trả focus; nếu nút mở đã bị thay thế thì về vùng nội dung chính), modal (focus vào trong, trả focus về nút mở khi đóng), đổi kỳ 7d/30d. Không có lỗi JavaScript runtime.
- `docs/openapi.yaml`: cú pháp hợp lệ, mọi `$ref` đều tồn tại.

## Chưa xác minh
- Cài PWA ("Add to Home Screen"), hành vi offline và service worker trên thiết bị thật (iOS Safari, Android Chrome).
- Screen reader thật (VoiceOver/NVDA); mới có test tự động cho modal và `aria-*` cơ bản.
- Bố cục tablet (768–1024px), trình duyệt khác ngoài Chrome, Lighthouse/performance.
- Không có contract test giữa `mockClient` và `httpClient`/OpenAPI (backend chưa tồn tại).

## Giới hạn đã biết
- Mô hình nhân vật ở 320px khá chật (chip chỉ số chạm tay mô hình). Ảnh chụp headless có thể cũ khi không có animation frame (artifact công cụ, không phải lỗi app).
- Mock API không phải authorization, offline sync hay cơ sở dữ liệu đồng thời (xem CLAUDE.md).
- `QuestMutation.streak` vẫn là streak theo từng habit (ADR-009 mở).
- Chuỗi giao diện còn trộn tiếng Việt và tiếng Anh theo phong cách thiết kế hiện tại.

## Phê duyệt

2026-10-15: owner duyệt rõ ràng ticket UI-00 ("oke duyệt ticket 00"). Backend được mở khóa.

## Backend B-01
21 integration test (HTTP thật, PostgreSQL thật) cho auth/CSRF/cookie; 112 test frontend. Chưa chạy: Docker Compose, Testcontainers, rate limit.

## Backend B-02
32 integration test backend (auth, tracing, goals/habits). Chrome: tạo goal/habit qua modal trên backend thật, reload còn dữ liệu, tạm dừng goal. Today/Insights chưa có endpoint (B-03+).

## Backend B-03
51 test backend (thêm 13 integration + 6 unit cho luật quest). `GET /quests` và `GET /dashboard/today` chạy trên Postgres thật. Chưa kiểm trong Chrome. Hoàn thành/undo quest (PUT/DELETE) thuộc B-04 nên Today hiện chỉ xem được; `progress` là placeholder rỗng.

## Backend B-04
68 test backend. Hoàn thành/undo quest, ledger và progress chạy trên Postgres thật, kể cả đồng thời và rollback. Chưa kiểm trong Chrome; streak vẫn 0 đến B-05.
