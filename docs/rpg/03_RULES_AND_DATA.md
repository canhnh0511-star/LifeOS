# Quy tắc nghiệp vụ, ranh giới state & tương thích API

## Thứ tự ưu tiên nguồn sự thật
1. `docs/DOMAIN_RULES.md` và `docs/API_CONTRACT.md` của **repo đang checkout hiện tại**.
2. `frontend/src/api/types.ts` và (các) adapter `LifeOsApi` thực tế.
3. Tài liệu này, cho phần trình bày RPG và các tính năng chỉ có trên mock.
Nếu chúng mâu thuẫn, hãy dừng lại và ghi nhận một quyết định còn mở; không lặng lẽ ghi đè logic domain hiện có.

## Contract hiện có (phiên bản archive trước đó)
- `QuestDto`: `habitId`, `goalId`, `goalTitle`, `title`, `targetMinutes`, `xpReward`, `category`, `date`, `status`, `completedAt`.
- `ProgressDto`: `totalXp`, `level`, `levelStartXp`, `nextLevelXp`, `currentStreak`, `longestStreak`.
- `DailyDashboardDto`: `quests`, `progress`, `completedCount`, `scheduledCount`, `earnedXpToday`, `journey`.
- Mutation quest `PUT /quests/{habitId}/dates/{date}/completion` và `DELETE` là hai đường duy nhất hợp lệ để đổi XP thực. PUT trùng lặp trao delta bằng 0; undo trừ đi phần thưởng đã ghi; redo có thể tạo một chu kỳ thưởng mới.
- Repo thực tế có thể đã thay đổi; agent phải xác nhận trước khi sửa file.

## Ánh xạ khóa / định danh
- Định danh quest ổn định trong các DTO hiện có: `(habitId, date)`. Highlight Main Quest KHÔNG BAO GIỜ nhân bản mục quest.
- Metadata trình bày là tùy chọn, khóa theo `(userId, habitId, date)` hoặc theo habit ID ổn định khi cần ưu tiên xuyên ngày; không dùng vị trí mảng làm ID.
- `mainQuestHabitId`: do người dùng chọn (dự phòng: chọn xác định từ các quest `PENDING` theo lịch). Nếu habit của nó không có lịch hôm nay, chọn một quest đang có lịch; không có thưởng thêm.
- Độ khó suy ra để hiển thị từ `xpReward` hoặc metadata theme tùy chọn; **không bao giờ thay đổi phần thưởng XP** như một tác dụng phụ.
- Trạng thái `OPTIONAL` hiện KHÔNG có trong `QuestDto` cũ; chỉ triển khai **trong metadata trình bày mock tường minh** và giữ ngoài analytics hoàn thành production cho đến khi backend hỗ trợ. Nếu không, bỏ hoàn toàn mục Optional.

## Mô hình trình bày mock — ví dụ, KHÔNG phải schema backend
```ts
interface RpgCosmeticState {
  version: 1;
  selectedAvatarId: string;
  equippedFrameId?: string;
  equippedTitleId?: string;
  preferredMainHabitId?: string;
  dismissedOnboarding: boolean;
}
interface RpgItemDefinition {
  id: string;
  kind: 'BADGE' | 'RELIC' | 'FRAME' | 'TITLE';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  title: string;
  unlockRuleId: string;
  iconAsset: string;
}
interface RpgUnlockEvent {
  eventKey: string; // deterministic, e.g. FIRST_QUEST:userId
  itemId: string;
  userId: string;
  unlockedAt: string;
}
```
Chỉ lưu metadata thẩm mỹ/UI dưới một khóa localStorage có namespace như `lifeos:rpg:ui:v1:<userId>`. Đây là tiện ích MVP, **không phải** kho lưu trữ được bảo vệ/xác thực hay đồng bộ đa thiết bị. Không có bí mật. Khi migrate, chỉ đưa vào schema API tường minh sau khi chủ dự án duyệt.

## Danh mục phần thưởng xác định (deterministic) đề xuất
| ID | Loại | Điều kiện mở khóa | Ghi chú |
|---|---|---|---|
| `BADGE_FIRST_QUEST` | BADGE | Có ít nhất một lần hoàn thành quest thực tế | Mở khóa một lần |
| `BADGE_SEVEN_SESSIONS` | BADGE | Ít nhất 7 **buổi theo lịch đã hoàn thành** (không phải 7 ngày lịch) | Nguồn có thể cần bản ghi lịch sử; hiển thị LOCKED/UNKNOWN nếu không có |
| `FRAME_LEVEL_05` | FRAME | `ProgressDto.level >= 5` thực tế | Chỉ thẩm mỹ |
| `TITLE_LEVEL_10` | TITLE | `ProgressDto.level >= 10` thực tế | Chỉ thẩm mỹ |
| `RELIC_JOURNEY_FINISH` | RELIC | Thời lượng hành trình đã trôi qua VÀ ngưỡng hoàn thành thực tế được định nghĩa/duyệt | Không mở khóa nếu dữ liệu hoàn thành không đủ |

Nếu các API hiện tại không xác lập được một điều kiện, hãy đánh dấu nó là **preview / chỉ mock** thay vì bịa lịch sử hoàn thành. Giữ ID mở khóa là duy nhất và việc suy ra mang tính xác định; refresh không được nhân đôi sự kiện vật phẩm. Hiển thị điều kiện cho các vật phẩm LOCKED.

## Bất biến XP, Level, Streak
- XP thực đến từ `QuestMutationDto.xpAwarded`, không phải hiệu ứng UI hardcode. Chờ mutation thành công.
- Không có XP cho việc start/pause timer, xem quest, xem phần thưởng hay trang bị cosmetic.
- `Level` dùng công thức hiện có; không bao giờ cài đặt lại một công thức mâu thuẫn trong UI.
- Streak = streak theo buổi có lịch. Cuối tuần không có lịch không bị phạt. Timezone cục bộ quyết định hành vi theo ngày.
- Thanh tiến độ: dựa trên `levelStartXp` và `nextLevelXp`; riêng `totalXp` không phải XP trong level.
- Số ngày đã trôi của Journey không tương đương với mức tuân thủ habit. Hiển thị nhãn riêng biệt.
- Đường Undo / redo không được trao thêm phần thưởng từ state client cũ (stale).

## Ngữ nghĩa timer (chỉ frontend)
- `start`: tạo `startedAt` cục bộ; `pause`: cộng dồn thời gian đã trôi; `resume`: timestamp bắt đầu mới. Khi khôi phục, suy ra thời gian đã trôi từ các timestamp.
- Bấm giờ là công cụ hỗ trợ tập trung cá nhân, **không phải bằng chứng khách quan** đã hoàn thành công việc. Người dùng có thể xác nhận hoàn thành tác vụ một cách tường minh bất kể timer, trừ khi chủ sản phẩm quyết định khác.
- Không có XP khi sự kiện timer kết thúc. Đừng giả định service worker giữ timer chạy nền.
- State timer có thể bị bỏ an toàn mà không đổi trạng thái quest hay XP.

## RFC backend đang chờ — KHÔNG TRIỂN KHAI
Chỉ cân nhắc sau khi UI được duyệt: `GET /rpg/profile`, `GET /rpg/inventory`, `PUT /rpg/equipment`, `PATCH /habits/{id}/priority`, hoặc một trường phân loại quest tường minh. Chúng không thuộc API hiện có và frontend chế độ production không được gọi chúng khi chưa có contract có phiên bản được chỉ rõ và có test.
