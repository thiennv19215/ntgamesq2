import { useEffect, useRef, useState } from 'react';
import type { RoseSettings } from './quiz';
import { emitTest, sendControl } from '../live/page';
import type { StageView } from './useGame';
import { GAME } from './config';

// Nút riêng của Lớp Học Chữ ở trang điều khiển: điều khiển ván + giả lập phòng đông để thử bot
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const TEN = ['Lan Anh', 'Minh Tuấn', 'Thu Trang', 'Quốc Bảo', 'Ngọc Hân', 'Gia Huy', 'Khánh Linh', 'Hải Yến', 'Đức Anh', 'Bảo Ngọc', 'Thanh Hà', 'Văn Toàn'];
const CHAT = ['khó quá cô ơi', 'chữ gì vậy trời', 'hay quá', 'vào lớp', 'cô xinh quá', 'ủa là gì', '???', 'hihi'];
const fake = (i: number) => ({ username: `hs${i}`, nickname: `${HO[i % HO.length]} ${TEN[i % TEN.length]}`, avatar: '' });
const shuffleWord = (w: string) => [...w].sort(() => Math.random() - 0.5).join('');

export function GameControls({ view, stageCount = 0 }: { view: StageView | null; stageCount?: number }) {
  const [sent, setSent] = useState(0);
  const [running, setRunning] = useState(false);
  const [bdName, setBdName] = useState('');
  const testVisitor = useRef(0);
  const [roseDraft, setRoseDraft] = useState<RoseSettings>({ visible: true, hint: 1, deputy: 5, leader: 10, teacher: 20 });
  const [roseMessage, setRoseMessage] = useState('');
  const settingsKey = JSON.stringify(view?.roseSettings);
  const testRose = (person: number, count: number) => emitTest('gift', { ...fake(person), giftName: 'Rose', giftId: 1, diamondCount: 1, repeatCount: count, roleCount: count });
  const roseSettings = view?.roseSettings ?? roseDraft;
  const nextLeaderCount = roseSettings.leader;
  useEffect(() => {
    if (view?.roseSettings) setRoseDraft({ ...view.roseSettings });
  }, [settingsKey]);

  /** Giả lập n người xem cùng bình luận trong 20 giây: 15% đúng, 20% đoán sai, còn lại nói chuyện */
  const flood = async (n: number) => {
    if (!view?.answer || running) return;
    setRunning(true);
    setSent(0);
    const answer = view.answer.toLowerCase();
    const start = Date.now();
    let done = 0;
    await Promise.all(
      Array.from({ length: n }, (_, i) => {
        const r = Math.random();
        const comment = r < 0.15 ? answer : r < 0.35 ? shuffleWord(answer) : CHAT[i % CHAT.length];
        const delay = Math.random() * 20_000;
        return new Promise<void>((ok) =>
          setTimeout(async () => {
            // TikTok gắn giờ lúc gửi; tới tay bot có thể trễ tới 1,5 giây và lệch thứ tự
            await emitTest('chat', { ...fake(i), comment, createTime: start + delay - Math.random() * 1500 }).catch(() => {});
            setSent(++done);
            ok();
          }, delay),
        );
      }),
    );
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      {stageCount > 1 && <div className="rounded-lg bg-red-600 p-2 text-white">Đang mở {stageCount} trang stage, sẽ có 2 giọng. Đóng bớt đi.</div>}
      {view && (
        <div className="rounded-lg bg-slate-800 p-3 text-sm leading-6">
          <div>
            Ván {view.round} · câu {view.qNo}/{view.total} · {view.phase}
          </div>
          <div>
            Đáp án (chỉ mình thấy): <b className="text-amber-300">{view.answer || '—'}</b>
          </div>
          <div>
            Bot nhận câu này: <b>{view.stats.received}</b> comment · {view.stats.attempts} lượt trả lời · {view.correctCount} đúng
          </div>
          <div>
            Đang chơi: <b>{view.players}</b> bạn
            {view.players < GAME.smallRoomPlayers && <span className="text-amber-300"> · phòng vắng: có người đúng là {GAME.smallRoomEndAfterSec} giây sau chốt câu</span>}
          </div>
          {view.topic && <div>Chủ đề cả lớp chọn: {view.topic}</div>}
          {sent > 0 && <div>Giả lập đã gửi: {sent}</div>}
        </div>
      )}
      {/* Chủ kênh dùng trong lúc live */}
      <fieldset className="space-y-3 rounded-lg bg-slate-800 p-3">
        <legend className="px-1 text-sm font-bold">🌹 Thiết lập Hoa hồng</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={roseDraft.visible} onChange={(e) => setRoseDraft({ ...roseDraft, visible: e.target.checked })} />Hiện bảng Hoa hồng trên màn chơi</label>
        <div className="grid grid-cols-2 gap-2">
          {([['hint', 'Mở 1 chữ'], ['deputy', 'Lớp phó'], ['leader', 'Lớp trưởng'], ['teacher', 'Cô giáo · 2 phút']] as const).map(([key, label]) => (
            <label key={key} className="text-sm">{label}
              <input type="number" min={1} max={9999} step={1} value={Number.isNaN(roseDraft[key]) ? '' : roseDraft[key]} onChange={(e) => setRoseDraft({ ...roseDraft, [key]: e.target.valueAsNumber })} className="mt-1 w-full rounded bg-slate-900 px-2 py-1.5 text-white" />
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-300">Số Hoa hồng trong một combo. Ẩn bảng vẫn giữ cơ chế mở chữ và nhận vai.</p>
        <Btn disabled={!view} onClick={async () => {
          if (![roseDraft.hint, roseDraft.deputy, roseDraft.leader, roseDraft.teacher].every((n) => Number.isInteger(n) && n >= 1 && n <= 9999) || !(roseDraft.deputy < roseDraft.leader && roseDraft.leader < roseDraft.teacher)) {
            setRoseMessage('Nhập số nguyên 1–9999; mốc lớp phó < lớp trưởng < cô giáo.'); return;
          }
          try {
            const result = await sendControl('custom', `roseSettings:${JSON.stringify(roseDraft)}`);
            setRoseMessage(result.success === false ? 'Chưa gửi được. Thử lại nhé.' : 'Đã gửi thiết lập tới màn chơi.');
          } catch { setRoseMessage('Mất kết nối, chưa lưu được thiết lập.'); }
        }}>Áp dụng</Btn>
        {roseMessage && <p role="status" className="text-xs text-amber-300">{roseMessage}</p>}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => confirm(`Bỏ câu "${view?.answer}"? Câu này sẽ không bao giờ được hỏi lại.`) && sendControl('custom', 'ban')}
          disabled={!view?.answer || !!view.math || !['question', 'bonus', 'reveal'].includes(view.phase)}
          className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40"
        >
          🚫 Bỏ câu này
        </button>
        <input
          value={bdName}
          onChange={(e) => setBdName(e.target.value)}
          placeholder="Tên bạn sinh nhật"
          className="w-48 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <Btn
          onClick={() => {
            if (bdName.trim()) sendControl('custom', `birthday:${bdName.trim()}`);
            setBdName('');
          }}
        >
          🎂 Chúc sinh nhật
        </Btn>
        <a href="/bao-cao" target="_blank" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600">
          📊 Báo cáo hôm nay
        </a>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => sendControl('custom', 'skip')}>⏭ Qua phần tiếp</Btn>
        <Btn onClick={() => sendControl('custom', 'newRound')}>🔄 Ván mới</Btn>
        <Btn onClick={() => sendControl('custom', 'goodbye')}>👋 Chào tạm biệt (xuống live)</Btn>
        <Btn onClick={() => emitTest('chat', { ...fake(Math.floor(Math.random() * 50)), comment: view?.answer.toLowerCase() ?? '' })}>✅ 1 bạn trả lời đúng</Btn>
        <Btn onClick={() => {
          const id = ++testVisitor.current;
          emitTest('member', { username: `walk-test-${Date.now()}-${id}`, nickname: `Bạn mới ${id}`, avatar: '' });
        }}>🚶 1 bạn mới đi vào lớp</Btn>
        {import.meta.env.DEV && <a href="/tools/student-movement-preview.html" target="_blank" rel="noreferrer" className="rounded-lg bg-amber-700 px-3 py-2 text-sm text-white hover:bg-amber-600">🎬 Xem thử đi ra / vào</a>}
        <Btn onClick={() => testRose(3, roseSettings.hint)}>🌹 Test mở chữ · x{roseSettings.hint}</Btn>
        <Btn onClick={() => testRose(3, 3)}>🎆 Test pháo hoa nhẹ · x3 🌹</Btn>
        <Btn disabled={!view} onClick={() => sendControl('custom', 'teacherChatTest')}>💬 Test chat cô giáo</Btn>
        <Btn onClick={() => testRose(1, roseSettings.leader)}>👑 Test lớp trưởng · x{roseSettings.leader} 🌹</Btn>
        <Btn disabled={nextLeaderCount >= roseSettings.teacher} onClick={() => testRose(view?.roleHolders?.find((r) => r.label === 'Lớp trưởng')?.username === 'hs2' ? 1 : 2, nextLeaderCount)}>👑 Test đổi lớp trưởng · x{nextLeaderCount} 🌹</Btn>
        <Btn onClick={() => testRose(4, roseSettings.teacher)}>👩‍🏫 Test cô giáo · 2 phút</Btn>
        <Btn onClick={() => emitTest('gift', { ...fake(4), giftName: 'Mũ', giftId: 2, diamondCount: 99, repeatCount: 1 })}>🎁 Quà to</Btn>
        <Btn disabled={!view} onClick={() => emitTest('chat', { ...fake(0), comment: 'nam' })}>👦 Test đổi nam · Nguyễn Lan Anh</Btn>
        <Btn disabled={!view} onClick={() => emitTest('chat', { ...fake(0), comment: 'nữ' })}>👧 Test đổi nữ · Nguyễn Lan Anh</Btn>
        <Btn onClick={() => emitTest('like', { ...fake(5), likeCount: 300 })}>❤️ 300 tim</Btn>
        <Btn onClick={() => emitTest('chat', { ...fake(Math.floor(Math.random() * 50)), comment: 'hôm nay sinh nhật con cô ơi' })}>🎂 Thử: 1 bạn báo sinh nhật</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:rps')}>✊ Ra chơi: oẳn tù tì</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:callup')}>📢 Ra chơi: kiểm tra miệng</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:pick')}>⚖️ Ra chơi: chọn phe</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:roll')}>🙋 Ra chơi: điểm danh</Btn>
        <Btn onClick={() => sendControl('custom', 'recess:heart')}>❤️ Ra chơi: thả tim</Btn>
        <Btn onClick={() => sendControl('custom', 'show:everest')}>🏔️ Game: Đường lên đỉnh Everest</Btn>
        <Btn onClick={() => sendControl('custom', 'show:chuong')}>🔔 Game: Rung Chuông Đồng</Btn>
        <Btn onClick={() => Array.from({ length: 10 }, (_, i) => emitTest('chat', { ...fake(i), comment: view?.show?.step === 'stake' ? ['10', '20'][i % 2] : 'ABCD'[Math.floor(Math.random() * 4)] }))}>
          🎲 Thử game: 10 bạn gõ A/B/C/D
        </Btn>
        <Btn onClick={() => flood(100)} disabled={running}>👥 100 người cùng đoán</Btn>
        <Btn onClick={() => flood(1000)} disabled={running}>👥 1000 người cùng đoán</Btn>
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-40">
      {children}
    </button>
  );
}
