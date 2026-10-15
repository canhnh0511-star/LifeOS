# Data model — PostgreSQL (đề xuất cho backend; CHƯA áp dụng)

**Không chạy database migration trước khi frontend được duyệt.** Các bảng dưới đây là thiết kế đích. Việc triển khai thuộc Flyway migration trong B-01 đến B-05.

## Entity chính

| Entity | Field và ràng buộc quan trọng |
|---|---|
| `users` | UUID id PK, email UNIQUE, display_name, timezone, created_at. Password hash/auth identity nếu dùng local auth |
| `goals` | UUID id PK, user_id FK, category, title, description, status, created_at |
| `habits` | UUID id PK, user_id FK, goal_id FK, title, target_minutes, xp_reward, start_date, end_date, status |
| `habit_schedule_versions` | UUID id PK, habit_id FK, effective_from DATE, effective_to DATE nullable, weekdays SMALLINT[]; không cho phép version chồng lấn |
| `habit_lifecycle_events` | UUID id PK, habit_id FK, effective_date, event_type=PAUSE/RESUME/ARCHIVE; lịch sử sự kiện |
| `journeys` | UUID id PK, user_id FK, title, start_date, duration_days, status |
| `quest_instances` | UUID id PK, user_id FK, habit_id FK, scheduled_date DATE, status, reward_snapshot, category_snapshot, completed_at, cycle INTEGER, UNIQUE(user_id,habit_id,scheduled_date) |
| `xp_transactions` | UUID id PK, user_id FK, quest_id FK, cycle INTEGER, event_type, amount (+/-), created_at, UNIQUE(quest_id,cycle,event_type) |
| `user_progress` | user_id PK, total_xp, level, updated_at; là projection được cache, có thể dựng lại từ ledger |

## Bảng mẫu (bản phác thảo Flyway đích)
```sql
CREATE TABLE quest_instances (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  habit_id UUID NOT NULL REFERENCES habits(id),
  scheduled_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','COMPLETED','SKIPPED')),
  reward_snapshot INTEGER NOT NULL CHECK (reward_snapshot BETWEEN 0 AND 100),
  category_snapshot VARCHAR(30) NOT NULL,
  completed_at TIMESTAMPTZ,
  cycle INTEGER NOT NULL DEFAULT 0 CHECK (cycle >= 0),
  UNIQUE(user_id, habit_id, scheduled_date)
);
CREATE INDEX idx_quest_user_date ON quest_instances(user_id,scheduled_date);

CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  quest_id UUID NOT NULL REFERENCES quest_instances(id),
  cycle INTEGER NOT NULL CHECK(cycle > 0),
  event_type VARCHAR(20) NOT NULL CHECK(event_type IN ('QUEST_COMPLETE','QUEST_REVERT')),
  amount INTEGER NOT NULL CHECK(amount <> 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(quest_id,cycle,event_type)
);
```
`CREATE TABLE users/habits/goals/...` được cố ý hoãn lại; agent phải tự viết migration đầy đủ và integration test trong ticket tương ứng, không sao chép các đoạn mã chưa hoàn chỉnh vào production.

## Thiết kế toàn vẹn dữ liệu
- Quyền sở hữu của user: chuỗi FK VÀ authorization ở service level; không tin user ID do client gửi.
- Kiểm tra quyền sở hữu goal/habit ở service layer hoặc composite FK.
- Tránh chồng lấn ngày giữa các schedule version; dùng exclusion constraint của PostgreSQL hoặc interval được kiểm tra trong transaction.
- Mọi XP transition chạy trong một database transaction với quest row lock; cập nhật projection trong cùng transaction.
- Snapshot của quest instance bảo vệ reward/category trong quá khứ khỏi bị sửa.
- Không bao giờ xóa lịch sử XP transaction khi undo.
- Thay đổi schedule có hiệu lực từ ngày mai; quest instance đã tạo cho hôm nay giữ nguyên.
- Bắt buộc có backup/restore trước khi rollout production.

## Query cần lên kế hoạch
- Today theo user/date với các habit instance đã lên lịch.
- Số completed so với planned theo ngày và goal category.
- Tổng hợp XP theo quest date theo timezone local của user; không dùng ngày UTC của event.
- Current streak đọc từ schedule hiệu lực trong lịch sử và completion (chỉ tối ưu bằng cache sau khi đã đúng).
