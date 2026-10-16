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
| `xp_transactions` | UUID id PK, user_id FK, source_type (QUEST/BOSS/ACHIEVEMENT), source_id UUID, category, cycle INTEGER, event_type, amount (+/-, khác 0), created_at, UNIQUE(source_type,source_id,cycle,event_type,category) (category thêm ở B-09 để BALANCED có 5 event) |
| `chapters` | UUID id PK, journey_id FK, idx, start_date, end_date |
| `boss_definitions` | code PK, name, category, target_minutes, xp_reward 1..100, tier 1..5, required_level, art_key (dữ liệu seed/cấu hình) |
| `habit_objectives` / `quest_objectives` (B-17) | `habit_objectives`: id, habit_id, position, title, target, unit, step. `quest_objectives`: bản chụp theo quest + `value` tiến độ; quest hoàn thành khi mọi dòng `value >= target` |
| rương hằng ngày (B-19) | Không có bảng: sự kiện `xp_transactions` với `source_type='DAILY'`, `event_type` `DAILY_REWARD_GRANT/REVOKE`, `source_id` = UUID suy ra từ (user, ngày, mốc), một sự kiện mỗi lĩnh vực (V9) |
| `boss_states` (triển khai B-08, thay `campaign_bosses`) | UUID id PK, user_id FK, journey_id FK, boss_code, status (AVAILABLE/DEFEATED), cycle, defeated_date, defeated_at; UNIQUE(journey_id, boss_code); chỉ có dòng khi boss đã được đánh | 
| `campaign_bosses` (thiết kế ban đầu) | UUID id PK, user_id FK, journey_id FK, chapter_id FK, definition_code FK, boss_date, status, defeated_date, cycle; UNIQUE(chapter_id) |
| `achievement_grants` | UUID id PK, user_id FK, journey_id FK, code, status (EARNED/REVOKED), cycle, earned_at; UNIQUE(journey_id, code, cycle) |
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
  source_type VARCHAR(20) NOT NULL CHECK(source_type IN ('QUEST','BOSS','ACHIEVEMENT')),
  source_id UUID NOT NULL,
  category VARCHAR(30) NOT NULL,
  cycle INTEGER NOT NULL CHECK(cycle > 0),
  event_type VARCHAR(30) NOT NULL CHECK(event_type IN
    ('QUEST_COMPLETE','QUEST_REVERT','BOSS_COMPLETE','BOSS_REVERT','ACHIEVEMENT_GRANT','ACHIEVEMENT_REVOKE')),
  amount INTEGER NOT NULL CHECK(amount <> 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_type, source_id, cycle, event_type)
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
- `source_id` là khóa tham chiếu đa hình (quest_instances / campaign_bosses / achievement_grants); toàn vẹn kiểm tra ở service layer hoặc qua trigger/constraint riêng, không có FK trực tiếp.
- Habit có `xp_reward = 0` không ghi transaction (vì `amount <> 0`).
- `user_progress` bổ sung `area_xp` theo category (hoặc bảng `user_area_progress`) như projection, dựng lại được từ ledger.
- Thay đổi schedule có hiệu lực từ ngày mai; quest instance đã tạo cho hôm nay giữ nguyên.
- Bắt buộc có backup/restore trước khi rollout production.

## Query cần lên kế hoạch
- Today theo user/date với các habit instance đã lên lịch.
- Số completed so với planned theo ngày và goal category.
- Tổng hợp XP theo quest date theo timezone local của user; không dùng ngày UTC của event.
- Current streak đọc từ schedule hiệu lực trong lịch sử và completion (chỉ tối ưu bằng cache sau khi đã đúng).
