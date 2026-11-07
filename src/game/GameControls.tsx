import { useEffect, useRef, useState } from 'react';
import { emitTest, sendControl } from '../live/page';
import type { StageView } from './useGame';
import { GAME, type RoomCfg } from './config';

// Nút riêng của Lớp Học Chữ ở trang điều khiển: điều khiển ván + giả lập phòng đông để thử bot
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const TEN = ['Lan Anh', 'Minh Tuấn', 'Thu Trang', 'Quốc Bảo', 'Ngọc Hân', 'Gia Huy', 'Khánh Linh', 'Hải Yến', 'Đức Anh', 'Bảo Ngọc', 'Thanh Hà', 'Văn Toàn'];
const CHAT = ['khó quá cô ơi', 'chữ gì vậy trời', 'hay quá', 'vào lớp', 'cô xinh quá', 'ủa là gì', '???', 'hihi'];
const fake = (i: number) => ({ username: `hs${i}`, nickname: `${HO[i % HO.length]} ${TEN[i % TEN.length]}`, avatar: '' });
const shuffleWord = (w: string) => [...w].sort(() => Math.random() - 0.5).join('');

// Cài đặt lớp: tên + giọng cô giáo, chữ bảng đỏ, bật tắt 2 game lớn, ảnh nền. Đổi là trang stage đổi ngay, không cần tải lại
function RoomSettings() {
  const [cfg, setCfg] = useState<RoomCfg>(GAME.defaultRoom);
  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const load = (r: Partial<RoomCfg>) => setCfg({ ...GAME.defaultRoom, ...r });
  useEffect(() => {
    fetch('/api/room-settings').then((r) => r.json()).then(load).catch(() => {});
  }, []);
  const save = async (patch: Partial<RoomCfg>, done: string) => {
    const r = await fetch('/api/room-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then((x) => x.json()).catch(() => ({ success: false, error: 'Không kết nối được máy chủ' }));
    setMsg(r.success ? done : r.error);
    if (r.success) load(r.room);
    return r.success as boolean;
  };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setMsg('Đang tải ảnh lên...');
    const r = await fetch('/api/room-bg', { method: 'POST', headers: { 'Content-Type': f.type }, body: f })
      .then((x) => x.json())
      .catch(() => ({ success: false, error: 'Ảnh quá lớn hoặc không đúng loại (PNG, JPG, WEBP, tối đa 12 MB)' }));
    setMsg(r.success ? 'Đã đổi nền lớp' : r.error);
    if (r.success) load(r.room);
    if (file.current) file.current.value = '';
  };
  const resetBg = async () => {
    const r = await fetch('/api/room-bg', { method: 'DELETE' }).then((x) => x.json()).catch(() => ({ success: false, error: 'Không kết nối được máy chủ' }));
    setMsg(r.success ? 'Đã về nền đang chọn' : r.error);
    if (r.success) load(r.room);
  };
  const input = 'min-w-0 flex-1 rounded-lg bg-slate-800 px-2 py-1';
  const row = 'flex items-center gap-1.5';
  const label = 'w-24 shrink-0 text-slate-400';
  return (
    <div className="space-y-2 rounded-2xl bg-slate-900 p-3 text-xs ring-1 ring-slate-800">
      <div className="flex justify-between font-semibold text-slate-200">
        <span>🏫 Cài đặt lớp</span>
        <span role="status" className="font-normal text-amber-300">{msg}</span>
      </div>
      <div className={row}>
        <label htmlFor="room-teacher" className={label}>Tên cô giáo</label>
        <input id="room-teacher" className={input} placeholder={cfg.teacherName} maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
        <Btn disabled={!name.trim()} onClick={() => save({ teacherName: name }, 'Đã đổi tên cô giáo').then((ok) => ok && setName(''))}>
          Lưu
        </Btn>
      </div>
      <div className={row}>
        <label htmlFor="room-voice" className={label}>Giọng cô giáo</label>
        <select id="room-voice" className={input} value={cfg.teacherVoice} onChange={(e) => save({ teacherVoice: e.target.value as RoomCfg['teacherVoice'] }, 'Đã đổi giọng')}>
          <option value="nu">Nữ (HoaiMy)</option>
          <option value="nam">Nam (NamMinh)</option>
        </select>
      </div>
      <div className={row}>
        <label htmlFor="room-motto" className={label}>Chữ bảng đỏ</label>
        <input id="room-motto" className={input} placeholder={cfg.motto || 'Đang luân phiên khẩu hiệu'} maxLength={40} value={motto} onChange={(e) => setMotto(e.target.value)} />
        <Btn disabled={!motto.trim()} onClick={() => save({ motto }, 'Đã đổi chữ bảng đỏ').then((ok) => ok && setMotto(''))}>
          Lưu
        </Btn>
        {cfg.motto && <Btn onClick={() => save({ motto: '' }, 'Đã bật khẩu hiệu luân phiên')}>Luân phiên</Btn>}
      </div>
      <div className={row}>
        <span className={label}>Cuộc thi</span>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={cfg.everest} onChange={(e) => save({ everest: e.target.checked }, e.target.checked ? 'Đã bật Everest' : 'Đã tắt Everest')} />
          🏔️ Everest
        </label>
        <label className="ml-2 flex items-center gap-1">
          <input type="checkbox" checked={cfg.chuong} onChange={(e) => save({ chuong: e.target.checked }, e.target.checked ? 'Đã bật Rung Chuông Đồng' : 'Đã tắt Rung Chuông Đồng')} />
          🔔 Rung Chuông Đồng
        </label>
      </div>
      <div className={row}>
        <span className={label}>Nền lớp học</span>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <Btn onClick={() => file.current?.click()}>Chọn ảnh...</Btn>
        {cfg.bg && <Btn onClick={resetBg}>Về nền gốc</Btn>}
        <span className="text-slate-500">Ảnh dọc 9:16, tối đa 12 MB</span>
      </div>
    </div>
  );
}

export function GameControls({ view, stageCount = 0 }: { view: StageView | null; stageCount?: number }) {
  const [sent, setSent] = useState(0);
  const [running, setRunning] = useState(false);
  const [bdName, setBdName] = useState('');
  const testVisitor = useRef(0);
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
      <RoomSettings />
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
        <Btn disabled={!view} onClick={() => sendControl('custom', 'teacherChatTest')}>💬 Test chat cô giáo</Btn>
        <Btn onClick={() => emitTest('gift', { ...fake(4), giftName: 'Mũ', giftId: 2, diamondCount: 99, repeatCount: 1 })}>🎁 Quà to</Btn>
        <Btn disabled={!view} onClick={() => emitTest('chat', { ...fake(0), comment: 'nam' })}>👦 Test đổi nam · Nguyễn Lan Anh</Btn>
        <Btn disabled={!view} onClick={() => emitTest('chat', { ...fake(0), comment: 'nữ' })}>👧 Test đổi nữ · Nguyễn Lan Anh</Btn>
        <Btn onClick={() => emitTest('like', { ...fake(5), likeCount: 100 })}>❤️ 100 tim · bắn pháo</Btn>
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
