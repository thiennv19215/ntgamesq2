// =====================================================
//  CẤU HÌNH LỚP HỌC CHỮ: số liệu. Câu cô đọc nằm ở loi-thoai.ts, câu hỏi ở cau-hoi/*.txt
// =====================================================

export const GAME = {
  // Tên lớp mặc định (hiện trên bảng hiệu). Chủ kênh đổi ở ô "Tên lớp" trang điều khiển.
  defaultChannelName: 'Lớp Học Chữ',

  // ---------- Một tiết học ----------
  questionsPerRound: 20,
  // Mỗi phiên live học một chủ đề; chủ kênh chọn chủ đề ở trang điều khiển.
  // Mỗi tiết có 4 câu dễ, 6 câu vừa, 10 câu khó; câu 20 là câu hỏi vàng.
  // Câu tiếng Anh, lịch sử, đố mẹo vẫn thuộc chủ đề riêng khi chủ kênh chọn các nhóm đó.
  roundPlan: [
    'easy', 'easy', 'easy', 'easy',
    'medium', 'medium', 'medium', 'medium', 'medium', 'medium',
    'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard',
  ] as const,
  introSec: 8, // cô giới thiệu đầu tiết
  questionSec: 20, // thời gian trả lời (chủ kênh chốt 20 giây, 2026-11-04)
  activeWindowMs: 120_000,
  // Lớp vắng: 5 phút không ai bình luận / tặng quà / thả tim thì tiết sau là "ôn bài" (hỏi lại câu cũ, để dành câu mới).
  // Có bạn vào lại thì từ câu kế tiếp đổi sang câu mới.
  emptyRoomMs: 5 * 60_000,
  timeGreetEvery: 4, // ngoài lúc đổi buổi, cứ chừng này tiết cô chào theo giờ một lần
  // Lấp khoảng im lặng lúc chờ trả lời câu chữ: cứ chừng này cô làm 1 việc, xoay vòng
  // rủ "ai yêu cô gõ số 1" -> kể chuyện vui / mẹo tiếng Anh -> hỏi bình chọn (miền Bắc gõ B...) -> kể chuyện
  engageEveryMs: 20_000,
  engageOrder: ['love', 'story', 'poll', 'sleep'] as const, // 'sleep': gọi 1 bạn ngủ gật dậy (không ai ngủ thì kể chuyện)
  loveWindowMs: 15_000, // đếm ai gõ trong chừng này rồi cảm ơn / đọc kết quả

  // ---------- Học sinh tương tác trên màn hình ----------
  walkMs: 6000, // học sinh đi lên bảng hoặc bục rồi trở về chỗ
  bubbleMs: 5000, // bong bóng chat trên đầu (không hiện câu trả lời, không hiện câu có từ cấm)
  sleepAfterMs: 5 * 60_000, // ngồi im chừng này thì ngủ gật 💤, thỉnh thoảng cô gọi dậy
  standChance: 0.3, // lúc trêu bạn trả lời sai: tỉ lệ cô phạt lên bục đứng (học sinh cá biệt)
  standSec: 45,
  bonusSec: 10, // hết giờ chưa ai đúng: mở 1 chữ, thêm chừng này giây
  giftChance: 0.4, // tỉ lệ cô thưởng quà cho bạn đúng đầu tiên / đúng 3 câu liền
  deskGifts: 4, // mỗi bàn bày tối đa chừng này món quà (mới nhất)
  warnLeftSec: 5, // còn chừng này giây thì cô nhắc "chuẩn bị hết giờ" (đồng hồ không dừng)
  revealSec: 2, // chốt nhanh đáp án rồi chuyển câu tiếp
  resultsSec: 12,
  superFastSec: 4, // đúng trong 4 giây đầu: cô nghi "quay cóp"

  // ---------- Điểm ----------
  rankPoints: [10, 7, 5, 3, 3, 3, 3, 3, 3, 3], // nhất 10, nhì 7, ba 5, hạng 4–10 được 3 (câu hỏi vàng x2)
  latePoints: 1, // đúng sau hạng 10 (thường là chép đáp án trên khung chat)
  streakEvery: 3, // đúng 3 câu liền
  streakBonus: 5, // thưởng thêm
  requireDiacritics: true, // phải gõ đủ dấu mới tính đúng ("phan" không ăn "phấn"); dấu kiểu cũ/mới đều được
  keepHiddenLetters: 2, // gợi ý không bao giờ mở quá (số chữ - 2)
  roastChance: 0.6, // tỉ lệ cô cà khịa 1 bạn trả lời sai lúc hiện đáp án

  // ---------- Giờ ra chơi (sau mỗi tiết) ----------
  recessPlaySec: { callup: 15, pick: 20, roll: 12, heart: 30 },
  recessResultSec: 5,
  recessBoardSec: 6, // bảng "học sinh giỏi hôm nay"
  callUpPoints: 5, // kiểm tra miệng trả lời đúng
  rollPoints: 3, // điểm danh nhanh
  rollWinners: 10,
  heartTarget: 300, // thử thách thả tim trong 30 giây
  heartBoost: 5, // mỗi tim thật tính thành 5 tim (300 tim chỉ cần 60 tim thật) cho cả lớp dễ thắng; cũng áp cho vỗ tay

  // ---------- Chuyên cần, sinh nhật ----------
  attendMilestones: [3, 5, 7, 10, 14, 21, 30], // đi học liền đủ chừng này ngày thì cô khen to + tặng quà
  birthdayCooldownMs: 60_000, // 2 lần chúc sinh nhật cách nhau ít nhất 1 phút (chống spam)
  birthdayBannerSec: 10,

  championsKept: 50, // nhớ lớp trưởng của chừng này tiết gần nhất (đếm ai làm lớp trưởng nhiều lần)

  seatActiveMs: 10 * 60_000, // cùng điểm: bạn im quá chừng này (thường đã rời live) nhường ghế cho bạn đang tương tác

  // ---------- Lớp ----------
  seats: 25, // 5 dãy bàn có sẵn trên nền; bạn vượt quá số ghế đứng hai bên
  standing: 60, // hết ghế: chen chúc đứng 2 bên ngoài cửa lớp hóng (30 mỗi bên), vẫn tính điểm
  joinKeywords: ['vaolop'],

  // ---------- Quà / tim ----------
  hintGiftCoins: 30, // quà từ 30 xu: cô mở thêm 1 chữ cho cả lớp (khi chưa ai đúng)
  likesPerClap: 300, // đủ 300 tim: cả lớp vỗ tay
  clapSec: 5,
  giftThanksCooldownMs: 30_000,
  bigGiftCoins: 99,

  // ---------- Nói chuyện ----------
  greetEveryMs: 8000,
  namesPerGreeting: 3,
  shareReminderEveryMs: 6 * 60_000,
  idleAfterSec: 75, // không ai comment chừng này giây thì cô nhắc
  // Nhịp giọng: câu chính (đề, đáp án, tổng kết) đọc theo chương trình, đồng hồ dừng trong lúc cô đọc.
  // Câu nói thêm (chào, cảm ơn, cà khịa) chỉ nói lúc đang chờ học sinh trả lời và còn hơn 5 giây.
  chatterMinLeftMs: 5000,
  chatterMaxWaitMs: 35_000, // câu chào chờ được qua 1 vòng câu hỏi, quá thì bỏ
  giftLineMaxWaitMs: 45_000, // cảm ơn quà chờ lâu hơn
};
