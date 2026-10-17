# RFC: 5 chỉ số gym, cổng boss tuần, Bóng (slice 4)

Trạng thái: **chờ owner duyệt phần hợp đồng/backend**. Phần chỉ frontend có thể làm ngay.

## Vấn đề
`ProgressDto.areas` (AreaStatDto) vẫn là 5 lĩnh vực đời sống (Sự nghiệp, Sáng tạo...). Hướng mới (ADR-039/040): Sức mạnh, Sức bền cơ, Khối lượng, Cân đối, Ý chí, tính chỉ từ dữ liệu tập, so với mức nền 4 tuần của chính người dùng.

## Dữ liệu cần
| Chỉ số | Cần |
|---|---|
| Sức mạnh | tạ nặng nhất mỗi bài, theo tuần |
| Sức bền cơ | số rep ở cùng mức tạ |
| Khối lượng | số set mỗi tuần |
| Cân đối | set theo nhóm cơ |
| Ý chí | buổi đã tập / buổi kế hoạch trong tuần |

`WorkoutStatsDto.exercises[]` hiện chỉ có sets/reps/volumeKg: **thiếu `maxWeightKg`** và không chia theo tuần. Nhóm cơ suy ra ở client từ tên bài (đã có).

## Đề xuất
1. **Frontend-only (làm ngay, không cần quyền đặc biệt):** hàm thuần `hunterStats(weeks)` + test, tính từ `getWorkoutSets` theo ngày; thay `RadarChart/CharacterCard` bằng 5 chỉ số mới; mock theo dữ liệu mới. Chi phí: nhiều request nếu 28 ngày × habit.
2. **Đổi hợp đồng (cần owner duyệt):** thêm `maxWeightKg` vào `WorkoutStatsDto.exercises[]` và `weeks[]` (từng tuần: sets, sessions, planned). Đổi `docs/openapi.yaml` + `types.ts` + backend; chỉ là tính khi đọc, **không migration, không đụng XP ledger**.
3. **Cổng boss tuần:** HP boss = số buổi kế hoạch trong tuần, mỗi buổi hoàn thành trừ 1. Chỉ hiển thị, không thêm XP ẩn.
4. **Bóng:** mỗi kỷ lục cá nhân (tạ nặng nhất mới của một bài) = 1 Bóng, suy ra khi đọc từ lịch sử set, không lưu bảng mới.

## Loại trừ
Không migration, không deploy, không sửa dữ liệu người dùng, không đổi quy tắc XP.
