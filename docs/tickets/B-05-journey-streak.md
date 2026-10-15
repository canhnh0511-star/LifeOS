# B-05 — Vertical slice Journey & Streak

Mục tiêu: GET `/journeys/current` và `progress.currentStreak` tính đúng scheduled session và mức hoàn thành journey.

Bắt buộc có historical schedule/timezone. Hỗ trợ pause/resume effective date. Phân biệt ngày lịch đã trôi qua với mức hoàn thành theo schedule. Test: khoảng trống Thứ Sáu/Thứ Hai, pending của hôm nay, pause, session bị bỏ lỡ, thay đổi có hiệu lực từ ngày mai, ngày bắt đầu/kết thúc. Giải quyết ý nghĩa còn mở của global-streak trong DECISIONS.md trước khi triển khai.
