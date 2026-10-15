# B-03 — Vertical slice Daily Quest

Mục tiêu: GET `/quests?date=...` và GET `/dashboard/today?date=...` tạo ra dữ liệu snapshot được lưu đúng cho ISO date theo local của user.

Triển khai `quest_instances` với unique user/habit/date, snapshot XP và category; logic effective-date của schedule history; không cộng XP khi GET; giữ nguyên quá khứ khi habit bị pause hoặc chỉnh sửa. Test: ngày nghỉ hằng tuần, cuối tuần, năm nhuận, ranh giới timezone, thay đổi status. Dashboard ban đầu có thể trả `progress` từ placeholder/ledger query cho đến B-04.
