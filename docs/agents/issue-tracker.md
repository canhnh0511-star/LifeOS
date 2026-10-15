# Issue tracker: Local Markdown

Issue và spec của repo này nằm dưới dạng file markdown trong `.scratch/`.

## Quy ước

- Mỗi feature một thư mục: `.scratch/<feature-slug>/`
- Spec là `.scratch/<feature-slug>/spec.md`
- Implementation issue là một file cho mỗi ticket tại `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, đánh số từ `01`, không bao giờ gộp tất cả vào một file tickets
- Trạng thái triage được ghi bằng dòng `Status:` gần đầu mỗi file issue (xem `triage-labels.md` để biết chuỗi theo từng vai trò)
- Comment và lịch sử trao đổi được nối vào cuối file dưới heading `## Comments`

## Khi một skill nói "publish to the issue tracker"

Tạo file mới dưới `.scratch/<feature-slug>/` (tạo thư mục nếu cần).

## Khi một skill nói "fetch the relevant ticket"

Đọc file tại đường dẫn được tham chiếu. User thường sẽ đưa trực tiếp đường dẫn hoặc số issue.

## Thao tác wayfinding

Dùng bởi `/wayfinder`. **Map** là một file có một file **child** cho mỗi ticket.

- **Map**: `.scratch/<effort>/map.md` (phần thân gồm Notes / Decisions-so-far / Fog).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, đánh số từ `01`, câu hỏi nằm ở phần thân. Dòng `Type:` ghi loại ticket (`research`/`prototype`/`grilling`/`task`); dòng `Status:` ghi `claimed`/`resolved`.
- **Blocking**: dòng `Blocked by: NN, NN` gần đầu file. Ticket được mở khóa khi mọi file được liệt kê đều là `resolved`.
- **Frontier**: quét `.scratch/<effort>/issues/` tìm file đang mở, không bị chặn và chưa claim; số nhỏ nhất được ưu tiên.
- **Claim**: đặt `Status: claimed` và lưu trước khi làm bất cứ việc gì.
- **Resolve**: nối câu trả lời dưới heading `## Answer`, đặt `Status: resolved`, rồi nối một con trỏ ngữ cảnh (gist + link) vào Decisions-so-far của `map.md`.
