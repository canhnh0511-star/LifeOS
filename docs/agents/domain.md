# Domain Docs

Cách các engineering skill đọc tài liệu domain của repo này khi khám phá codebase.

## Trước khi khám phá, đọc các file sau

- **`CONTEXT.md`** ở thư mục gốc repo, hoặc
- **`CONTEXT-MAP.md`** ở thư mục gốc nếu có: nó trỏ tới một `CONTEXT.md` cho mỗi context. Đọc từng file liên quan tới chủ đề.
- **`docs/adr/`**: đọc các ADR liên quan tới khu vực bạn sắp làm. Với repo multi-context, kiểm tra thêm `src/<context>/docs/adr/` cho các quyết định theo phạm vi context.

Nếu bất kỳ file nào không tồn tại, **cứ tiếp tục một cách im lặng**. Đừng báo là thiếu; đừng đề xuất tạo trước. Skill `/domain-modeling` (đi qua `/grill-with-docs` và `/improve-codebase-architecture`) sẽ tạo chúng khi cần, lúc các thuật ngữ hoặc quyết định thực sự được chốt.

## Cấu trúc file

Repo single-context (phần lớn repo):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Repo multi-context (có `CONTEXT-MAP.md` ở thư mục gốc):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← quyết định cấp toàn hệ thống
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← quyết định riêng của context
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Dùng đúng từ vựng của glossary

Khi output nhắc tới một khái niệm domain (trong tiêu đề issue, đề xuất refactor, giả thuyết, tên test), dùng thuật ngữ như đã định nghĩa trong `CONTEXT.md`. Đừng trượt sang các từ đồng nghĩa mà glossary chủ ý tránh.

Nếu khái niệm bạn cần chưa có trong glossary, đó là tín hiệu: hoặc bạn đang tự đặt ngôn ngữ mà dự án không dùng (cân nhắc lại), hoặc có khoảng trống thật sự (ghi lại cho `/domain-modeling`).

## Báo cáo xung đột với ADR

Nếu output của bạn mâu thuẫn với một ADR hiện có, hãy nêu rõ thay vì lặng lẽ ghi đè:

> _Mâu thuẫn với ADR-0007 (event-sourced orders), nhưng đáng mở lại vì…_
