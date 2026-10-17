import { EXERCISES, type Exercise, type MuscleGroup } from './exerciseLibrary';

/** Extra facts for the exercise detail screen (B-37). Static client content: equipment, level, type, secondary muscles and technique cues. */
export type ExerciseLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type ExerciseKind = 'COMPOUND' | 'ISOLATION' | 'CORE';
export interface ExerciseInfo { equipment: string; level: ExerciseLevel; kind: ExerciseKind; secondary: MuscleGroup[]; cues: string[]; }
export const levelLabel: Record<ExerciseLevel, string> = { EASY: 'Dễ', MEDIUM: 'Vừa', HARD: 'Khó' };
export const kindLabel: Record<ExerciseKind, string> = { COMPOUND: 'Bài đa khớp', ISOLATION: 'Bài đơn khớp', CORE: 'Bài core' };

const i = (equipment: string, level: ExerciseLevel, kind: ExerciseKind, secondary: MuscleGroup[], ...cues: string[]): ExerciseInfo => ({ equipment, level, kind, secondary, cues });
const C = 'COMPOUND' as const, I = 'ISOLATION' as const, K = 'CORE' as const;
const INFO: Record<string, ExerciseInfo> = {
  'bench-press': i('Thanh đòn, ghế phẳng', 'HARD', C, ['SHOULDERS', 'ARMS'], 'Siết bả vai về sau và xuống, chân đạp chắc xuống sàn.', 'Hạ thanh đến ngang ngực dưới, khuỷu khoảng 45° so với thân.', 'Đẩy lên theo đường hơi chéo, không nảy thanh trên ngực.'),
  'incline-db-press': i('Tạ đơn, ghế dốc', 'MEDIUM', C, ['SHOULDERS', 'ARMS'], 'Ghế dốc 30–45°, lưng áp ghế.', 'Hạ chậm đến khi khuỷu ngang thân, đẩy lên không khoá khuỷu.'),
  'cable-fly': i('Máy cáp', 'EASY', I, ['SHOULDERS'], 'Khuỷu hơi gập, giữ góc cố định.', 'Kéo hai tay về trước ngực như ôm cây, siết ngực một nhịp.'),
  'push-up': i('Tự thân', 'EASY', C, ['SHOULDERS', 'ARMS', 'CORE'], 'Thân thẳng từ đầu đến gót, bụng siết.', 'Hạ ngực sát sàn, khuỷu không bung rộng.'),
  'chest-dip': i('Xà kép', 'HARD', C, ['ARMS', 'SHOULDERS'], 'Nghiêng người về trước để dồn vào ngực.', 'Hạ đến khi vai ngang khuỷu, không hạ quá sâu nếu đau vai.'),
  'pull-up': i('Xà đơn', 'HARD', C, ['ARMS'], 'Bắt đầu từ treo tay thẳng, hạ bả vai xuống trước khi kéo.', 'Kéo cằm qua xà, hạ có kiểm soát.'),
  'barbell-row': i('Thanh đòn', 'HARD', C, ['ARMS', 'CORE'], 'Hông gập, lưng phẳng, thanh sát chân.', 'Kéo về phía rốn, siết bả vai ở đỉnh.'),
  'lat-pulldown': i('Máy kéo xô', 'EASY', C, ['ARMS'], 'Ngực ưỡn nhẹ, kéo thanh xuống xương đòn.', 'Dẫn lực bằng khuỷu, không ngả người quá nhiều.'),
  'seated-row': i('Máy cáp ngồi', 'EASY', C, ['ARMS'], 'Lưng thẳng, vai thả lỏng ở vị trí duỗi.', 'Kéo tay về bụng, siết bả vai, trả về chậm.'),
  deadlift: i('Thanh đòn', 'HARD', C, ['LEGS', 'CORE'], 'Thanh sát ống chân, lưng phẳng, hông và vai nâng cùng lúc.', 'Đẩy sàn bằng chân, khoá hông ở đỉnh, không ngả người ra sau.'),
  'back-squat': i('Thanh đòn, giá squat', 'HARD', C, ['CORE'], 'Thanh trên cơ thang, gối đi cùng hướng mũi chân.', 'Hạ đến khi đùi ngang hoặc sâu hơn nếu giữ được lưng phẳng.'),
  'romanian-deadlift': i('Thanh đòn', 'MEDIUM', C, ['BACK', 'CORE'], 'Gối hơi gập cố định, đẩy hông ra sau.', 'Hạ đến khi đùi sau căng, giữ thanh sát chân.'),
  'leg-press': i('Máy đạp đùi', 'EASY', C, [], 'Lưng và hông áp ghế, không để hông nhấc lên.', 'Hạ đến khi gối khoảng 90°, đẩy lên không khoá gối.'),
  'walking-lunge': i('Tự thân hoặc tạ đơn', 'MEDIUM', C, ['CORE'], 'Bước dài vừa phải, thân thẳng.', 'Gối sau chạm gần sàn, đẩy bằng gót chân trước.'),
  'calf-raise': i('Máy hoặc bậc thang', 'EASY', I, [], 'Nâng gót hết biên độ, dừng một nhịp ở đỉnh.', 'Hạ chậm cho giãn bắp chân.'),
  'overhead-press': i('Thanh đòn', 'HARD', C, ['ARMS', 'CORE'], 'Siết mông và bụng, không ưỡn lưng.', 'Đẩy thẳng lên qua đầu, khoá khuỷu ở đỉnh.'),
  'lateral-raise': i('Tạ đơn', 'EASY', I, [], 'Khuỷu hơi gập, nâng đến ngang vai.', 'Không đung đưa người, hạ chậm.'),
  'rear-delt-fly': i('Tạ đơn hoặc máy', 'EASY', I, ['BACK'], 'Thân gập về trước, lưng phẳng.', 'Mở tay sang hai bên, dẫn bằng khuỷu.'),
  'face-pull': i('Máy cáp, dây kéo', 'EASY', I, ['BACK'], 'Kéo dây về phía mặt, khuỷu cao.', 'Xoay ngoài cánh tay ở cuối, siết bả vai.'),
  'barbell-curl': i('Thanh đòn', 'EASY', I, [], 'Khuỷu cố định sát thân.', 'Cuốn lên không vung người, hạ chậm.'),
  'hammer-curl': i('Tạ đơn', 'EASY', I, [], 'Lòng bàn tay hướng vào nhau.', 'Cuốn lên có kiểm soát, không nhún vai.'),
  'triceps-pushdown': i('Máy cáp', 'EASY', I, [], 'Khuỷu cố định sát hông.', 'Đẩy xuống đến duỗi hết tay, trả chậm.'),
  'skull-crusher': i('Thanh EZ, ghế phẳng', 'MEDIUM', I, [], 'Khuỷu chỉ về trần, không bung ra.', 'Hạ thanh về trán hoặc sau đầu, duỗi lên bằng tay sau.'),
  'overhead-triceps': i('Tạ đơn hoặc cáp', 'EASY', I, [], 'Khuỷu gần tai, thân thẳng.', 'Hạ sâu sau đầu rồi duỗi hết.'),
  'machine-chest-press': i('Máy đẩy ngực', 'EASY', C, ['SHOULDERS', 'ARMS'], 'Chỉnh ghế để tay cầm ngang ngực.', 'Lưng áp ghế, đẩy ra không khoá khuỷu, trả chậm.'),
  'seated-leg-curl': i('Máy cuốn đùi sau', 'EASY', I, [], 'Hông áp ghế, chỉnh gối thẳng trục máy.', 'Cuốn xuống hết biên độ, trả chậm.'),
  'leg-extension': i('Máy đá đùi trước', 'EASY', I, [], 'Lưng áp ghế, chỉnh gối thẳng trục máy.', 'Duỗi chân dừng một nhịp ở đỉnh, hạ chậm.'),
  'goblet-squat': i('Tạ đơn hoặc tạ ấm', 'EASY', C, ['CORE'], 'Ôm tạ sát ngực, khuỷu hướng xuống.', 'Ngồi xuống giữa hai chân, gót luôn chạm sàn.'),
  'db-romanian-deadlift': i('Tạ đơn', 'MEDIUM', C, ['BACK'], 'Tạ trượt sát đùi, lưng phẳng.', 'Đẩy hông ra sau đến khi đùi sau căng rồi đứng lên.'),
  'machine-shoulder-press': i('Máy đẩy vai', 'EASY', C, ['ARMS'], 'Chỉnh ghế để tay cầm ngang vai.', 'Đẩy lên không nhún vai, hạ chậm.'),
  'db-lateral-raise': i('Tạ đơn', 'EASY', I, [], 'Khuỷu hơi gập, nâng đến ngang vai.', 'Dùng tạ nhẹ, không đung đưa.'),
  'dead-bug': i('Tự thân, thảm', 'EASY', K, [], 'Lưng dưới ép sát sàn suốt bài.', 'Duỗi tay và chân đối bên chậm, về vị trí đầu rồi đổi bên.'),
  plank: i('Tự thân, thảm', 'EASY', K, ['SHOULDERS'], 'Khuỷu dưới vai, thân thẳng một đường.', 'Siết bụng và mông, thở đều, dừng khi lưng võng.'),
  'hanging-leg-raise': i('Xà đơn', 'HARD', K, [], 'Treo thẳng, không đung đưa.', 'Nâng chân bằng bụng dưới, hạ chậm.'),
  'cable-crunch': i('Máy cáp, dây kéo', 'MEDIUM', K, [], 'Quỳ, hông cố định.', 'Cuộn thân bằng bụng, không kéo bằng tay.'),
  'bodyweight-squat': i('Tự thân', 'EASY', C, ['CORE'], 'Chân rộng bằng vai, gối đi cùng hướng mũi chân.', 'Ngồi xuống như ngồi ghế, gót chạm sàn, đứng lên bằng chân.'),
  'glute-bridge': i('Tự thân, thảm', 'EASY', I, ['CORE'], 'Nằm ngửa, gối gập, bàn chân sát mông.', 'Đẩy hông lên đến thân thẳng, siết mông một nhịp rồi hạ chậm.'),
  superman: i('Tự thân, thảm', 'EASY', I, ['LEGS'], 'Nằm sấp, hai tay duỗi về trước.', 'Nâng tay và chân lên nhẹ nhàng, giữ đều, không ngửa cổ.'),
  'pike-push-up': i('Tự thân', 'MEDIUM', C, ['ARMS'], 'Hông cao, thân hình chữ V ngược.', 'Hạ đầu xuống giữa hai tay rồi đẩy lên, khuỷu không bung rộng.'),
  'bench-dip': i('Ghế hoặc bậc vững', 'EASY', I, ['SHOULDERS'], 'Tay chống sau lưng, khuỷu hướng ra sau.', 'Hạ thân đến khuỷu khoảng 90°, đẩy lên bằng tay sau.'),
  'db-floor-press': i('Tạ đơn, thảm', 'EASY', C, ['SHOULDERS', 'ARMS'], 'Nằm ngửa, gối gập, khuỷu khoảng 45° so với thân.', 'Hạ đến khi khuỷu chạm sàn nhẹ, đẩy lên không khoá khuỷu.'),
  'db-row': i('Tạ đơn, ghế hoặc bàn', 'EASY', C, ['ARMS'], 'Một tay chống, lưng phẳng song song sàn.', 'Kéo khuỷu về hông, siết bả vai, hạ chậm.'),
  'db-shoulder-press': i('Tạ đơn', 'EASY', C, ['ARMS', 'CORE'], 'Siết bụng, không ưỡn lưng.', 'Đẩy tạ lên qua đầu, hạ về ngang tai có kiểm soát.'),
  'db-curl': i('Tạ đơn', 'EASY', I, [], 'Khuỷu cố định sát thân.', 'Cuốn lên không vung người, hạ chậm.'),
  'bird-dog': i('Tự thân, thảm', 'EASY', K, ['BACK'], 'Chống bốn điểm, lưng phẳng như mặt bàn.', 'Duỗi tay và chân đối bên, giữ một nhịp rồi đổi bên, hông không xoay.'),
  'mountain-climber': i('Tự thân', 'MEDIUM', K, ['SHOULDERS', 'LEGS'], 'Tư thế chống đẩy, vai trên cổ tay.', 'Đưa gối lên ngực luân phiên, giữ hông thấp và nhịp đều.')
};
const FALLBACK: ExerciseInfo = { equipment: 'Tuỳ chọn', level: 'MEDIUM', kind: 'COMPOUND', secondary: [], cues: [] };
export const infoFor = (e: Exercise): ExerciseInfo => INFO[e.id] ?? FALLBACK;
export const hasInfo = (e: Exercise) => e.id in INFO;
export const exerciseIdsWithInfo = () => EXERCISES.filter(hasInfo).length;
