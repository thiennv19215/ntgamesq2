// Kiểm tra lõi game: npx tsx src/game/quiz.check.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Classroom, LineBag, teamOf, tierOf, compactVi, dayPeriod, emptyLife, gradeOf, plain, scramble, maskTiles, topicName } from './quiz';
import { parseBank, type Question } from './questions';
import { GAME } from './config';
import { makeMath } from './math';
import { choiceOf, parseCodes, parseMc } from './show';
import { LINES, PICK_TOPICS, POLLS } from './loi-thoai';

const dir = path.join(import.meta.dirname, 'cau-hoi');
const BANK = parseBank(Object.fromEntries(fs.readdirSync(dir).map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')])));
const mk = (answer: string, d: Question['difficulty'] = 'easy', id = answer): Question => ({ id, answer, clue: 'gợi ý', kind: 'Đây là thử.', category: 'x', difficulty: d });
const who = (i: number) => ({ username: `u${i}`, nickname: `Bạn ${i}`, spoken: `Bạn ${i}`, avatar: '' });
const chat = (c: Classroom, i: number, comment: string, createTime: number, now: number) => c.chat({ ...who(i), comment, createTime }, now);
let t = 1_000_000;
// các test cũ chạy không có giờ chọn tổ (bản cô Ngân); phần chia tổ test riêng ở cuối file
const TEAM_SEC = GAME.teamPickSec;
GAME.teamPickSec = 0;
// các test cũ viết cho nhịp cũ; chế độ nhanh (2026-11-04) test riêng ở cuối file
const FAST = { quickRead: GAME.quickRead, closeAfterTopN: GAME.closeAfterTopN, praiseShort: GAME.praiseShort, praiseEvery: GAME.praiseEvery, showEvery: GAME.showEvery, teamPickEvery: GAME.teamPickEvery };
Object.assign(GAME, { quickRead: false, closeAfterTopN: 0, praiseShort: false, praiseEvery: 5, showEvery: 2, teamPickEvery: 1 });

// ---------- chữ ----------
assert.equal(compactVi('  Bảng   Đen! '), 'bảngđen');
assert.equal(plain('Vào Lớp'), 'vaolop');
assert.equal(compactVi('Bảng đen'.normalize('NFD')), 'bảngđen'); // gõ kiểu tổ hợp dấu vẫn khớp
assert.equal(compactVi('hóa học'), compactVi('hoá học')); // dấu kiểu cũ/mới
assert.equal(compactVi('thủy tinh'), compactVi('thuỷ tinh'));
assert.notEqual(compactVi('hoàng'), compactVi('hoang'));
const s = scramble('BẢNG ĐEN', () => 0.3);
assert.deepEqual([...s].sort(), [...'BẢNGĐEN'].sort());
assert.notEqual(s.join(''), 'BẢNGĐEN');
for (const [difficulty, hidden] of [['easy', 4], ['medium', 6], ['hard', 7]] as const) {
  const source = [...'TIẾNGVIỆTX'];
  const masked = maskTiles(source, difficulty, () => 0.3);
  assert.equal(masked.filter((ch) => ch === '?').length, hidden);
  assert.equal(masked.length, source.length);
  assert.deepEqual(source, [...'TIẾNGVIỆTX']);
  masked.forEach((ch, i) => assert.ok(ch === '?' || ch === source[i]));
}
assert.equal(maskTiles(['A', 'B'], 'hard').filter((ch) => ch === '?').length, 1);
assert.deepEqual(maskTiles([], 'hard'), []);

// Đổi nhân vật bằng chat, không mất lượt đoán và không ảnh hưởng điểm/vị trí.
{
  const at = 800_000;
  const c = new Classroom([mk('BẢNG ĐEN')], at);
  c.newRound(at);
  c.tick(at + GAME.introSec * 1000);
  const now = at + GAME.introSec * 1000;
  c.showBoard(now);
  c.enter(who(1), now);
  const seat = c.view(now).seats.find((s) => s.username === 'u1')!.seatIndex;
  chat(c, 1, 'NỮ', now, now);
  assert.equal(c.students.get('u1')!.girl, true);
  assert.equal(c.view(now).seats.find((s) => s.username === 'u1')!.seatIndex, seat);
  assert.ok(c.view(now).movements.filter((m) => m.username === 'u1').every((m) => m.girl));
  chat(c, 1, 'nam', now, now);
  assert.equal(c.students.get('u1')!.girl, false);
  assert.equal(c.stats.attempts, 0);
  c.chat({ ...who(1), comment: 'nữ', createTime: now, safe: false }, now);
  assert.equal(c.students.get('u1')!.girl, false);
  chat(c, 1, c.q!.answer, now, now);
  assert.equal(c.correct[0]?.username, 'u1', 'đổi nhân vật vẫn được trả lời câu hiện tại');
}

// Pháo hoa mỗi 100 Hoa hồng thật: không đếm xu/quà khác hoặc đếm lại tổng combo.
{
  const at = 880_000;
  const c = new Classroom([mk('BẢNG ĐEN')], at);
  c.phase = 'team';
  const deadline = c.phaseEndsAt;
  c.previewTeacherChat(at);
  assert.ok(c.view(at).teacherChat, 'chat vẫn hiện trong bước chọn tổ');
  assert.equal(c.phaseEndsAt, deadline, 'test chat không ảnh hưởng đồng hồ');
  c.phase = 'reveal';
  assert.ok(c.view(at + 1).teacherChat, 'chuyển pha không làm mất thông báo');
  assert.equal(c.view(at + 7000).teacherChat, null);
}
{
  const at = 890_000;
  const c = new Classroom([mk('BẢNG ĐEN')], at);
  c.gift(who(1), 2, at, 2, 'Rose', 2);
  assert.equal(c.view(at).roseFireworks.lightParty, false);
  c.gift(who(1), 3, at + 1, 3, 'Rose', 0);
  assert.equal(c.view(at + 1).roseFireworks.lightParty, false, 'chờ kết thúc combo');
  c.gift(who(1), 0, at + 2, 0, 'Rose', 3);
  assert.equal(c.view(at + 2).roseFireworks.lightParty, true);
  const firedAt = c.view(at + 2).roseFireworks.lightPartyAt;
  c.gift(who(2), 3, at + 3, 3, 'Rose', 3);
  assert.equal(c.view(at + 3).roseFireworks.lightPartyAt, firedAt, 'không khởi động lại liên tục khi đông quà');
  assert.equal(c.view(at + 2202).roseFireworks.lightParty, false);
}
{
  const at = 900_000;
  const c = new Classroom([mk('BẢNG ĐEN')], at);
  c.gift(who(1), 99, at, 99, 'Rose', 0);
  assert.equal(c.view(at).roseFireworks.progress, 99);
  assert.equal(c.view(at).roseFireworks.party, 0);
  c.gift(who(1), 1, at + 1, 1, 'Rose', 0);
  assert.equal(c.view(at + 1).roseFireworks.progress, 0, 'đủ 100 hoa thì reset thanh về 0');
  assert.equal(c.view(at + 1).roseFireworks.party, 100);
  c.gift(who(1), 0, at + 2, 0, 'Rose', 100);
  assert.equal(c.view(at + 2).roseFireworks.total, 100);
  c.gift(who(2), 999, at + 3, 1, 'Doughnut');
  assert.equal(c.view(at + 3).roseFireworks.total, 100);
  assert.equal(c.view(at + 6001).roseFireworks.party, 0);
  c.gift(who(2), 150, at + 6002, 150, 'Rose', 150);
  assert.equal(c.view(at + 6002).roseFireworks.party, 200);
  assert.equal(c.view(at + 6002).roseFireworks.progress, 50);
}

// Tin nhắn sự kiện: đọc đủ thời gian, chống dồn và nhường thông báo quan trọng.
{
  const at = 950_000;
  const c = new Classroom([mk('BẢNG ĐEN')], at);
  c.phaseEndsAt = at + 100_000;
  c.socialChat('follow', who(1), at);
  const first = c.view(at).teacherChat;
  assert.ok(first?.text.includes(who(1).nickname));
  c.socialChat('follow', who(2), at + 1);
  c.socialChat('share', who(3), at + 2);
  assert.deepEqual(c.view(at + 2).teacherChat, first, 'không ghi đè tin đang đọc');
  c.tick(at + 7001);
  assert.ok(c.view(at + 7001).teacherChat?.text.includes(who(3).nickname), 'chia sẻ được hiện ở lượt tiếp');
  c.tick(at + 14_002);
  assert.equal(c.view(at + 14_002).teacherChat, null, 'follow dồn bị giới hạn');
  c.previewTeacherChat(at + 15_000);
  const important = c.view(at + 15_000).teacherChat;
  c.socialChat('like', who(4), at + 15_001);
  assert.deepEqual(c.view(at + 15_001).teacherChat, important);
  c.tick(at + 50_000);
  assert.equal(c.view(at + 50_000).teacherChat, null, 'tin chờ quá lâu được bỏ');
}

// ---------- lời thoại: đủ nhiều, không trùng, bốc hết xấp mới lặp ----------
for (const [key, list] of Object.entries(LINES)) {
  assert.ok(list.length >= 2, `${key}: ít nhất 2 câu`);
  const texts = (list as unknown[]).map((l) => (typeof l === 'function' ? (l as (...a: string[]) => string)('A', 'B') : l));
  assert.equal(new Set(texts).size, texts.length, `${key}: có câu trùng`);
  for (const x of texts as string[]) assert.ok(!/[—–]/.test(x), `${key}: có gạch ngang: ${x}`);
}
assert.ok(PICK_TOPICS.length >= 20);
const bag = new LineBag(() => 0.42);
const seen = new Set<number>();
for (let i = 0; i < 10; i++) seen.add(bag.pick('k', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
assert.equal(seen.size, 10, 'đọc hết 10 câu mới được lặp');
let prev = -1;
for (let i = 0; i < 200; i++) {
  const x = bag.pick('k2', [0, 1, 2, 3]);
  assert.notEqual(x, prev, 'không lặp ngay câu vừa đọc');
  prev = x;
}

// ---------- 1 câu, 1000 người, tới lệch thứ tự ----------
{
  const c = new Classroom([mk('BẢNG ĐEN')], t);
  c.newRound(t);
  const asked = c.tick((t += GAME.introSec * 1000));
  assert.equal(c.phase, 'question');
  assert.ok(asked.some((l) => l.main && l.text.includes('Câu 1.')), 'câu hỏi là câu chính, được đọc trước');
  assert.deepEqual(c.slots(), [null, null, null, null, ' ', null, null, null]);
  chat(c, 9999, 'khó quá', t, t); // nói chuyện thường không bị tính sai
  chat(c, 9999, 'bảng đen', t + 9000, t);
  assert.equal(c.correct.length, 1);
  chat(c, 5000, 'bảng đên', t, t); // sai trước thì không được trả lời lại
  chat(c, 5000, 'bảng đen', t, t);
  assert.ok(!c.correct.some((a) => a.username === 'u5000'));
  chat(c, 5001, 'bang den', t, t); // không dấu không tính
  assert.ok(!c.correct.some((a) => a.username === 'u5001'));
  for (let i = 0; i < 1000; i++) chat(c, i, i < 300 ? 'Bảng Đen' : 'xin chào cô', t + 5000 - i, t + 10);
  assert.equal(c.correct.length, 301);
  assert.equal(c.correct[0].username, 'u299', 'createTime sớm nhất đứng đầu');
  assert.deepEqual(c.correct.slice(0, 4).map((a) => a.points), [10, 7, 5, 3]);
  assert.equal(c.correct[10].points, 1);
  c.tick((t += GAME.questionSec * 1000 + 50));
  assert.equal(c.phase, 'reveal');
  assert.equal(c.students.get('u299')!.score, 10);
  assert.equal(c.students.get('u299')!.session, 10);
  assert.ok(!c.seats().some((s) => s.username === 'u299'), 'điểm cao không đẩy người đang ngồi ra');
  assert.equal(c.weekDelta.get('u299')!.points, 10);
  assert.equal(c.slots(true).join(''), 'BẢNG ĐEN');
  // hết câu (bộ chỉ 1 câu chữ + 4 câu toán tự sinh) -> tổng kết -> ra chơi -> tiết mới xoá điểm tiết, giữ điểm buổi
  for (let k = 0; k < 40 && c.phase !== 'results'; k++) c.tick((t = c.phaseEndsAt));
  assert.equal(c.phase, 'results');
  c.tick((t += GAME.resultsSec * 1000));
  assert.equal(c.phase, 'recess');
  for (let k = 0; k < 3 && c.phase === 'recess'; k++) c.tick((t += 40_000));
  assert.equal(c.phase, 'intro');
  assert.equal(c.students.get('u299')!.score, 0);
  assert.ok(c.students.get('u299')!.session >= 10);
}

// ---------- nhịp giọng: dừng giờ lúc cô đọc, chỉ nói thêm lúc chờ trả lời ----------
{
  const c = new Classroom([mk('MÈO'), mk('CHÓ', 'easy', 'cho')], t);
  c.newRound(t);
  assert.ok(!c.chatterWindow(t), 'đang giới thiệu tiết: không chào');
  c.tick((t += GAME.introSec * 1000));
  const end = c.phaseEndsAt;
  c.hold(4000); // cô đọc đề 4 giây
  assert.equal(c.phaseEndsAt, end + 4000, 'đọc đề xong mới đếm giờ');
  assert.ok(c.chatterWindow(t + 4000), 'đang chờ trả lời: được chào');
  assert.ok(!c.chatterWindow(c.phaseEndsAt - GAME.chatterMinLeftMs + 1), 'sắp hết giờ: không chào');
  c.hold(GAME.maxHoldMs * 3);
  assert.equal(c.phaseEndsAt, end + GAME.maxHoldMs, 'dừng giờ có trần');
  chat(c, 1, c.q!.answer, t + 4000, t + 4000);
  const reveal = c.tick((t = c.phaseEndsAt));
  assert.equal(c.phase, 'reveal');
  assert.ok(reveal.every((l) => l.main), 'lúc hiện đáp án: toàn câu chính, đọc theo chương trình');
  assert.ok(!c.chatterWindow(t), 'đang hiện đáp án: không chào');
}

// ---------- đáp án có chữ "sinh nhật": chấm bài, không bật chúc mừng sinh nhật ----------
{
  const c = new Classroom([mk('SINH NHẬT'), mk('BÁNH SINH NHẬT', 'easy', 'banh')], t);
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  chat(c, 7, c.q!.answer, t, t);
  assert.equal(c.correct[0]?.username, 'u7', `gõ "${c.q!.answer}" phải được tính đúng`);
}
// mỗi câu trong bộ đều gõ đúng đáp án là được tính đúng
for (const q of BANK) {
  const c = new Classroom([q], t);
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  if (c.phase !== 'question' || c.q?.id !== q.id) continue; // câu chỉ hỏi ở vị trí riêng (toán, mẹo...) thì bỏ qua
  chat(c, 1, q.answer, t, t);
  assert.equal(c.correct.length, 1, `${q.id}: gõ đúng đáp án mà không được tính`);
}

// ---------- không ai đúng: mở 1 chữ + thêm giờ ----------
{
  const c = new Classroom([mk('BẢNG ĐEN')], t);
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  c.tick((t += GAME.questionSec * 1000));
  assert.equal(c.phase, 'bonus');
  assert.equal(c.revealed.size, 1);
  c.tick((t += GAME.bonusSec * 1000));
  assert.equal(c.phase, 'reveal');
  // quà KHÔNG cho lợi thế (hintGiftCoins = 0): quà to cũng không mở chữ, chỉ thành hoa cảm ơn
  const g = new Classroom([mk('BẢNG ĐEN')], t);
  g.newRound(t);
  g.tick((t += GAME.introSec * 1000));
  for (let i = 0; i < 20; i++) g.gift(who(1), 999, t);
  assert.equal(g.revealed.size, 0, 'quà không mở chữ');
  assert.equal(g.flowers, 20);
  g.gift(who(1), 1, t, 1, 'Rose');
  assert.equal(g.revealed.size, 0, 'chưa hiện bảng thì hoa chưa mở ô');
  g.showBoard(t);
  const tilesBefore = g.view(t).tiles;
  const hiddenBefore = tilesBefore.filter((ch) => ch === '?').length;
  const hintSaid = g.gift(who(1), 1, t, 1, 'Rose');
  assert.equal(g.view(t).tiles.filter((ch) => ch === '?').length, hiddenBefore - 1, 'hoa mở một dấu hỏi ở hàng trên');
  g.view(t).tiles.forEach((ch, i) => assert.ok(ch === tilesBefore[i] || (tilesBefore[i] === '?' && ch === g.tiles[i]), 'chữ mở đúng vị trí, không xáo lại'));
  assert.equal(g.revealed.size, 0, 'hoa không điền vào ô đáp án phía dưới');
  assert.ok(hintSaid.some((l) => l.main && l.text.includes(who(1).spoken) && l.text.includes('ô chữ')), 'đọc rõ tên người mở ô');
  g.gift(who(1), 10, t, 1, 'Finger Heart');
  assert.equal(g.view(t).tiles.filter((ch) => ch === '?').length, hiddenBefore - 1, 'quà khác không mở chữ');
  for (let i = 0; i < 20; i++) g.gift(who(1), 1, t, 1, 'Rose');
  assert.deepEqual(g.view(t).tiles, g.tiles, 'mở hết dấu hỏi ở hàng trên');
  assert.equal(g.revealed.size, 0, 'ô đáp án vẫn để người chơi tự đoán');
}

// Thiết lập riêng mỗi phòng; ẩn bảng không tắt cơ chế, combo hoàn tất mở chữ đúng mốc.
{
  const at = 490_000;
  const c = new Classroom([mk('BẢNG ĐEN')], at);
  assert.equal(c.setRoseSettings({ visible: false, hint: 3, deputy: 7, leader: 15, teacher: 30 }), true);
  assert.equal(c.setRoseSettings({ visible: true, hint: 1, deputy: 15, leader: 7, teacher: 30 }), false);
  assert.equal(c.view(at).roseSettings.visible, false);
  c.newRound(at);
  c.tick(at + GAME.introSec * 1000);
  c.showBoard(at + GAME.introSec * 1000);
  const now = at + GAME.introSec * 1000;
  const hidden = () => c.view(now).tiles.filter((ch) => ch === '?').length;
  const before = hidden();
  c.gift(who(1), 2, now, 2, 'Rose', 0);
  assert.equal(hidden(), before);
  c.gift(who(1), 0, now, 0, 'Rose', 3);
  assert.equal(hidden(), before - 1);
  const roleAndHint = c.gift(who(1), 15, now, 15, 'Rose');
  assert.equal(roleAndHint.length, 0, 'nhận vai và mở chữ gộp vào lượt cảm ơn lúc rảnh');
  assert.equal(c.view(now).roleHolders.find((r) => r.label === 'Lớp trưởng')?.username, 'u1', 'vai đổi ngay giữa câu');
  assert.ok(c.takeRoleNotice(now)?.text.includes('chữ gợi ý'), 'nhận vai gộp luôn việc mở chữ');
  assert.ok(c.view(now).teacherChat?.text.includes(who(1).nickname), 'bảng chat công bố ngay khi đang hỏi');
  assert.equal(c.view(now + 7000).teacherChat, null, 'bảng chat tự tắt sau 7 giây');
  c.gift(who(2), 18, now, 18, 'Rose');
  assert.ok(c.view(now).teacherChat?.text.includes(who(2).nickname), 'thông báo mới thay thông báo cũ');
  c.gift(who(3), 17, now, 17, 'Rose');
  const announced: string[] = [];
  for (let i = 0; i < 100 && c.phase !== 'results'; i++) announced.push(...c.skip(now + i + 1).map((l) => l.text));
  assert.equal(c.phase, 'results');
  assert.equal(c.view(now + 101).roleHolders.find((r) => r.label === 'Lớp trưởng')?.username, 'u3', 'đủ mốc là đổi dù combo thấp hơn người cũ');
  assert.equal(announced.filter((text) => text.includes('Lớp trưởng')).length, 0, 'không chen vào câu chính hoặc tổng kết');
  const latestNotice = c.takeRoleNotice(now + 101);
  assert.ok(latestNotice && !latestNotice.main && latestNotice.text.includes(who(3).spoken), 'lúc rảnh chỉ đọc người đang giữ vai');
  assert.equal(c.takeRoleNotice(now + 102), null, 'không còn thông báo người cũ');
}

// Xét riêng từng combo; đủ mốc thay vai ngay, chỉ cô giáo hết hạn.
{
  const c = new Classroom([mk('BẢNG ĐEN')], 499_000);
  assert.deepEqual(c.gift(who(1), 1, 499_000, 1, 'Rose', 0), [], 'đợi hết combo, không đọc cảm ơn hoa trước');
  const said = c.gift(who(1), 0, 499_010, 0, 'Rose', 10);
  assert.equal(said.length, 0);
  assert.ok(c.takeRoleNotice(499_010)?.text.includes('Lớp trưởng'));
}
{
  const at = 500_000;
  const c = new Classroom([mk('BẢNG ĐEN')], at);
  const role = (now: number, user = 'u1') => c.view(now).seats.find((s) => s.username === user)?.roseRole;
  c.gift(who(1), 4, at, 4, 'Rose');
  assert.equal(role(at), null);
  c.gift(who(1), 1, at + 10, 1, 'Rose');
  assert.equal(role(at + 10), null, '4 + 1 hoa riêng không thành combo 5');
  c.gift(who(1), 5, at + 20, 5, 'Rose');
  const deputySaid = c.takeRoleNotice(at + 20);
  assert.ok(deputySaid && !deputySaid.main && deputySaid.text.includes('Lớp phó') && deputySaid.text.includes(who(1).spoken));
  assert.equal(role(at + 20)?.label, 'Lớp phó');
  c.gift(who(1), 10, at + 30, 10, 'Rose');
  assert.equal(role(at + 30)?.label, 'Lớp trưởng');
  assert.equal(role(at + 30)?.expiresAt, null);
  c.gift(who(2), 10, at + 40, 10, 'Rose');
  assert.equal(role(at + 40)?.label, 'Lớp phó', 'bằng combo thì người đến sau thay vai');
  assert.equal(role(at + 40, 'u2')?.label, 'Lớp trưởng');
  c.gift(who(1), 10, at + 45, 10, 'Rose');
  assert.equal(role(at + 45)?.label, 'Lớp trưởng');
  c.gift(who(2), 11, at + 50, 11, 'Rose');
  const replacementSaid = c.takeRoleNotice(at + 50);
  assert.ok(replacementSaid && !replacementSaid.main && replacementSaid.text.includes('Lớp trưởng mới') && replacementSaid.text.includes(who(2).spoken) && replacementSaid.text.includes(who(1).spoken));
  assert.equal(role(at + 50, 'u2')?.label, 'Lớp trưởng');
  assert.equal(c.view(at + 50).roleHolders.find((r) => r.label === 'Lớp trưởng')?.username, 'u2', 'bảng hiệu đổi sang lớp trưởng mới');
  assert.equal(role(at + 50)?.label, 'Lớp phó', 'vai lớp trưởng cũ được gỡ');
  assert.equal(role(at + GAME.roseRoleMs + 60, 'u2')?.label, 'Lớp trưởng', 'lớp trưởng không hết hạn');
  c.gift(who(1), 20, at + 70, 20, 'Rose');
  const teacherSaid = c.takeRoleNotice(at + 70);
  assert.ok(teacherSaid && !teacherSaid.main && teacherSaid.text.toLowerCase().includes('cô giáo') && teacherSaid.text.toLowerCase().includes('hai phút') && teacherSaid.text.includes(who(1).spoken) && !teacherSaid.text.includes('Hoa hồng'));
  assert.equal(role(at + 70)?.label, 'Cô giáo');
  assert.equal(role(at + 70)?.expiresAt, at + 70 + GAME.roseRoleMs);
  assert.equal(c.view(at + 70).roleHolders.find((r) => r.label === 'Cô giáo')?.username, 'u1', 'nhân vật trên bục là người nhận vai');
  assert.equal(role(at + 70 + GAME.roseRoleMs)?.label, 'Lớp phó');
  assert.ok(!c.view(at + 70 + GAME.roseRoleMs).roleHolders.some((r) => r.label === 'Cô giáo'), 'hết giờ trả bục về cô Ngân');
  c.gift(who(3), 20, at + 80, 20, 'Rose');
  assert.equal(role(at + 80, 'u3')?.label, 'Cô giáo', 'x20 đến sau nhận vai cô giáo');
  assert.equal(role(at + 80, 'u3')?.expiresAt, at + 80 + GAME.roseRoleMs, 'người mới có đủ hai phút');
  assert.equal(role(at + 80)?.label, 'Lớp phó', 'gỡ vai cô giáo của người cũ');
  c.gift(who(3), 21, at + 90, 21, 'Rose');
  assert.equal(role(at + 90, 'u3')?.label, 'Cô giáo');
  c.gift(who(1), 20, at + 95, 20, 'Rose');
  assert.equal(role(at + 95)?.label, 'Cô giáo', 'x20 vẫn thay được người giữ vai bằng x21');
  assert.equal(role(at + 95, 'u3'), null);
  c.gift(who(4), 1, at + 100, 1, 'Rose', 0);
  assert.equal(role(at + 100, 'u4'), null, 'combo chưa kết thúc không xét vai');
  const flowers = c.flowers;
  c.gift(who(4), 0, at + 110, 0, 'Rose', 6);
  assert.equal(role(at + 110, 'u4')?.label, 'Lớp phó');
  assert.equal(c.flowers, flowers, 'báo kết thúc combo không tính thêm quà');
}

// ---------- tiết thật: 20 câu, 5 dễ 6 vừa 5 khó + 4 câu toán (câu 5, 10, 15, 19); câu 20 nhân đôi; chuỗi 3 câu ----------
{
  const c = new Classroom(BANK, t);
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  const plan: string[] = [];
  const cats: string[] = [];
  for (let k = 0; k < GAME.questionsPerRound; k++) {
    assert.equal(c.phase, 'question');
    const q = c.q!;
    plan.push(q.math ? GAME.roundPlan[k] : (q.slot ?? q.difficulty));
    if (!q.math) cats.push(q.slot === 'meo' ? `${q.category}#${k}` : q.category); // 2 câu đố mẹo liền nhau là cố ý (tiết mục giữa tiết)
    else {
      assert.match(q.answer, /^\d+$/, 'câu toán: đáp án là số');
      assert.equal(c.tiles.length, 0, 'câu toán không xáo chữ');
      assert.ok(c.view(t).math.endsWith('= ?'));
    }
    if (k === GAME.questionsPerRound - 1) assert.ok(c.golden, 'câu 20 là câu hỏi vàng');
    else assert.ok(!c.golden);
    chat(c, 1, q.answer, t, t);
    if (k === GAME.questionsPerRound - 1) assert.equal(c.correct[0].points, 20);
    c.tick((t += GAME.questionSec * 1000 + 1));
    c.tick((t += GAME.revealSec * 1000));
    // câu 5, 10, 15: cô dừng lại điểm danh, tặng quà rồi mới ra câu tiếp
    if ((k + 1) % GAME.praiseEvery === 0 && k + 1 < GAME.questionsPerRound) {
      assert.equal(c.phase, 'praise', `dừng điểm danh sau câu ${k + 1}`);
      assert.equal(c.view(t).praiseTop[0].username, 'u1');
      c.tick((t += GAME.praiseSec * 1000));
    }
  }
  assert.ok(c.students.get('u1')!.desk.length >= 3, 'quà điểm danh đặt lên bàn');
  assert.ok(c.students.get('u1')!.desk.length <= GAME.deskGifts);
  assert.deepEqual(plan, [...GAME.roundPlan]);
  for (let i = 1; i < cats.length; i++) assert.notEqual(cats[i], cats[i - 1], 'không 2 câu chữ liền cùng chủ đề');
  // 19 câu x 10 + câu vàng 20 + 3 mốc chuỗi (câu 5, 12, 17) x 5
  assert.equal(c.students.get('u1')!.score, 19 * 10 + 20 + 3 * GAME.streakBonus);
  assert.equal(c.phase, 'results');
  assert.equal(c.usedLog.length, 16, 'câu toán không ghi vào sổ lớp');
}

// ---------- câu toán: đáp án đúng phép tính, luôn là số dương ----------
for (const lv of [1, 2, 3, 4] as const) {
  for (let i = 0; i < 500; i++) {
    const q = makeMath(lv);
    const expr = q.math!.show.replace(' = ?', '').replace(/×/g, '*').replace(/−/g, '-').replace(/:/g, '/');
    const n = Function(`return ${expr}`)() as number;
    assert.equal(String(n), q.answer, q.math!.show);
    assert.ok(Number.isInteger(n) && n > 0, q.math!.show);
  }
}

// ---------- đọc đề xong cô hô bắt đầu; còn 5 giây cô nhắc, đồng hồ không dừng ----------
{
  const c = new Classroom(BANK, t);
  c.newRound(t);
  const start = c.tick((t += GAME.introSec * 1000));
  assert.equal(c.phase, 'question');
  assert.ok(LINES.go.includes(start[start.length - 1].text.slice(3)), 'câu cuối lúc ra đề là hô bắt đầu');
  assert.ok(start[start.length - 1].go);
  assert.ok(start.every((l) => l.main));
  // cô đang đọc đề (đồng hồ dừng): chưa hiện bảng chữ; hô bắt đầu mới hiện
  c.hold(3000);
  c.tick(t);
  assert.equal(c.view(t).boardShown, false, 'đang đọc đề: chưa hiện chữ');
  c.showBoard();
  assert.equal(c.view(t).boardShown, true);
  assert.ok(!c.tick((t = c.phaseEndsAt - GAME.warnLeftSec * 1000 - 500)).some((l) => l.warn));
  const warn = c.tick((t += 600));
  assert.equal(warn.filter((l) => l.warn).length, 1);
  assert.ok(!warn.some((l) => l.warn && l.main), 'nhắc giờ không dừng đồng hồ');
  assert.ok(!c.tick((t += 200)).some((l) => l.warn), 'chỉ nhắc 1 lần');
}

// ---------- không hỏi lại câu đã hỏi gần đây ----------
{
  const history: Record<string, number> = {};
  const c = new Classroom(BANK, t, Math.random, history);
  const asked = new Set<string>();
  // chưa tới lúc hết câu dễ / câu đố mẹo (loại nào ít hơn thì hết trước)
  const perRound = (d: string) => GAME.roundPlan.filter((x) => x === d).length;
  const easy = BANK.filter((q) => q.difficulty === 'easy' && !q.slot).length;
  const ofSlot = (s: string) => BANK.filter((q) => q.slot === s).length;
  const rounds = Math.min(Math.floor(easy / perRound('easy')), ...['meo', 'su', 'anh', 'dh'].map((s) => Math.floor(ofSlot(s) / perRound(s)))) - 2;
  for (let r = 0; r < rounds; r++) {
    c.newRound((t += 1000));
    for (const id of c.usedLog.splice(0)) {
      assert.ok(!asked.has(id), `câu ${id} bị hỏi lại ở tiết ${r + 1}`);
      asked.add(id);
    }
  }
  // buổi live sau (đọc sổ cũ) cũng không hỏi lại
  const next = new Classroom(BANK, t, Math.random, { ...history });
  next.newRound(t);
  const fresh = next.usedLog.filter((id) => !asked.has(id)).length;
  assert.equal(fresh, next.usedLog.length, 'buổi sau vẫn ưu tiên câu chưa hỏi');
  console.log(`  ${rounds} tiết liền (${asked.size} câu) không lặp câu nào`);
}

// ---------- giờ ra chơi ----------
const recessOf = (game: 'rps' | 'callup' | 'pick' | 'roll' | 'heart', seed = 0.1) => {
  const c = new Classroom([mk('MÈO'), mk('CHÓ', 'easy', 'cho')], t, () => seed);
  c.newRound(t);
  for (let i = 0; i < 5; i++) chat(c, i, 'chào cô', t, t); // vào lớp, vừa hoạt động
  c.forceRecess(game, t);
  return c;
};
{
  // oẳn tù tì: cô ra theo rand; thắng cô +2 điểm buổi, không đụng điểm tiết
  const c = recessOf('rps', 0.1); // rand 0.1 -> cô ra "búa"
  chat(c, 1, 'bao', t, t);
  chat(c, 2, 'Kéo', t, t);
  chat(c, 1, 'kéo', t, t); // đổi ý không tính
  c.tick((t += GAME.recessPlaySec.rps * 1000));
  assert.equal(c.view(t).recess!.teacher, 'búa');
  assert.equal(c.students.get('u1')!.session, GAME.rpsPoints);
  assert.equal(c.students.get('u1')!.score, 0);
  assert.equal(c.students.get('u2')!.session, 0);
  c.tick((t += GAME.recessResultSec * 1000));
  assert.equal(c.recess!.stage, 'board');
  c.tick((t += GAME.recessBoardSec * 1000));
  assert.equal(c.phase, 'intro');
}
{
  // kiểm tra miệng: chỉ bạn được gọi mới được trả lời, đúng +5, chốt ngay
  const c = recessOf('callup');
  assert.equal(c.recess!.game, 'callup');
  const target = c.recess!.callTarget!;
  const answer = c.recess!.callQ!.answer;
  const other = [...c.students.values()].find((u) => u.username !== target.username)!;
  c.chat({ ...other, comment: answer, createTime: t }, t);
  assert.equal(c.recess!.callResult, '');
  c.chat({ ...target, comment: answer, createTime: t }, t);
  assert.equal(c.recess!.callResult, 'right');
  c.tick(t);
  assert.equal(c.students.get(target.username)!.session, GAME.callUpPoints);
}
{
  // chọn phe: đếm 1/2, mỗi người 1 phiếu
  const c = recessOf('pick');
  chat(c, 1, '1', t, t);
  chat(c, 2, '2', t, t);
  chat(c, 3, '1', t, t);
  chat(c, 1, '2', t, t);
  assert.deepEqual(c.view(t).recess!.votes, [2, 1]);
  const out = c.tick((t += GAME.recessPlaySec.pick * 1000));
  assert.ok(out.some((l) => l.text.includes('67')), 'đọc phần trăm phe thắng');
}
{
  // điểm danh: 10 bạn gõ "có mặt" sớm nhất (theo giờ TikTok) +3
  const c = recessOf('roll');
  for (let i = 0; i < 15; i++) chat(c, 100 + i, 'Có mặt!', t + 100 - i, t);
  c.tick((t += GAME.recessPlaySec.roll * 1000));
  assert.equal(c.students.get('u114')!.session, GAME.rollPoints);
  assert.equal(c.students.get('u100')!.session, 0);
}
{
  // thả tim: mỗi tim thật tính x heartBoost, đủ mốc thì ai vừa hoạt động +1
  const c = recessOf('heart');
  c.like(GAME.heartTarget / GAME.heartBoost - 1, t, false);
  c.like(1, t, false);
  assert.equal(c.recess!.hearts, GAME.heartTarget, '60 tim thật x5 = 300');
  c.tick((t += GAME.recessPlaySec.heart * 1000));
  assert.equal(c.students.get('u1')!.session, 1);
}

// Lớp trưởng theo điểm mặc định; Hoa hồng thay thế, không có hai lớp trưởng.
{
  const at = 600_000;
  const c = new Classroom([mk('BẢNG ĐEN')], at);
  for (let i = 1; i <= 3; i++) c.enter(who(i), at);
  c.students.get('u1')!.score = 10;
  let v = c.view(at);
  assert.equal(v.roleHolders.find((r) => r.label === 'Lớp trưởng')?.username, 'u1');
  assert.equal(v.roleHolders.find((r) => r.label === 'Lớp trưởng')?.source, 'score');
  c.gift(who(2), 10, at + 1, 10, 'Rose', 10);
  assert.ok(c.takeRoleNotice(at + 1)?.text.includes(who(1).spoken), 'cô thông báo thay lớp trưởng theo điểm');
  c.students.get('u3')!.score = 100;
  v = c.view(at + 2);
  assert.deepEqual(v.roleHolders.filter((r) => r.label === 'Lớp trưởng').map((r) => r.username), ['u2']);
  assert.deepEqual(v.seats.filter((s) => s.title === 'lop-truong').map((s) => s.username), ['u2']);
  c.gift(who(3), 10, at + 3, 10, 'Rose', 10);
  v = c.view(at + 3);
  assert.deepEqual(v.roleHolders.filter((r) => r.label === 'Lớp trưởng').map((r) => r.username), ['u3']);
}

// ---------- lớp trưởng: đổi người thì cô thông báo ----------
{
  const c = new Classroom([mk('MÈO'), mk('CHÓ', 'easy', 'cho'), mk('GÀ', 'easy', 'ga')], t);
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  const said: string[] = [];
  const step = () => {
    said.push(...c.tick((t += GAME.questionSec * 1000 + 1)).map((l) => l.text));
    c.tick((t += GAME.revealSec * 1000));
  };
  chat(c, 1, c.q!.answer, t, t);
  step();
  chat(c, 2, c.q!.answer, t, t);
  chat(c, 1, c.q!.answer, t + 1, t);
  step();
  chat(c, 2, c.q!.answer, t, t);
  said.push(...c.tick((t += GAME.questionSec * 1000 + 1)).map((l) => l.text));
  assert.equal(c.view(t).seats.find((x) => x.username === 'u2')!.title, 'lop-truong');
  assert.ok(said.some((l) => l.includes('Bạn 2') && /lớp trưởng/i.test(l)), 'cô báo lớp trưởng mới');
}

// ---------- lớp trưởng chỉ tính điểm tiết này; tiết mới tranh lại từ đầu ----------
{
  const c = new Classroom([mk('MÈO'), mk('CHÓ', 'easy', 'cho')], t);
  const playRound = (winner: number) => {
    c.newRound(t);
    for (let k = 0; k < 200 && c.phase !== 'results'; k++) {
      if (c.phase === 'question' && c.correct.length === 0) chat(c, winner, c.q!.answer, t, t);
      c.tick((t = c.phaseEndsAt));
    }
  };
  playRound(1);
  assert.equal(c.view(t).seats.find((s) => s.username === 'u1')!.title, 'lop-truong');
  playRound(2);
  assert.equal(c.view(t).seats.find((s) => s.username === 'u2')!.title, 'lop-truong', 'tiết 2: bạn thắng tiết 2 làm lớp trưởng');
  assert.equal(c.view(t).seats.find((s) => s.username === 'u1')?.title ?? '', '', 'điểm tiết trước không còn tính');
  c.newRound(t);
  assert.ok(c.view(t).seats.every((s) => s.title === ''), 'đầu tiết: chưa ai là lớp trưởng');
  assert.deepEqual(
    c.view(t).champions.map((x) => [x.round, x.username]),
    [
      [2, 'u2'],
      [1, 'u1'],
    ],
  );
}

// ---------- lớp vắng: ôn bài bằng câu cũ, có bạn vào thì đổi sang câu mới ----------
{
  const history: Record<string, number> = {};
  const c = new Classroom(BANK, t, Math.random, history);
  c.newRound(t); // tiết 1: còn người (vừa mở), câu mới
  assert.ok(!c.review);
  const asked = new Set(c.usedLog.splice(0));
  t += GAME.emptyRoomMs + 1000; // 5 phút không ai làm gì
  const said = c.newRound(t);
  assert.ok(c.review, 'lớp vắng: tiết ôn bài');
  assert.ok(said.some((l) => LINES.reviewIntro.includes(l.text.slice(3))));
  assert.equal(c.usedLog.length, 0, 'ôn bài không tốn câu mới');
  const qs = (c as unknown as { roundQs: Question[] }).roundQs;
  assert.ok(qs.filter((q) => !q.math).every((q) => asked.has(q.id)), 'ôn bài chỉ hỏi câu đã hỏi');
  c.tick((t += GAME.introSec * 1000)); // câu 1 (ôn)
  chat(c, 1, 'cô ơi', t, t); // có bạn vào
  for (let k = 0; k < 5 && c.qNo < 2; k++) c.tick((t = c.phaseEndsAt));
  assert.equal(c.qNo, 2);
  assert.ok(!c.review, 'có bạn vào: hết ôn bài');
  assert.ok(c.usedLog.length > 0, 'phần còn lại là câu mới');
  assert.ok(c.view(t).review === false);
}

// ---------- đọc đề: nói số chữ cái + loại từ trước, hô bắt đầu xong mới hiện chữ ----------
{
  const c = new Classroom(BANK, t);
  const q = (answer: string, kind: string, slot?: 'anh' | 'su') => ({ ...mk(answer), kind, slot });
  assert.equal(c.intro(q('BẢNG ĐEN', 'Đây là thứ ở trường lớp.')), 'Đây là một từ gồm 7 chữ cái, là thứ ở trường lớp.');
  assert.equal(c.intro(q('NGÔ QUYỀN', 'Câu lịch sử nè.', 'su')), 'Câu lịch sử nè. Đây là một từ gồm 8 chữ cái.');
  assert.equal(c.intro(q('CAT', 'Câu tiếng Anh nè.', 'anh')), 'Câu tiếng Anh nè. Đây là một từ tiếng Anh gồm 3 chữ cái.');
}

// ---------- "ai yêu cô thì gõ số 1": rủ lúc chờ trả lời câu chữ, đếm, cảm ơn ----------
{
  const c = new Classroom([mk('BẢNG ĐEN'), mk('CÁI BÀN', 'easy', 'ban')], t);
  t += GAME.engageEveryMs; // đã lâu chưa rủ
  for (let i = 0; i < 5; i++) chat(c, i, 'hi', t, t); // giữ lớp không vắng
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  c.showBoard();
  const call = c.tick(t);
  assert.ok(call.some((l) => LINES.loveCall.includes(l.text.slice(3))), 'cô rủ gõ số 1');
  assert.ok(call.every((l) => !l.main), 'câu nói thêm, không dừng đồng hồ');
  chat(c, 1, '1', t + 1000, t + 1000);
  chat(c, 1, '1', t + 1000, t + 1000); // gõ 2 lần chỉ tính 1
  chat(c, 2, '1', t + 2000, t + 2000);
  assert.equal(c.view(t).loveFans, 2);
  assert.equal(c.correct.length + c.view(t).stats.attempts, 0, 'gõ số 1 không bị tính là trả lời');
  const thanks = c.tick((t += GAME.loveWindowMs));
  assert.ok(thanks.some((l) => l.text.includes('2 bạn') || l.text.includes('2 bạn nhỏ')), 'cô cảm ơn kèm số bạn');
  assert.equal(c.love, null);

  // lượt sau: kể chuyện vui; lượt sau nữa: bình chọn, đếm phiếu, đọc kết quả
  const nextTurn = () => {
    t += GAME.engageEveryMs;
    for (let i = 0; i < 5; i++) chat(c, i, 'hi', t, t);
    c.newRound(t);
    c.tick((t += GAME.introSec * 1000));
    c.showBoard();
    return c.tick(t);
  };
  assert.ok(nextTurn().some((l) => LINES.funFact.includes(l.text.slice(3))), 'cô kể chuyện vui');
  const ask = nextTurn();
  assert.ok(c.poll, 'cô hỏi bình chọn');
  assert.ok(ask.some((l) => POLLS.some((p) => p.ask === l.text.slice(3))));
  const [a, b] = c.poll!.opts;
  chat(c, 1, a.key.toUpperCase(), t, t);
  chat(c, 2, a.key, t, t);
  chat(c, 3, b.key, t, t);
  chat(c, 3, a.key, t, t); // đổi ý không tính
  assert.equal(c.view(t).poll!.find((o) => o.key === a.key)!.n, 2);
  assert.equal(c.view(t).stats.attempts, 0, 'gõ 1 chữ không bị tính là trả lời');
  const result = c.tick((t += GAME.loveWindowMs));
  assert.ok(result.some((l) => l.text.includes(a.label) && l.text.includes('2')), 'cô đọc kết quả bình chọn');
}

// ---------- học sinh tương tác: bong bóng chat, tặng hoa đi lên bục, phạt lên bục, ngủ gật ----------
{
  const c = new Classroom([mk('BẢNG ĐEN'), mk('CÁI BÀN', 'easy', 'ban')], t, () => 0); // rand 0: luôn trêu, luôn phạt
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  const seat = (u: string) => c.view(t).seats.find((s) => s.username === u)!;
  chat(c, 1, 'cô ơi con đói', t, t);
  assert.equal(seat('u1').bubble, 'cô ơi con đói', 'bình luận thường hiện bong bóng');
  chat(c, 2, 'X'.repeat(c.answerLetters.length), t, t);
  assert.equal(seat('u2').bubble, 'X'.repeat(c.answerLetters.length), 'câu trả lời cũng hiện bong bóng');
  c.chat({ ...who(3), comment: 'tục tĩu', createTime: t, safe: false }, t);
  assert.equal(c.students.get('u3')!.bubble?.text ?? '', '', 'bình luận có từ cấm không hiện');
  assert.equal(c.view(t + GAME.bubbleMs).seats.find((s) => s.username === 'u1')!.bubble, '', 'bong bóng tự tắt');
  // tặng hoa: đi lên bục, đang đi thì bạn khác tặng không chen
  c.gift(who(1), 1, t);
  c.gift(who(3), 1, t + 500);
  assert.equal(c.view(t).walk!.username, 'u1');
  assert.equal(c.view(t + GAME.walkMs).walk, null);
  c.tick((t = c.phaseEndsAt));
  for (let k = 0; k < 3 && c.phase !== 'reveal'; k++) c.tick((t = c.phaseEndsAt));
  assert.ok(c.view(t).punished.some((s) => s.username === 'u2'), 'sai lên đứng cạnh bảng');
  assert.ok(seat('u2').standing);
  // ngồi im lâu: ngủ gật
  assert.ok(c.view(t + GAME.sleepAfterMs + 1).seats.every((s) => !s.sleeping), 'không dùng mốc 5 phút để đuổi học sinh');
}

// ---------- xếp ghế: cùng điểm thì bạn đang tương tác ngồi trước bạn đã im lâu ----------
{
  const c = new Classroom(BANK, t);
  chat(c, 1, 'hi', t, t); // vào trước nhưng sau đó im
  chat(c, 2, 'hi', t + 1000, t + 1000);
  assert.equal(c.seats()[0].username, 'u1', 'cùng điểm, cùng còn ở: ai vào trước ngồi trước');
  t += GAME.seatActiveMs + 5000;
  chat(c, 2, 'cô ơi', t, t);
  c.tick(t);
  assert.equal(c.seats()[0].username, 'u1', 'bình luận không làm đổi chỗ khi bằng điểm');
}

// ---------- chào theo giờ ----------
{
  const at = (h: number) => new Date(2026, 10, 4, h, 30).getTime();
  assert.deepEqual([6, 11, 15, 19, 23, 2].map((h) => dayPeriod(at(h))), ['sang', 'trua', 'chieu', 'toi', 'khuya', 'khuya']);
  const c = new Classroom(BANK, at(7));
  const first = c.newRound(at(7)).map((l) => l.text.slice(3));
  assert.ok(first.some((x) => LINES.timeMorning.includes(x)), 'tiết đầu: chào buổi sáng');
  const night = c.newRound(at(23)).map((l) => l.text.slice(3));
  assert.ok(night.some((x) => LINES.timeNight.includes(x)), 'đổi buổi: chào khuya');
}

// ---------- nút "Bỏ câu này": sang câu tiếp, không ai được điểm, không bao giờ hỏi lại ----------
{
  const c = new Classroom(BANK, t);
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  const bad = c.q!;
  chat(c, 1, bad.answer, t, t);
  const said = c.banCurrent(t);
  assert.ok(said.some((l) => LINES.banned.includes(l.text.slice(3))), 'cô nói bỏ câu');
  assert.equal(c.qNo, 2, 'sang câu tiếp liền');
  assert.equal(c.students.get('u1')!.score, 0, 'câu bị bỏ không tính điểm');
  assert.deepEqual(c.banLog.map((b) => b.id), [bad.id]);
  // buổi sau đọc sổ: câu bị bỏ không bao giờ ra nữa
  const next = new Classroom(BANK.filter((q) => q.difficulty === bad.difficulty && !q.slot).slice(0, 30).concat(bad), t, Math.random, {}, [bad.id]);
  for (let r = 0; r < 5; r++) {
    next.newRound((t += 1000));
    assert.ok(!next.usedLog.splice(0).includes(bad.id), 'câu bị bỏ bị hỏi lại');
  }
  // câu toán tự sinh thì không bỏ được (không có trong file)
  const m = new Classroom([], t);
  m.newRound(t);
  m.tick((t += GAME.introSec * 1000));
  assert.ok(m.q?.math);
  assert.deepEqual(m.banCurrent(t), []);
}

// ---------- phòng vắng: có người đúng thì 8 giây sau chốt; phòng đông thì đủ giờ ----------
{
  const small = new Classroom([mk('MÈO'), mk('CHÓ', 'easy', 'cho')], t);
  small.newRound(t);
  small.tick((t += GAME.introSec * 1000));
  chat(small, 1, small.q!.answer, t, t);
  assert.equal(small.phaseEndsAt, t + GAME.smallRoomEndAfterSec * 1000);
  const big = new Classroom([mk('MÈO'), mk('CHÓ', 'easy', 'cho')], t);
  big.newRound(t);
  big.tick((t += GAME.introSec * 1000));
  const end = big.phaseEndsAt;
  for (let i = 10; i < 10 + GAME.smallRoomPlayers; i++) chat(big, i, 'xin chào', t, t);
  chat(big, 1, big.q!.answer, t, t);
  assert.equal(big.phaseEndsAt, end, 'phòng đông: chạy đủ giờ');
}

// ---------- sinh nhật: bánh kem lên bàn, vỗ tay, mỗi bạn 1 lần, cách nhau 1 phút ----------
{
  const c = new Classroom(BANK, t);
  c.newRound(t);
  assert.equal(chat(c, 1, 'chúc mừng sinh nhật bạn ấy', t, t).length, 0, 'chúc người khác thì không tính');
  const said = chat(c, 1, 'Hôm nay sinh nhật con cô ơi', t, t);
  assert.equal(said.length, 1);
  assert.ok(said[0].priority && !said[0].main, 'nói chen lúc chờ trả lời, không cắt ngang đề');
  assert.equal(c.students.get('u1')!.desk.at(-1)!.icon, '🎂');
  assert.ok(c.view(t).clapping);
  assert.equal(c.view(t).birthday!.nickname, 'Bạn 1');
  assert.equal(chat(c, 2, 'sinh nhật mình nè', t + 1000, t + 1000).length, 0, 'chưa đủ 1 phút');
  assert.equal(chat(c, 1, 'sinh nhật con mà', t + 120_000, t + 120_000).length, 0, 'mỗi bạn 1 lần');
  assert.equal(chat(c, 2, 'sinh nhật mình nè', t + 120_000, t + 120_000).length, 1);
}

// ---------- chuyên cần: ngày thứ 2 cô nhận ra, mốc đẹp thì có quà ----------
{
  const c = new Classroom(BANK, t);
  assert.equal(c.attendance(who(1), 1, t).length, 0, 'ngày đầu: chưa nói gì');
  assert.equal(c.attendance(who(2), 2, t).length, 1);
  const before = c.students.get('u3')?.desk.length ?? 0;
  const ms = c.attendance(who(3), GAME.attendMilestones[0], t);
  assert.ok(ms[0].priority);
  assert.equal(c.students.get('u3')!.desk.length, before + 1, 'mốc chuyên cần có quà');
  assert.equal(c.view(t).seats.find((s) => s.username === 'u3')!.days, GAME.attendMilestones[0]);
}

// ---------- cả lớp chọn chủ đề tiết sau ----------
{
  const c = new Classroom(BANK, t);
  c.newRound(t);
  for (let k = 0; k < 200 && c.phase !== 'vote'; k++) c.tick((t = c.phaseEndsAt));
  assert.equal(c.phase, 'vote');
  const [a, b] = c.view(t).vote!.topics;
  assert.notEqual(a, b);
  chat(c, 1, '2', t, t);
  chat(c, 2, '2', t, t);
  chat(c, 2, '1', t, t); // đổi ý không tính
  chat(c, 3, '1', t, t);
  assert.deepEqual(c.view(t).vote!.counts, [1, 2]);
  c.tick((t = c.phaseEndsAt));
  assert.equal(c.phase, 'intro');
  assert.equal(topicName(c.topic), b);
  assert.equal(topicName('Ca dao, thành ngữ (điền từ còn thiếu)'), 'Ca dao, thành ngữ');
  const qs = (c as unknown as { roundQs: Question[] }).roundQs;
  assert.equal(qs.filter((q) => q.category === c.topic && !q.slot).length, GAME.voteTopicQuestions, 'chủ đề thắng có 5 câu');
}

// ---------- báo cáo: mỗi câu đã hỏi ghi số bạn thử / đúng ----------
{
  const c = new Classroom([mk('MÈO'), mk('CHÓ', 'easy', 'cho')], t);
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  for (let i = 0; i < 6; i++) chat(c, i, i < 4 ? c.q!.answer : 'XYZ', t, t);
  for (let k = 0; k < 5 && c.phase !== 'reveal'; k++) c.tick((t = c.phaseEndsAt));
  assert.deepEqual(
    c.reportLog.map((r) => [r.attempts, r.correct]),
    [[6, 4]],
  );
}

// ---------- chia tổ (bản cô Ngân): 45 giây chọn tổ, ai chưa chọn máy xếp, bạn vào giữa tiết xếp ngay ----------
{
  GAME.teamPickSec = TEAM_SEC;
  assert.equal(teamOf('tổ 2'), 2);
  assert.equal(teamOf('TO3'), 3);
  assert.equal(teamOf('t4'), 4);
  assert.equal(teamOf('1'), 1);
  assert.equal(teamOf('tổ ba'), 3);
  assert.equal(teamOf('tổ 5'), 0);
  assert.equal(teamOf('chào cô'), 0);
  const c = new Classroom([mk('MÈO'), mk('CHÓ', 'easy', 'cho')], t, () => 0.1);
  chat(c, 1, 'chào cô', t, t); // vào trước khi mở tiết: đã được xếp tổ, vẫn đổi được trong giờ chọn
  c.newRound(t);
  assert.equal(c.phase, 'team');
  chat(c, 1, 'tổ 3', t, t);
  chat(c, 2, 'tổ 3', t, t);
  chat(c, 3, 'to 1', t, t);
  chat(c, 3, 'tổ 2', t, t); // đổi ý: theo lần sau
  for (let i = 4; i < 10; i++) chat(c, i, 'hello', t, t); // 6 bạn không chọn
  assert.equal(c.view(t).noTeam, 6);
  const remind = c.tick((t = c.phaseEndsAt - GAME.teamRemindLeftSec * 1000));
  assert.ok(remind.some((l) => l.text.includes('Tổ 3 2 bạn')), 'còn 15 giây cô đọc số bạn mỗi tổ');
  const close = c.tick((t = c.phaseEndsAt));
  assert.equal(c.phase, 'intro');
  assert.ok(close.some((l) => l.text.includes('6 bạn chưa chọn')));
  const st = c.students;
  assert.equal(st.get('u1')!.team, 3);
  assert.equal(st.get('u3')!.team, 2);
  assert.ok([...st.values()].every((s) => s.team >= 1 && s.team <= 4), 'không sót ai');
  const sizes = c.teamStats(t).map((x) => x.members);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `chia đều: ${sizes}`);
  chat(c, 50, 'hi cô', t, t); // vào giữa tiết: xếp ngay
  assert.ok(st.get('u50')!.team > 0);
  // bạn tổ 3 trả lời đúng -> cuối tiết tổ 3 thắng cờ
  c.tick((t = c.phaseEndsAt));
  assert.equal(c.phase, 'question');
  for (let k = 0; k < 40 && c.phase !== 'results'; k++) {
    if (c.phase === 'question') chat(c, 1, c.q!.answer, t, t);
    c.tick((t = c.phaseEndsAt));
  }
  assert.equal(c.phase, 'results');
  assert.deepEqual(c.lastTeamWin, [3]);
  assert.equal(c.teamWins[2], 1);
  assert.equal(c.view(t).teams[2].wins, 1);
  // tiết sau: giữ tổ cũ, điểm tổ tính lại
  c.newRound(t);
  assert.equal(c.phase, 'team');
  assert.equal(st.get('u1')!.team, 3);
  assert.equal(c.teamStats(t)[2].score, 0, 'điểm tổ tính lại mỗi tiết');
  GAME.teamPickSec = 0;
}

// ---------- học bạ: điểm cả đời -> lên lớp, huy hiệu, gõ "học bạ" ----------
{
  assert.equal(gradeOf(0), 1);
  assert.equal(gradeOf(GAME.gradePoints[1]), 2);
  assert.equal(gradeOf(GAME.gradePoints[12]), 13, 'đủ điểm cuối là tốt nghiệp');
  const c = new Classroom([mk('BẢNG ĐEN'), mk('CÁI BÀN', 'easy', 'ban')], t);
  // server gửi học bạ về: sắp lên lớp 2, sắp có huy hiệu chăm chỉ
  c.attendance(who(1), 1, t, { ...emptyLife(), points: GAME.gradePoints[1] - 5, total: 299 });
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  chat(c, 1, c.q!.answer, t, t);
  const said: string[] = [];
  for (let k = 0; k < 4 && c.phase !== 'reveal'; k++) said.push(...c.tick((t = c.phaseEndsAt)).map((l) => l.text));
  said.push(...c.tick((t += 200)).map((l) => l.text)); // câu chúc nói ở nhịp kế
  assert.ok(said.some((x) => x.includes('lớp 2')), 'cô chúc lên lớp 2');
  assert.ok(said.some((x) => x.includes('Học sinh chăm chỉ')), 'cô báo huy hiệu mới');
  assert.equal(c.view(t).seats.find((s) => s.username === 'u1')!.grade, 2);
  assert.ok(c.students.get('u1')!.desk.some((g) => g.icon === '🎓'));
  const d = c.lifeDelta.get('u1')!;
  assert.equal(d.total, 1, 'chờ gửi server: 1 câu đúng');
  assert.ok(d.points >= 10);
  // gõ "học bạ": cô đọc lớp, điểm, huy hiệu; gõ lại liền thì thôi
  const card = chat(c, 1, 'học bạ', (t += 1000), t);
  assert.ok(card[0].text.includes('lớp 2') && card[0].text.includes('Học sinh chăm chỉ'));
  assert.equal(chat(c, 1, 'hoc ba', (t += 1000), t).length, 0);
}

// ---------- tương tác hôm nay: 1 bình luận = 1 (cách 2 giây), 1 quà = 10 ----------
{
  const c = new Classroom(BANK, t);
  chat(c, 1, 'a', t, t);
  chat(c, 1, 'b', t + 500, t + 500); // gõ dồn trong 2 giây: không tính
  chat(c, 1, 'c', t + GAME.talkGapMs, t + GAME.talkGapMs);
  c.gift(who(1), 1, t, 3);
  assert.equal(c.talkDelta.get('u1')!.points, 2 + 3 * GAME.talkPerGift);
}

// ---------- hết ghế: bạn còn tương tác chưa có ghế là đang chờ vào; bạn rời lâu được dọn khỏi lớp ----------
{
  const c = new Classroom(BANK, t);
  for (let i = 0; i < GAME.seats + 7; i++) chat(c, i, 'hi', t, t);
  assert.deepEqual(c.view(t).roster, { seated: GAME.seats, seats: GAME.seats, waiting: 7 });
  assert.equal(c.view(t).standing.length, 0, 'không vẽ đám đông đứng ngoài cửa');
  c.weekDelta.clear();
  c.lifeDelta.clear();
  t += GAME.forgetAfterMs + 1000;
  chat(c, 1, 'con vẫn ở đây', t, t);
  c.newRound(t);
  assert.equal(c.students.size, 1, 'bạn rời live lâu được xoá cho nhẹ, bạn còn chơi thì giữ');
}

// ---------- quà: chia bậc bó hoa, quỹ hoa có mốc, cận cảnh cảm ơn ngay ----------
{
  assert.deepEqual([1, 9, 10, 98, 99, 499, 500, 30000].map(tierOf), [0, 0, 1, 1, 2, 2, 3, 3]);
  const c = new Classroom(BANK, t);
  c.setFlowersSaved(GAME.flowerGoals[0] - 3); // server: sắp tới mốc đầu
  const first = c.gift(who(1), 1, t, 1);
  assert.ok(first[0].warn && !first[0].main, 'cảm ơn nói ngay, không dừng đồng hồ');
  assert.ok(first[0].text.includes('Bạn 1') && first[0].text.includes('một bông hoa'));
  assert.equal(c.view(t).walk!.tier, 0);
  const big = c.gift(who(2), 99, t + 1000, 1); // đang có bạn đi lên: không cận cảnh chen, nhưng vẫn vào quỹ
  assert.ok(!big.some((l) => l.text.includes('bó hoa thật to')));
  // 1 món vượt nhiều mốc (47 -> 147 qua 50 và 100): cô báo mốc cao nhất
  assert.ok(big.some((l) => l.text.includes(String(GAME.flowerGoals.filter((g) => g <= GAME.flowerGoals[0] - 3 + 1 + 99).pop()))), 'qua mốc quỹ hoa: cô cảm ơn cả lớp');
  const v = c.view(t + 1000);
  assert.equal(v.fund.today, GAME.flowerGoals[0] - 3 + 1 + 99);
  assert.equal(v.fund.goal, GAME.flowerGoals.find((g) => g > v.fund.today));
  assert.equal(v.fund.party, GAME.flowerGoals.filter((g) => g <= v.fund.today).pop());
  assert.deepEqual(v.gifts.map((g) => g.tier), [0, 2], 'quà bày trên bàn sau lưng cô theo bậc');
  assert.equal(c.flowerDelta, 100, 'chờ gửi server 100 bông');
  // server trả số đã lưu: giữ phần chưa gửi
  c.flowerDelta = 0;
  c.setFlowersSaved(500);
  assert.equal(c.flowersToday, 500);
}

// ---------- bảng Top 5 nhanh nhất: thời gian tới mili giây (từ lúc hô bắt đầu), 10/7/5/3/3, chậm hơn +1 ----------
{
  const c = new Classroom([mk('BẢNG ĐEN'), mk('CÁI BÀN', 'easy', 'ban')], t);
  c.newRound(t);
  c.tick((t += GAME.introSec * 1000));
  const start = t;
  c.hold(3000); // cô đọc đề 3 giây: chưa tính giờ
  const skew = 1500; // đồng hồ TikTok chậm hơn máy 1,5 giây
  const at = (sec: number) => start + 3000 + sec * 1000; // giờ máy lúc người xem gửi
  // 7 bạn đúng, tới lệch thứ tự; bạn 9 gửi sớm nhất
  [[1, 2.345], [2, 1.2], [3, 4.5], [4, 3.25], [5, 6.1], [6, 7.003], [9, 0.987]].forEach(([u, sec], k) =>
    chat(c, u, c.q!.answer, at(sec) - skew, at(sec) + 200 + k * 10),
  );
  const v = c.view(t);
  assert.deepEqual(
    v.fastest.map((a) => [a.username, a.points]),
    [
      ['u9', 10],
      ['u2', 7],
      ['u1', 5],
      ['u4', 3],
      ['u3', 3],
    ],
  );
  // thời gian: đúng tới mili giây, dư thêm trễ mạng ít nhất (ở đây 200 ms) + chút trôi; luôn tăng dần theo thứ hạng
  const real = [987, 1200, 2345, 3250, 4500];
  v.fastest.forEach((a, i) => assert.ok(a.ms >= real[i] && a.ms - real[i] <= 300, `${a.username}: ${a.ms} ms, thật ${real[i]} ms`));
  for (let i = 1; i < 5; i++) assert.ok(v.fastest[i].ms >= v.fastest[i - 1].ms);
  assert.equal(v.laterCount, 2);
  assert.equal(v.laterPoints, 1);
  assert.deepEqual(c.correct.slice(5).map((a) => a.points), [1, 1], 'chậm hơn top 5: +1');
}

// ---------- 2 game lớn (bản cô Ngân): Đường lên đỉnh Everest, Rung Chuông Đồng ----------
{
  const sdir = path.join(import.meta.dirname, 'cau-hoi-show');
  const SHOW = { mc: parseMc(fs.readFileSync(path.join(sdir, 'trac-nghiem.txt'), 'utf8')), codes: parseCodes(fs.readFileSync(path.join(sdir, 'mat-ma.txt'), 'utf8')) };
  assert.equal(choiceOf('B'), 1);
  assert.equal(choiceOf('đáp án c'), 2);
  assert.equal(choiceOf('chọn D'), 3);
  assert.equal(choiceOf('a.'), 0);
  assert.equal(choiceOf('ab'), -1);
  assert.equal(choiceOf('xin chào'), -1);
  type Sh = { steps: { k: string; tag?: string }[]; i: number; stage: string; mc: { ans: number; tag: string } | null; code: { answer: string } | null; tickets: Set<string>; scores: Map<string, number> };
  const sh = (c: Classroom) => (c as unknown as { show: Sh }).show;
  const step = (c: Classroom) => sh(c).steps[sh(c).i];
  /** chạy tới bước kế tiếp đang chờ trả lời (cô đã hô bắt đầu) */
  const toAsk = (c: Classroom) => {
    for (let k = 0; k < 20; k++) {
      if (c.phase !== 'show' || step(c).k === 'honor') return;
      const st = step(c);
      if (sh(c).stage === 'ask' && ['mc', 'stake', 'code'].includes(st.k)) {
        c.showBoard();
        return;
      }
      c.tick((t = c.phaseEndsAt));
    }
  };
  const wrongOf = (a: number) => 'ABCD'[(a + 1) % 4];

  // --- Everest ---
  const c = new Classroom(BANK, t, () => 0.3);
  c.showBank = SHOW;
  for (let i = 1; i <= 4; i++) chat(c, i, 'hi', t, t);
  c.forceShow('everest', t);
  assert.equal(c.phase, 'show');
  assert.equal(c.view(t).outfit, 'everest', 'chơi Everest thì mặc đồ leo núi');
  // bước chân đầu tiên: 4 câu, đúng +10, mỗi người 1 đáp án, chưa hô bắt đầu thì chưa nhận
  for (let q = 0; q < 4; q++) {
    toAsk(c);
    assert.equal(step(c).k, 'mc');
    const a = sh(c).mc!.ans;
    if (q === 0) {
      (c as unknown as { boardShown: boolean }).boardShown = false;
      chat(c, 4, 'ABCD'[a], t, t); // cô chưa hô bắt đầu: không tính
      c.showBoard();
    }
    chat(c, 1, 'ABCD'[a], t, t);
    chat(c, 2, wrongOf(a), t, t);
    chat(c, 2, 'ABCD'[a], t, t); // đổi ý: chỉ tính lần đầu
    c.tick((t = c.phaseEndsAt)); // hiện đáp án
    assert.equal(sh(c).stage, 'reveal');
  }
  assert.equal(sh(c).scores.get('u1'), 40);
  assert.equal(sh(c).scores.get('u2') ?? 0, 0);
  assert.equal(sh(c).scores.get('u4') ?? 0, 0, 'gõ trước khi cô hô bắt đầu không tính');
  assert.equal(c.students.get('u1')!.session, 40, 'điểm game lớn vào điểm buổi / học bạ');
  // mật mã: bạn 3 giải ở gợi ý 2 được 20, bạn 1 đoán sai ở gợi ý 1 rồi giải ở gợi ý 2
  toAsk(c);
  assert.equal(step(c).k, 'code');
  const code = sh(c).code!.answer;
  chat(c, 1, 'x'.repeat(code.replace(/\s/g, '').length), t, t); // đoán sai (đủ số chữ)
  chat(c, 1, code.toLowerCase(), t, t); // gợi ý này đã đoán rồi: không tính
  c.tick((t = c.phaseEndsAt));
  toAsk(c);
  chat(c, 3, code.toLowerCase(), t, t);
  chat(c, 1, code.toLowerCase(), t, t);
  assert.equal(sh(c).scores.get('u3'), 20);
  assert.equal(sh(c).scores.get('u1'), 60);
  c.tick((t = c.phaseEndsAt)); // gợi ý 3
  c.tick((t = c.phaseEndsAt)); // đã có người giải: bỏ cứu trợ, tới hiện mật mã
  assert.equal(step(c).k, 'codeReveal');
  // bão tốc độ: 4 câu +15 cho bạn 3
  for (let q = 0; q < 4; q++) {
    toAsk(c);
    chat(c, 3, 'ABCD'[sh(c).mc!.ans], t, t);
    c.tick((t = c.phaseEndsAt));
  }
  assert.equal(sh(c).scores.get('u3'), 80);
  // chạm đỉnh: bạn 1 cược 20 đúng cả 3, bạn 3 không cược (tính 10)
  for (let q = 0; q < 3; q++) {
    toAsk(c);
    assert.equal(step(c).k, 'stake');
    chat(c, 1, '20', t, t);
    c.tick((t = c.phaseEndsAt));
    toAsk(c);
    assert.equal(sh(c).mc!.tag, 'peak');
    chat(c, 1, 'ABCD'[sh(c).mc!.ans], t, t);
    chat(c, 3, 'ABCD'[sh(c).mc!.ans], t, t);
    c.tick((t = c.phaseEndsAt));
  }
  assert.equal(sh(c).scores.get('u1'), 120);
  assert.equal(sh(c).scores.get('u3'), 110);
  // không đồng điểm: bỏ câu phụ, vào vinh danh
  for (let k = 0; k < 5 && step(c).k !== 'honor'; k++) c.tick((t = c.phaseEndsAt));
  assert.equal(step(c).k, 'honor');
  const hv = c.view(t).show!;
  assert.equal(hv.honors[0].username, 'u1');
  assert.ok(hv.honors[0].title.includes('Everest'));
  assert.ok(c.view(t).seats.find((s) => s.username === 'u1')!.showIcons.includes('🚩'), 'danh hiệu hiện trên bảng tên');
  c.tick((t = c.phaseEndsAt));
  assert.equal(c.phase, 'vote', 'xong game thì bình chọn chủ đề tiết sau');
  assert.equal(c.show, null);

  // --- Rung Chuông Đồng: phiếu gợi ý, câu phụ khi đồng điểm, rung chuông ---
  const d = new Classroom(BANK, t, () => 0.3);
  d.showBank = SHOW;
  for (let i = 1; i <= 3; i++) chat(d, i, 'hi', t, t);
  d.forceShow('chuong', t);
  for (let k = 0; k < 40 && d.phase === 'show' && step(d).k !== 'honor'; k++) {
    toAsk(d);
    if (d.phase !== 'show' || step(d).k === 'honor') break;
    const m = sh(d).mc;
    if (m) {
      if (m.tag === 'final' && sh(d).tickets.has('u2') && !d.view(t).show!.ticketUser) {
        const said = chat(d, 2, 'gợi ý', t, t);
        assert.ok(said.some((l) => l.warn), 'dùng phiếu: cô nói liền, không dừng đồng hồ');
        assert.equal(d.view(t).show!.removed.length, 2);
        assert.ok(!d.view(t).show!.removed.includes(m.ans), 'chỉ bỏ đáp án sai');
      }
      // bạn 1 và 2 đúng hết, bạn 3 chỉ đúng câu cứu trợ; câu phụ thì chỉ bạn 2 đúng
      const right = 'ABCD'[m.ans];
      if (m.tag === 'tie') {
        chat(d, 3, right, t, t); // không đồng điểm: không tính
        chat(d, 2, right, t, t);
        chat(d, 1, wrongOf(m.ans), t, t);
      } else {
        chat(d, 1, right, t, t);
        chat(d, 2, right, t, t);
        if (m.tag === 'rescue') chat(d, 3, right, t, t);
      }
    }
    d.tick((t = d.phaseEndsAt));
  }
  assert.equal(step(d).k, 'honor');
  const dv = d.view(t).show!;
  assert.equal(sh(d).scores.get('u1'), sh(d).scores.get('u2'), 'bạn 1, 2 đồng điểm');
  assert.equal(dv.honors[0].username, 'u2', 'đúng câu phụ thì xếp trên');
  assert.ok(dv.honors[0].title.includes('chuông'));
  assert.deepEqual(dv.bellRingers.length, 2);
  assert.ok((d.titles.get('u3') ?? []).some((x) => x.includes('tiếp sức')), 'đúng câu cứu trợ: Người tiếp sức');

  // --- cứ 2 tiết 1 game, xen kẽ; hết tiết đổi trang phục ---
  const e = new Classroom(BANK, t, () => 0.5);
  e.showBank = SHOW;
  const outfits = new Set<string>();
  const kinds: string[] = [];
  for (let r = 0; r < 4; r++) {
    e.newRound((t += 1000));
    const before = e.outfit;
    for (let k = 0; k < 200 && e.phase !== 'results'; k++) e.tick((t = e.phaseEndsAt));
    assert.notEqual(e.outfit, before, 'hết 20 câu thì cô thay trang phục');
    outfits.add(e.outfit);
    e.tick((t = e.phaseEndsAt));
    if (e.phase === 'show') kinds.push(e.show!.kind);
    else assert.equal(e.phase, 'recess');
  }
  assert.deepEqual(kinds, ['everest', 'chuong'], 'tiết 2 Everest, tiết 4 Rung Chuông Đồng');
  // bảng sự kiện: tiết 1 báo "sau tiết 2", tiết 2 báo "hết tiết này là tới" + cô báo trước bằng giọng
  const f = new Classroom(BANK, t, () => 0.5);
  f.showBank = SHOW;
  f.newRound((t += 1000));
  assert.deepEqual(f.nextShow(), { kind: 'everest', name: 'Đường lên đỉnh Everest', afterRound: 2, now: false, soon: false });
  for (let k = 0; k < 200 && f.phase !== 'recess'; k++) f.tick((t = f.phaseEndsAt));
  assert.equal(f.nextShow()!.afterRound, 2, 'ra chơi tiết 1: phiên tới vẫn sau tiết 2');
  const intro2 = f.newRound((t += 1000));
  assert.ok(f.nextShow()!.soon);
  assert.ok(intro2.some((l) => LINES.showSoon.some((fn) => l.text.includes(fn('Đường lên đỉnh Everest')))), 'đầu tiết 2 cô báo hết tiết là tới Everest');
  assert.ok([...outfits].every((o) => (GAME.outfits as readonly string[]).includes(o)));
}

// ---------- chuỗi câu đúng liền: chỉ khen ở mốc 5, 12, 17; nhiều bạn cùng mốc thì gộp 1 câu, đọc tối đa 3 tên ----------
{
  const c = new Classroom(Array.from({ length: 30 }, (_, i) => mk('BẢNG ĐEN' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26] + (i >= 26 ? 'X' : ''))), t);
  c.newRound(t);
  const streakSaid: string[][] = [];
  for (let q = 1; q <= 5; q++) {
    while (c.phase !== 'question') c.tick((t += 500));
    c.showBoard();
    for (let i = 1; i <= 4; i++) chat(c, i, c.q!.answer, t, (t += 10));
    let said: string[] = [];
    while ((c.phase as string) !== 'reveal') said = c.tick((t += 500)).map((l) => l.text);
    streakSaid.push(said.filter((x) => /câu liền|câu không trượt|câu gọi tên|câu đúng của/.test(x)));
  }
  assert.deepEqual(streakSaid.slice(0, 4), [[], [], [], []], 'chưa tới 5 câu liền thì không khen chuỗi');
  assert.equal(streakSaid[4].length, 1, '4 bạn cùng đủ 5 câu: gộp 1 câu');
  assert.ok(streakSaid[4][0].includes('5 câu') && streakSaid[4][0].includes('và 1 bạn nữa'), streakSaid[4][0]);
  for (let i = 1; i <= 4; i++) assert.equal(c.students.get(`u${i}`)!.streak, 5);
}

// ---------- quà trong bảng "Gửi tặng cô": cô cảm ơn đúng tên món, bạn nhỏ cầm đúng món, bày đúng món ----------
{
  const c = new Classroom([mk('BẢNG ĐEN')], t);
  c.newRound(t);
  const said = c.gift(who(1), 30, t, 1, 'Doughnut');
  assert.ok(said.some((l) => LINES.thankDonut.some((f) => f('Bạn 1') === l.text.slice(3))), 'bánh donut: cô đáp lời riêng của món');
  assert.equal(c.view(t).walk!.icon, '🍩');
  const heart = c.gift(who(3), 5, t + 2 * GAME.walkMs, 1, 'Finger Heart');
  assert.ok(heart.some((l) => LINES.thankHeart.some((f) => f('Bạn 3') === l.text.slice(3))), 'bắn tim: cô đáp "bắn trúng tim cô"...');
  assert.equal(c.view(t).gifts[0].icon, '🍩');
  c.gift(who(2), 3, t + GAME.walkMs + 1, 1, 'Quà lạ');
  assert.equal(c.view(t + GAME.walkMs + 1).gifts[2].icon, GAME.giftTiers[0].icon, 'quà khác: icon theo bậc như cũ');
}

// ---------- gửi đáp án lúc cô còn đọc nhưng bình luận tới trễ (sau khi bảng hiện): không tính, không mất lượt ----------
{
  Object.assign(GAME, FAST);
  const c = new Classroom(BANK, t);
  c.newRound(t);
  while (c.phase !== 'question') c.tick((t += 500));
  while (c.q!.math || c.q!.slot === 'meo') c.tick((t += 500)); // câu chữ (đáp án dài) cho dễ thử
  const delay = 1000; // bình luận TikTok tới máy trễ 1 giây
  chat(c, 801, 'chào cô', t - delay, t); // vài bình luận thường để đo độ lệch đồng hồ
  chat(c, 802, 'hay quá', t - delay, t);
  const shownAt = t + 2000;
  c.showBoard(shownAt);
  t = shownAt + 300;
  chat(c, 9, c.q!.answer, shownAt - 2500, t); // gửi lúc cô còn đọc, tới sau khi bảng hiện
  assert.equal(c.correct.length, 0, 'gửi trước khi bảng hiện: không tính dù tới trễ');
  t = shownAt + 3000;
  chat(c, 9, c.q!.answer, t - delay, t); // xem live thấy bảng rồi mới gõ
  assert.equal(c.correct.length, 1, 'không mất lượt: gõ lại sau khi bảng hiện thì được tính');
  assert.ok(c.view(t).fastest.length === 0 || c.view(t).fastest[0].ms > 0);
}

// ---------- nút "Chào tạm biệt": cô chào cuối buổi (có tên bạn dẫn đầu), biểu ngữ tan lớp ----------
{
  const c = new Classroom([mk('BẢNG ĐEN')], t);
  c.newRound(t);
  let said = c.goodbye(t);
  assert.ok(said[0].main && LINES.goodbye.some((x) => said[0].text.endsWith(x)), 'chưa ai có điểm: câu chào chung');
  assert.ok(c.view(t + 1000).goodbye, 'biểu ngữ tan lớp');
  assert.equal(c.view(t + GAME.goodbyeBannerSec * 1000 + 1).goodbye, null);
  while (c.phase !== 'question') c.tick((t += 500));
  c.showBoard();
  chat(c, 1, c.q!.answer, t, t);
  while ((c.phase as string) !== 'reveal') c.tick((t += 500));
  said = c.goodbye(t);
  assert.ok(LINES.goodbyeTop.some((f) => f('Bạn 1') === said[0].text.slice(3)), 'có bạn dẫn đầu: cô nhắc tên');
}

// ---------- đuổi hình bắt chữ: hiện sẵn chữ cái đầu mỗi chữ trong ô đáp án ----------
{
  const dh = BANK.find((q) => q.answer === 'CÁ CHẬU CHIM LỒNG')!;
  const c = new Classroom([dh], t);
  c.newRound(t);
  while (c.phase !== 'question') c.tick((t += 500));
  assert.equal(c.slots().map((x) => x ?? '_').join(''), 'C_ C___ C___ L___');
}

// ---------- sai: lên đứng bảng ba câu, không ra hành lang ----------
{
  const c = new Classroom(BANK, t);
  c.newRound(t);
  const ask = () => { while (c.phase !== 'question') c.tick((t += 500)); c.showBoard(); };
  const reveal = () => { while ((c.phase as string) !== 'reveal') c.tick((t += 500)); };
  ask();
  for (let i = 1; i <= 5; i++) chat(c, i, 'X'.repeat(c.answerLetters.length), t, t);
  assert.equal(c.view(t).seats.length, 5, 'sai không rời lớp');
  reveal();
  assert.equal(c.view(t).punished.length, 5);
  assert.ok(c.view(t).seats.every((s) => s.standing));
  for (let q = 2; q <= GAME.standQuestions + 1; q++) {
    ask();
    for (let i = 1; i <= 5; i++) chat(c, i, 'xin chào '.repeat(40), t, t);
    reveal();
    if (q <= GAME.standQuestions) assert.equal(c.view(t).punished.length, 5);
  }
  assert.equal(c.view(t).punished.length, 0, 'đủ lượt thì về chỗ');
}

// ---------- chế độ nhanh: đọc đề ngắn, đọc xong mới hiện bảng + nhận đáp án, đủ 5 bạn đúng thì chốt sớm, điểm danh 1 câu sau câu 10 ----------
{
  Object.assign(GAME, FAST);
  const c = new Classroom(BANK, t);
  c.newRound(t);
  let asked: ReturnType<Classroom['tick']> = [];
  while (c.phase !== 'question') asked = c.tick((t += 500));
  assert.ok(!c.boardShown, 'cô đang đọc đề: bảng chữ chưa hiện');
  const qLine = asked.find((l) => l.text.includes('Câu 1.'))!;
  assert.ok(qLine && qLine.main && qLine.showAfter, 'đọc đề là câu chính (dừng giờ), đọc xong mới hiện bảng');
  assert.ok(/Đây là .* gồm \d+ chữ cái\./.test(qLine.text), 'đọc "Đây là ... gồm N chữ cái." (chủ kênh duyệt 2026-11-05)');
  assert.ok(!asked.some((l) => l.go), 'không hô bắt đầu');
  chat(c, 77, c.q!.answer, t, t); // gõ trước khi bảng hiện: không tính, không mất lượt
  assert.equal(c.correct.length, 0, 'đáp án gõ trước khi cô đọc xong đề không tính');
  c.showBoard();
  chat(c, 77, c.q!.answer, t, (t += 10));
  assert.equal(c.correct.length, 1, 'bảng hiện rồi thì gõ lại được tính');
  const end = c.phaseEndsAt;
  for (let i = 1; i <= 5; i++) chat(c, i, c.q!.answer, t, (t += 10));
  assert.ok(c.phaseEndsAt <= t + GAME.closeAfterTopSec * 1000 && c.phaseEndsAt < end, 'đủ 5 bạn đúng thì chốt sớm');
  let praise: ReturnType<Classroom['tick']> = [];
  while (c.qNo < 11 && (c.phase as string) !== 'results') {
    const said = c.tick((t += 500));
    if ((c.phase as string) === 'praise' && said.length) praise = said;
    if ((c.phase as string) === 'question' && c.correct.length === 0) chat(c, 1, c.q!.answer, t, t);
  }
  assert.equal(praise.length, 1, 'điểm danh giữa tiết chỉ 1 câu');
  assert.ok(c.qNo === 11, 'điểm danh sau câu 10');
  // chọn tổ chỉ ở tiết 1, 5, 9...
  GAME.teamPickSec = TEAM_SEC;
  const rounds: string[] = [];
  const r = new Classroom(Array.from({ length: 30 }, (_, i) => mk('BẢNG ĐEN' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26] + (i >= 26 ? 'X' : ''))), t);
  for (let i = 0; i < 5; i++) {
    r.newRound((t += 1000));
    rounds.push(r.phase);
  }
  assert.deepEqual(rounds, ['team', 'intro', 'intro', 'intro', 'team']);
}

// Chưa đầy ghế: im lặng nhiều câu vẫn giữ chỗ, không tạo lượt đi ra.
for (const count of [1, GAME.seats - 1]) {
  const at = 8_900_000;
  const c = new Classroom(BANK, at);
  const teamSec = GAME.teamPickSec;
  GAME.teamPickSec = 0;
  c.newRound(at);
  for (let i = 0; i < count; i++) c.enter(who(i), at);
  const initial = c.view(at);
  let now = at + GAME.introSec * 1000;
  c.tick(now);
  for (let question = 0; question < 3; question++) {
    c.tick((now = c.phaseEndsAt));
    if ((c.phase as string) === 'bonus') c.tick((now = c.phaseEndsAt));
    assert.equal(c.phase, 'reveal');
    const v = c.view(now);
    assert.deepEqual(v.seats.map((s) => [s.username, s.seatIndex]), initial.seats.map((s) => [s.username, s.seatIndex]));
    assert.ok(v.seats.every((s) => !s.sleeping));
    assert.equal(v.movements.length, 0, 'lớp chưa đầy không đuổi người im lặng');
    c.tick((now = c.phaseEndsAt));
  }
  GAME.teamPickSec = teamSec;
}

// Một câu không tương tác thì ngủ và nhường ghế, không dùng bộ đếm 5 phút.
{
  const at = 9_000_000;
  const c = new Classroom(BANK, at);
  const teamSec = GAME.teamPickSec;
  GAME.teamPickSec = 0;
  c.newRound(at);
  for (let i = 0; i < GAME.seats + 3; i++) chat(c, i, 'hi', at, at);
  c.students.get('u0')!.score = 999;
  const ask = at + GAME.introSec * 1000;
  c.tick(ask);
  assert.equal(c.phase, 'question');
  // Hầu hết học sinh có tương tác; u0 không tương tác.
  for (let i = 1; i < GAME.seats; i++) chat(c, i, 'cô ơi', ask + 1, ask + 1);
  assert.ok(c.view(ask + 1).seats.some((s) => s.username === 'u0'), 'chưa hết câu không đuổi');
  c.tick(c.phaseEndsAt);
  if ((c.phase as string) === 'bonus') {
    chat(c, 2, 'con đang nghĩ', c.phaseEndsAt - 1, c.phaseEndsAt - 1);
    c.tick(c.phaseEndsAt);
  }
  assert.equal(c.phase, 'reveal');
  const done = c.phaseEndsAt - GAME.revealSec * 1000;
  const v = c.view(done);
  assert.ok(!v.seats.some((s) => s.username === 'u0'), 'im cả câu bị đuổi dù điểm cao');
  assert.ok(v.seats.some((s) => s.username === 'u1'), 'bình luận bất kỳ trong câu được tính tương tác');
  assert.ok(v.seats.some((s) => s.username === `u${GAME.seats}`), 'hàng chờ tự vào ghế');
  assert.equal(v.roster.waiting, 2);
  assert.deepEqual(v.movements.map((m) => [m.kind, m.username]).sort(), [['enter', `u${GAME.seats}`], ['leave', 'u0']].sort(), 'chỉ người ngủ đi ra và người chờ đi vào');
  assert.equal(c.students.get('u0')!.score, 999);
  chat(c, 0, 'cô ơi', done + 1, done + 1);
  const finish = Math.max(done + 1, ...c.view(done + 1).movements.map((m) => m.startedAt + m.durationMs)) + 1;
  assert.ok(!c.view(finish).seats.some((s) => s.username === 'u0'), 'quay lại vẫn chờ ghế trống dù điểm cao');
  assert.equal(c.view(done + 1).roster.waiting, 3);
  GAME.teamPickSec = teamSec;
}

// Sự kiện vào phòng tự ghi danh/hàng chờ; không cần bình luận, không báo lặp.
{
  const at = 10_000_000;
  const c = new Classroom(BANK, at);
  for (let i = 0; i < GAME.seats; i++) c.enter(who(i), at);
  assert.equal(c.view(at).roster.seated, GAME.seats);
  assert.ok(!c.tick(at).some((l) => l.text.includes('hành lang')));
  const deadline = c.phaseEndsAt;
  c.enter(who(999), at + 1);
  assert.equal(c.view(at + 1).roster.waiting, 1);
  const lines = c.tick(at + 1);
  const waitingVoice = lines.find((l) => l.text.includes('hành lang'));
  assert.ok(waitingVoice && waitingVoice.priority && !waitingVoice.main && !waitingVoice.warn, 'ít người chờ thì nói lúc rảnh');
  assert.equal(c.view(at + 1).teacherChat?.text, 'Bạn 999 ơi, lớp đầy rồi, đứng hành lang chờ cô nhé!');
  assert.equal(c.phaseEndsAt, deadline, 'nhắc hành lang không kéo dài đồng hồ');
  c.enter(who(999), at + 2);
  chat(c, 999, 'chào cô', at + 3, at + 3);
  assert.ok(!c.tick(at + 3).some((l) => l.text.includes('hành lang')));
  assert.equal(c.view(at + 3).roster.waiting, 1);
  c.enter(who(998), at + 4);
  assert.ok(!c.tick(at + 4).some((l) => l.text.includes('hành lang')), 'không đọc dồn trong 30 giây');
  c.enter(who(997), at + 5);
  c.enter(who(996), at + 30_001);
  assert.ok(!c.tick(at + 30_001).some((l) => l.text.includes('hành lang')), 'từ bốn người chờ chỉ báo chat');
  assert.ok(c.view(at + 30_001).teacherChat?.text.includes(who(996).nickname));
}

// Physical seats follow ranking; entry waits for departing students.
{
  const at = 11_000_000;
  const c = new Classroom(BANK, at);
  const teamSec = GAME.teamPickSec;
  GAME.teamPickSec = 0;
  c.newRound(at);
  for (let i = 0; i < GAME.seats + 1; i++) c.enter(who(i), at);
  const initial = c.view(at);
  assert.equal(initial.movements.length, 0, 'first hydration never replays entrances');
  c.students.get('u1')!.score = 10;
  const reordered = c.view(at + 1);
  assert.equal(reordered.seats[0].username, 'u1', 'ranking still responds to score');
  reordered.seats.forEach((s, rank) => assert.equal(s.seatIndex, rank));
  assert.equal(reordered.movements.length, 0, 'tăng điểm đổi ghế tức thì, không tạo đường đi');
  const ask = at + GAME.introSec * 1000;
  c.tick(ask);
  for (let i = 1; i < GAME.seats; i++) chat(c, i, 'cô ơi', ask + 1, ask + 1);
  c.tick(c.phaseEndsAt);
  if ((c.phase as string) === 'bonus') c.tick(c.phaseEndsAt);
  const end = c.phaseEndsAt - GAME.revealSec * 1000;
  const swapped = c.view(end);
  const leaving = swapped.movements.find((m) => m.kind === 'leave' && m.username === 'u0')!;
  const entering = swapped.movements.find((m) => m.kind === 'enter' && m.username === `u${GAME.seats}`)!;
  assert.ok(leaving && entering, 'sleep creates exit and queue entrance');
  assert.equal(leaving.seatIndex, reordered.seats.find((s) => s.username === 'u0')!.seatIndex);
  assert.equal(entering.seatIndex, swapped.seats.find((s) => s.username === entering.username)!.seatIndex, 'người vào tới ghế theo thứ hạng');
  assert.ok(entering.startedAt >= leaving.startedAt + leaving.durationMs, 'wait until departure ends');
  swapped.seats.filter((s) => s.username !== entering.username).forEach((s) => assert.equal(s.seatIndex, reordered.seats.find((p) => p.username === s.username)!.seatIndex));
  assert.equal(entering.seatIndex, leaving.seatIndex);
  assert.equal(new Set(swapped.seats.map((s) => s.seatIndex)).size, GAME.seats);
  assert.deepEqual(c.view(end).movements, swapped.movements, 'repeat snapshots do not duplicate motion');
  assert.equal(c.view(entering.startedAt + entering.durationMs + 1001).movements.length, 0, 'old motion events expire');
  GAME.teamPickSec = teamSec;
}

// Real member events after an empty stage snapshot trigger an entrance without any chat.
{
  const at = 12_000_000;
  const c = new Classroom(BANK, at);
  assert.equal(c.view(at).seats.length, 0);
  c.enter(who(501), at + 200);
  const v = c.view(at + 400);
  assert.equal(v.seats.length, 1);
  assert.equal(v.movements.length, 1);
  assert.equal(v.movements[0].kind, 'enter');
  assert.equal(v.movements[0].username, 'u501');
  assert.equal(v.movements[0].seatIndex, v.seats[0].seatIndex);
  assert.ok(v.movements[0].startedAt + v.movements[0].durationMs > at + 400);
}

// Người chờ không chiếm ghế dù điểm cao; người đang ngồi không bị thay.
{
  const at = 13_000_000;
  const c = new Classroom(BANK, at);
  for (let i = 0; i < GAME.seats + 2; i++) c.enter(who(i), at + i);
  const before = c.view(at + 100);
  c.students.get(`u${GAME.seats}`)!.score = 999;
  c.students.get(`u${GAME.seats + 1}`)!.score = 1000;
  for (const time of [at + 101, at + 5000, at + 10000]) {
    const after = c.view(time);
    assert.deepEqual(after.seats.map((s) => [s.username, s.seatIndex]).sort(), before.seats.map((s) => [s.username, s.seatIndex]).sort());
    assert.equal(after.movements.length, 0, 'người chờ tăng điểm không tạo di chuyển');
  }
}

// Người ngoài lớp có hình ở hành lang, kể cả người ngủ; không nằm trùng trong ghế.
{
  const at = 14_000_000;
  const c = new Classroom(BANK, at);
  for (let i = 0; i < GAME.seats + 10; i++) c.enter(who(i), at);
  const v = c.view(at);
  assert.equal(v.hallwayTotal, 10);
  assert.equal(v.hallway.length, 8, 'giới hạn sprite để giữ nhẹ');
  assert.ok(v.hallway.every((s) => !v.seats.some((p) => p.username === s.username)));
  c.students.get('u40')!.score = 100;
  const promoted = c.view(at + 1);
  assert.ok(promoted.hallway.some((s) => s.username === 'u40'));
  assert.equal(promoted.movements.length, 0, 'lớp đầy thì tiếp tục chờ dù điểm cao');
}

// Lên bảng và về ghế theo thứ hạng mới, không nhân đôi hoặc đổi chỗ đứng phạt.
{
  let now = 15_000_000;
  const c = new Classroom(BANK, now);
  const team = GAME.teamPickSec;
  GAME.teamPickSec = 0;
  c.newRound(now);
  for (let i = 0; i < GAME.seats; i++) c.enter(who(i), now);
  c.students.get('u0')!.score = 5;
  c.view(now);
  c.enter(who(GAME.seats), now);
  c.students.get(`u${GAME.seats}`)!.score = 999;
  c.tick((now += GAME.introSec * 1000));
  c.showBoard();
  chat(c, 0, 'X'.repeat(c.answerLetters.length), now, now);
  for (let i = 1; i < GAME.seats; i++) chat(c, i, 'xin chào '.repeat(40), now, now);
  for (let n = 0; n < 300 && c.phase !== 'reveal'; n++) c.tick((now += 500));
  const up = c.view(now);
  assert.equal(up.movements.filter((m) => m.username === 'u0').length, 0, 'lên bảng tức thì không tạo đường đi');
  assert.ok(up.seats.some((s) => s.username === 'u0'), 'trả lời sai vẫn giữ suất trong lớp khi có người chờ');
  assert.ok(!up.hallway.some((s) => s.username === 'u0'), 'không đưa người trả lời sai ra hành lang');
  assert.ok(!up.movements.some((m) => m.kind === 'leave' && m.username === 'u0'));
  assert.ok(!up.seats.some((s) => s.username === `u${GAME.seats}`), 'người chờ không lấy ghế của người đứng phạt');
  const slot = up.punished.find((s) => s.username === 'u0')!.standIndex;
  c.students.get('u1')!.score = 50;
  assert.equal(c.view(now + 1).punished.find((s) => s.username === 'u0')!.standIndex, slot);
  for (let n = 0; n < 1000 && c.students.get('u0')!.standLeft > 0; n++) {
    c.tick((now += 500));
    if (c.phase === 'question' || c.phase === 'bonus') {
      for (let i = 0; i < GAME.seats; i++) chat(c, i, 'xin chào '.repeat(40), now, now);
    }
    c.view(now);
  }
  const back = c.view(now);
  assert.equal(back.punished.length, 0);
  assert.equal(back.seats.find((s) => s.username === 'u0')!.seatIndex, 1, 'về ghế theo điểm mới tức thì');
  assert.equal(back.movements.filter((m) => m.username === 'u0').length, 0, 'về ghế không tạo đường đi');
  GAME.teamPickSec = team;
}

// Mass rank changes keep at most twelve walking sprites active at any instant.
{
  const at = 16_000_000;
  const c = new Classroom(BANK, at);
  for (let i = 0; i < GAME.seats; i++) c.enter(who(i), at);
  c.view(at);
  for (let i = 0; i < GAME.seats; i++) c.students.get(`u${i}`)!.score = (i + 1) * 10;
  const v = c.view(at + 1);
  const moves = v.movements;
  assert.equal(moves.length, 0, 'đổi điểm cả lớp không tạo di chuyển');
  for (const m of moves) {
    const count = moves.filter((p) => p.startedAt <= m.startedAt && p.startedAt + p.durationMs > m.startedAt).length;
    assert.ok(count <= 12, `too many active walkers: ${count}`);
  }
  assert.equal(new Set(v.seats.map((s) => s.seatIndex)).size, GAME.seats);
}

// Equal scores keep seats; running routes cannot be retargeted by later score updates.
{
  const at = 17_000_000;
  const c = new Classroom(BANK, at);
  for (let i = 0; i < 4; i++) c.enter(who(i), at + i);
  const first = c.view(at + 10);
  const positions = first.seats.map((s) => [s.username, s.seatIndex]);
  c.students.get('u2')!.session = 999;
  c.students.get('u1')!.reachedAt = -999;
  chat(c, 3, 'xin chào '.repeat(40), at + GAME.seatActiveMs + 100, at + GAME.seatActiveMs + 100);
  const equal = c.view(at + GAME.seatActiveMs + 100);
  assert.deepEqual(equal.seats.map((s) => [s.username, s.seatIndex]), positions, 'comment/session/activity do not reshuffle equal scores');
  assert.equal(equal.movements.length, 0);
  const now = at + GAME.seatActiveMs + 200;
  c.students.get('u3')!.score = 100;
  const batch = c.view(now);
  assert.equal(batch.movements.length, 0);
  batch.seats.forEach((s, rank) => assert.equal(s.seatIndex, rank));
  c.students.get('u2')!.score = 200;
  const halfway = c.view(now + 500);
  assert.deepEqual(halfway.movements, batch.movements, 'active routes stay frozen despite new leader');
  halfway.seats.forEach((s, rank) => assert.equal(s.seatIndex, rank));
  const end = now + 3000;
  const next = c.view(end + 1);
  assert.equal(next.seats[0].username, 'u2');
  assert.equal(next.seats[0].seatIndex, 0, 'người dẫn điểm đổi ghế tức thì');
  assert.equal(new Set(next.seats.map((s) => s.seatIndex)).size, 4);
  const settled = end + 3000;
  assert.equal(c.view(settled).movements.length, 0, 'stable scores do not loop movement');
}

console.log('quiz.check: tất cả đều đúng');
