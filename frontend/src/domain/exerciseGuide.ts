/**
 * Beginner teaching content for the exercise detail: setup, steps, breathing and common mistakes.
 * Written for the 13 exercises of the week-1 plan first; other exercises show "being written" instead of invented instructions.
 * Plain technique only: no medical claims, no promised results. Needs a trainer's review before it is treated as final.
 * Pictures are pending (no licensed or first-party illustrations yet); the detail screen says so.
 */
export interface ExerciseGuide { setup: string[]; steps: string[]; breathing: string; mistakes: string[]; }

const g = (setup: string[], steps: string[], breathing: string, mistakes: string[]): ExerciseGuide => ({ setup, steps, breathing, mistakes });
const PRESS_BREATH = 'Thở ra khi đẩy, hít vào khi trả về. Không nín thở.';
const LIGHT = 'Bắt đầu bằng mức tạ nhẹ để làm đủ số lần mà kỹ thuật vẫn gọn.';

export const GUIDES: Readonly<Record<string, ExerciseGuide>> = {
  'machine-chest-press': g(
    ['Chỉnh ghế để tay cầm ngang giữa ngực.', 'Lưng và đầu áp vào tựa, hai bàn chân đặt chắc xuống sàn.', LIGHT],
    ['Nắm hai tay cầm, hạ vai xuống và kéo nhẹ về sau.', 'Đẩy tay cầm ra trước đến khi tay gần thẳng, không khoá khuỷu.', 'Dừng một nhịp ngắn.', 'Trả về chậm (khoảng 2–3 giây), giữ lưng áp vào tựa.'],
    PRESS_BREATH,
    ['Nhún vai lên gần tai khi đẩy.', 'Khoá khuỷu mạnh ở cuối động tác.', 'Ưỡn lưng hoặc nhấc mông khỏi ghế.', 'Để tạ về quá nhanh, không kiểm soát.']),
  'incline-db-press': g(
    ['Chỉnh ghế dốc khoảng 30–45°.', 'Ngồi, đặt hai tạ lên đùi, ngả lưng và đưa tạ lên ngang ngực. Nếu tạ nặng, nhờ người đưa hoặc dùng tạ nhẹ hơn.', 'Lưng áp ghế, chân đạp chắc xuống sàn.'],
    ['Giữ tạ ngang ngực trên, lòng bàn tay hướng về trước, khuỷu hơi chếch khỏi thân.', 'Đẩy hai tạ lên đến khi tay gần thẳng, không khoá khuỷu.', 'Hạ chậm đến khi khuỷu ngang thân.', 'Lặp lại, hai tay đi đều nhau.'],
    PRESS_BREATH,
    ['Chọn tạ quá nặng nên hai tay lệch nhau.', 'Mở khuỷu thẳng sang hai bên (vuông góc với thân).', 'Ưỡn lưng, nhấc lưng khỏi ghế.']),
  'seated-row': g(
    ['Ngồi, đặt chân lên bệ, gối hơi gập.', 'Nắm tay cầm, lưng thẳng, ngực mở, tay duỗi nhưng vai vẫn thả lỏng.', LIGHT],
    ['Hạ vai xuống và siết nhẹ hai bả vai về sau.', 'Kéo tay cầm về phía bụng, khuỷu sát thân.', 'Dừng một nhịp, siết lưng.', 'Trả tay ra chậm đến khi duỗi, giữ lưng thẳng.'],
    'Thở ra khi kéo, hít vào khi trả tay ra.',
    ['Ngả người ra sau để lấy đà.', 'Nhún vai lên gần tai.', 'Để lưng tròn khi duỗi tay ra trước.']),
  'leg-press': g(
    ['Ngồi, lưng và mông áp sát ghế.', 'Đặt hai bàn chân rộng bằng vai trên bệ, mũi chân hơi hướng ra ngoài.', 'Mở chốt an toàn theo hướng dẫn trên máy; nếu chưa quen, hỏi nhân viên phòng tập.'],
    ['Đạp bệ lên đến khi chân gần thẳng, không khoá gối.', 'Hạ bệ chậm đến khi gối gập khoảng 90°, mông vẫn áp ghế.', 'Đạp bằng cả bàn chân, chú ý phần gót.', 'Lặp lại đều, không nảy ở đáy.'],
    'Hít vào khi hạ bệ, thở ra khi đạp lên.',
    ['Khoá gối mạnh ở đỉnh.', 'Hạ quá sâu làm mông nhấc khỏi ghế và lưng dưới tròn.', 'Để gối đổ vào trong.', 'Chọn tạ quá nặng nên không kiểm soát được.']),
  'dead-bug': g(
    ['Nằm ngửa trên thảm, hai tay giơ thẳng lên trần.', 'Gập hông và gối 90°: đùi vuông góc sàn, cẳng chân song song sàn.', 'Ép nhẹ lưng dưới xuống sàn.'],
    ['Siết bụng, giữ lưng dưới sát sàn suốt bài.', 'Hạ chậm tay phải ra sau đầu, đồng thời duỗi chân trái ra gần sàn.', 'Trả về vị trí đầu.', 'Đổi bên: tay trái và chân phải. Lặp lại xen kẽ.'],
    'Thở ra khi duỗi tay chân, hít vào khi trả về.',
    ['Để lưng dưới cong khỏi sàn.', 'Làm quá nhanh, tay chân đung đưa.', 'Nín thở.']),
  'goblet-squat': g(
    ['Đứng hai chân rộng bằng hoặc hơn vai một chút, mũi chân hơi hướng ra ngoài.', 'Ôm một quả tạ đơn (hoặc tạ ấm) sát ngực bằng hai tay, khuỷu hướng xuống.', LIGHT],
    ['Siết bụng, ngực mở nhẹ.', 'Ngồi xuống giữa hai chân như ngồi xuống ghế, gối đi cùng hướng mũi chân.', 'Hạ đến mức thoải mái mà lưng vẫn thẳng (đùi gần ngang sàn nếu làm được).', 'Đạp cả bàn chân xuống sàn để đứng lên.'],
    'Hít vào khi ngồi xuống, thở ra khi đứng lên.',
    ['Nhấc gót chân khỏi sàn.', 'Để gối đổ vào trong.', 'Lưng tròn hoặc đổ người ra trước.', 'Hạ quá nhanh.']),
  'lat-pulldown': g(
    ['Chỉnh đệm đùi để chân được giữ chắc.', 'Nắm thanh rộng hơn vai một chút, lòng bàn tay hướng ra trước.', 'Ngồi thẳng, ngực mở, ngả người ra sau rất nhẹ.'],
    ['Hạ vai xuống trước khi kéo.', 'Kéo thanh xuống về phía xương đòn, khuỷu hướng xuống và về sau.', 'Dừng một nhịp, siết lưng.', 'Trả thanh lên chậm đến khi tay duỗi.'],
    'Thở ra khi kéo xuống, hít vào khi trả lên.',
    ['Ngả người ra sau quá nhiều để lấy đà.', 'Kéo thanh ra sau đầu.', 'Nhún vai, co cổ.', 'Thả thanh lên quá nhanh.']),
  'db-romanian-deadlift': g(
    ['Đứng thẳng, hai chân rộng bằng hông.', 'Cầm hai tạ đơn trước đùi, lòng bàn tay hướng vào đùi.', 'Gối hơi gập và giữ nguyên góc đó suốt bài.'],
    ['Siết bụng, kéo vai nhẹ về sau.', 'Đẩy hông ra sau, thân nghiêng ra trước, tạ trượt sát đùi và cẳng chân.', 'Hạ đến khi đùi sau căng, lưng luôn phẳng.', 'Đẩy hông về trước để đứng thẳng.'],
    'Hít vào khi hạ, thở ra khi đứng lên.',
    ['Để lưng tròn.', 'Gập gối nhiều như đang squat.', 'Để tạ xa khỏi chân.', 'Hạ sâu hơn mức mà lưng còn phẳng.']),
  'machine-shoulder-press': g(
    ['Chỉnh ghế để tay cầm ngang vai hoặc thấp hơn một chút.', 'Lưng áp vào tựa, hai bàn chân đặt chắc xuống sàn.', LIGHT],
    ['Nắm tay cầm, khuỷu hơi chếch về phía trước thân.', 'Đẩy lên đến khi tay gần thẳng trên đầu, không khoá khuỷu.', 'Hạ chậm về ngang vai.', 'Lặp lại đều tay.'],
    PRESS_BREATH,
    ['Ưỡn lưng, đẩy bụng ra trước.', 'Nhún vai sát tai.', 'Khoá khuỷu mạnh ở đỉnh.', 'Thả tạ về quá nhanh.']),
  plank: g(
    ['Chống hai cẳng tay lên thảm, khuỷu ngay dưới vai.', 'Duỗi chân ra sau, chống bằng mũi chân.', 'Chọn thời gian ngắn trước; tăng dần khi thân vẫn giữ thẳng.'],
    ['Siết bụng và mông, giữ thân thẳng từ đầu đến gót.', 'Nhìn xuống sàn, cổ thả lỏng.', 'Giữ nguyên vị trí và thở đều đến hết số giây.', 'Hạ gối xuống nghỉ ngay khi thân bắt đầu võng hoặc mông nhô cao.'],
    'Thở đều và chậm, không nín thở.',
    ['Võng lưng dưới hoặc nhô mông cao.', 'Nín thở.', 'Nhún vai sát tai.']),
  'seated-leg-curl': g(
    ['Chỉnh ghế để trục xoay của máy ngang đầu gối.', 'Ngồi lưng áp vào tựa, đặt đệm trên phần sau cổ chân, chỉnh đệm đùi để giữ chân chắc.', LIGHT],
    ['Nắm tay vịn hai bên.', 'Gập gối để cuốn gót chân xuống và về sau, hết biên độ thoải mái.', 'Dừng một nhịp.', 'Trả về chậm, không để tạ nảy.'],
    'Thở ra khi cuốn, hít vào khi trả về.',
    ['Nhấc mông hoặc ưỡn lưng.', 'Giật tạ bằng đà.', 'Trả về quá nhanh.', 'Chọn tạ quá nặng nên không đi hết biên độ.']),
  'leg-extension': g(
    ['Chỉnh ghế để trục xoay của máy ngang đầu gối.', 'Đặt đệm ở phần dưới cẳng chân, gần cổ chân; lưng áp vào tựa.', LIGHT],
    ['Nắm tay vịn hai bên.', 'Duỗi chân đến khi gần thẳng, không khoá gối mạnh.', 'Dừng một nhịp, siết đùi trước.', 'Hạ xuống chậm.'],
    'Thở ra khi duỗi, hít vào khi hạ.',
    ['Giật tạ bằng đà.', 'Khoá gối mạnh ở đỉnh.', 'Nhấc mông khỏi ghế.', 'Chọn tạ quá nặng. Nếu đau gối, giảm tạ hoặc bỏ bài và hỏi huấn luyện viên.']),
  'db-lateral-raise': g(
    ['Đứng, hai chân rộng bằng vai.', 'Cầm hai tạ nhẹ sát hông, khuỷu hơi gập, ngực mở, bụng siết.', 'Dùng tạ nhẹ hơn bạn nghĩ; bài này không cần tạ nặng.'],
    ['Nâng hai tay sang hai bên, dẫn bằng khuỷu, đến ngang vai.', 'Dừng ngắn ở đỉnh.', 'Hạ chậm về sát hông.', 'Lặp lại mà không đung đưa người.'],
    'Thở ra khi nâng, hít vào khi hạ.',
    ['Dùng tạ nặng rồi vung người lấy đà.', 'Nâng cao quá vai và nhún vai.', 'Chỉ nhấc cổ tay thay vì nâng cả cánh tay.'])
};

export const guideFor = (id: string): ExerciseGuide | undefined => GUIDES[id];
