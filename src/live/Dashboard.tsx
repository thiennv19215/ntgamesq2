import { useEffect, useState, type ReactNode } from 'react';
import type { LiveStatus } from './types';
import { emitTest, sendControl } from './page';
import { readStageBackgroundId, STAGE_BACKGROUNDS, STAGE_BACKGROUND_EVENT, STAGE_BACKGROUND_STORAGE_KEY } from './stage-backgrounds';
import {
  readStageCharacters,
  saveStageCharacters,
  STAGE_CHARACTERS_EVENT,
  STAGE_CHARACTERS_STORAGE_KEY,
  STAGE_STUDENT_SETS,
  STAGE_TEACHER_SETS,
  type StageCharacterSelection,
  type StageStudentSetId,
  type StageTeacherSetId,
} from './stage-characters';

const FAKE_NAMES = ['Lan Anh', 'Minh Tuấn', 'Bé Na 🌸', 'Hoàng Long', 'Thu Trang', 'Quốc Bảo', 'duyanh99', '𝑵𝒈𝒐̣𝒄 𝑨𝒏𝒉'];
const pick = () => {
  const nickname = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
  return { nickname, username: nickname.normalize('NFKD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'khach' };
};

/**
 * Trang điều khiển (http://localhost:3006). Im lặng, không phát tiếng.
 * - Kết nối phòng live
 * - Gõ câu cho giọng đọc trên stage
 * - Nút giả lập sự kiện để test khi chưa live
 * `preview`: bản xem trước của stage (im lặng)
 */
export function Dashboard({
  status,
  channelName,
  preview,
  extra,
}: {
  status: LiveStatus | null;
  channelName: string;
  preview: ReactNode;
  extra?: ReactNode;
}) {
  const [user, setUser] = useState(() => localStorageGet('tiktokUser'));
  const [nameText, setNameText] = useState('');
  const [msg, setMsg] = useState('');
  const [speakText, setSpeakText] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    setMsg('');
    localStorageSet('tiktokUser', user);
    try {
      const r = await fetch('/api/tiktok/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user }),
      }).then((x) => x.json());
      setMsg(r.success ? 'Đã kết nối' : r.error);
    } catch (e) {
      setMsg(String(e));
    }
    setBusy(false);
  };

  const disconnect = () => fetch('/api/tiktok/disconnect', { method: 'POST' });

  const speak = async () => {
    const r = await sendControl('speak', speakText);
    setMsg(r.pages > 1 ? `Đã gửi (đang mở ${r.pages} trang)` : 'Đã gửi');
    setSpeakText('');
  };

  const saveName = async () => {
    const r = await sendControl('setName', nameText);
    setMsg(r.success ? `Đã lưu tên lớp: ${nameText.trim()}` : r.error);
    if (r.success) setNameText('');
  };

  return (
    // Gọn trong 1 màn hình: cột trái là nút (tự cuộn nếu thiếu chỗ), cột phải là bản xem trước cao bằng màn hình
    <div className="h-screen overflow-hidden bg-slate-950 p-3 text-sm text-slate-100">
      <div className="mx-auto flex h-full max-w-[1500px] gap-3">
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <Card title="Kết nối TikTok LIVE">
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-1.5"
                placeholder="username TikTok (không cần @)"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && user.trim() && connect()}
              />
              <Btn onClick={connect} disabled={busy || !user.trim()}>
                {busy ? 'Đang nối...' : 'Kết nối'}
              </Btn>
              <Btn onClick={disconnect} tone="ghost">
                Ngắt
              </Btn>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 text-xs">
              {status?.isConnected ? (
                <span className="text-emerald-400">
                  ● Đang live @{status.username} · {status.viewerCount} người xem · {status.totalLikes} tim
                </span>
              ) : status?.isConnecting ? (
                <span className="text-amber-400">● Đang kết nối...</span>
              ) : (
                <span className="text-slate-400">● Chưa kết nối</span>
              )}
              <span className="text-slate-500">
                LIVE Studio: <b className="text-slate-300">http://lvh.me:{window.location.port || 80}/?view=stage</b> · 1080×1920
              </span>
            </div>
            {(msg || status?.error) && <div className="mt-1 text-xs text-amber-300">{msg || status?.error}</div>}
          </Card>

          <Card title="Chọn bối cảnh và nhân vật">
            <div className="grid gap-3 xl:grid-cols-2">
              <StageBackgroundPicker />
              <StageCharacterPicker />
            </div>
          </Card>

          <Card title="Giọng đọc trên stage">
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-1.5"
                placeholder="Gõ câu muốn MC đọc ngay..."
                value={speakText}
                onChange={(e) => setSpeakText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && speakText.trim() && speak()}
              />
              <Btn onClick={speak} disabled={!speakText.trim()}>
                Đọc ngay
              </Btn>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <RateSlider />
              <span className="ml-2 text-slate-400">Tên lớp</span>
              <input
                className="w-32 rounded-lg bg-slate-800 px-2 py-1"
                placeholder={channelName}
                maxLength={40}
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && nameText.trim() && saveName()}
              />
              <Btn tone="ghost" onClick={saveName} disabled={!nameText.trim()}>
                Lưu
              </Btn>
              <span className="flex-1" />
              <Btn tone="danger" onClick={() => confirmReset()}>
                Reset game
              </Btn>
            </div>
          </Card>

          {extra}

          <details className="rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800">
            <summary className="cursor-pointer font-semibold">Giả lập chung (người vào, follow, combo quà...)</summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Btn tone="ghost" onClick={() => emitTest('member', pick())}>
                👋 Người vào
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: 'Live hay quá' })}>
                💬 Comment
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: 'mong mai thi được điểm cao' })}>
                🙏 Cầu chúc
              </Btn>
              <Btn tone="ghost" onClick={() => comboSameUser()}>
                🔁 1 người tặng 3 lần liền
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('follow', pick())}>
                ➕ Follow
              </Btn>
            </div>
            <p className="mt-2 text-xs text-slate-500">Sự kiện giả đi tới mọi trang đang mở, kể cả stage trong LIVE Studio.</p>
          </details>
        </div>

        <div className="flex flex-none flex-col items-center">
          <div className="mb-1 text-xs text-slate-400">Xem trước (im lặng)</div>
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-700">{preview}</div>
        </div>
      </div>
    </div>
  );
}

function StageBackgroundPicker() {
  const [selected, setSelected] = useState(readStageBackgroundId);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = () => setSelected(readStageBackgroundId());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STAGE_BACKGROUND_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(STAGE_BACKGROUND_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STAGE_BACKGROUND_EVENT, sync);
    };
  }, []);

  const choose = (id: (typeof STAGE_BACKGROUNDS)[number]['id']) => {
    setSelected(id);
    setError('');
    try {
      localStorage.setItem(STAGE_BACKGROUND_STORAGE_KEY, id);
    } catch {
      // The stage keeps its current background if browser storage is unavailable.
    }
    window.dispatchEvent(new Event(STAGE_BACKGROUND_EVENT));
    void fetch('/api/stage/background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('request failed');
      })
      .catch(() => setError('Không gửi được nền tới LIVE Studio.'));
  };

  return (
    <section aria-labelledby="stage-background-heading" className="min-w-0">
      <h3 id="stage-background-heading" className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Bối cảnh sân khấu · 9:16</h3>
      <p className="mb-2 text-xs text-slate-400">Chọn nền 1080 × 1920. Bản xem trước và LIVE Studio đổi cùng lúc.</p>
      {error && <p role="status" className="mb-2 text-xs text-amber-300">{error}</p>}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {STAGE_BACKGROUNDS.map((background) => {
          const active = selected === background.id;
          return (
            <button
              key={background.id}
              type="button"
              onClick={() => choose(background.id)}
              aria-pressed={active}
              aria-label={`${background.title}${active ? ', đang sử dụng' : ''}`}
              className={`flex min-w-0 items-center gap-2 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                active ? 'bg-amber-500/15 ring-2 ring-amber-400' : 'bg-slate-800 ring-1 ring-slate-700 hover:bg-slate-700'
              }`}
            >
              <img src={background.thumbnail} alt="" loading="lazy" decoding="async" className="h-24 w-[54px] shrink-0 rounded-md object-cover" />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-100">{background.title}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{background.description}</span>
                <span className="mt-1 block text-[11px] text-slate-500">1080 × 1920</span>
                {active && <span className="mt-1 block text-xs font-semibold text-amber-300">Đang dùng</span>}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StageCharacterPicker() {
  const [selected, setSelected] = useState(readStageCharacters);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = () => setSelected(readStageCharacters());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STAGE_CHARACTERS_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(STAGE_CHARACTERS_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STAGE_CHARACTERS_EVENT, sync);
    };
  }, []);

  const save = (next: StageCharacterSelection) => {
    setSelected(next);
    setError('');
    saveStageCharacters(next);
    void fetch('/api/stage/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
      .then((response) => {
        if (!response.ok) throw new Error('request failed');
      })
      .catch(() => setError('Không gửi được lựa chọn nhân vật tới LIVE Studio.'));
  };

  const chooseStudent = (student: StageStudentSetId) => save({ ...selected, student });
  const chooseTeacher = (teacher: StageTeacherSetId) => save({ ...selected, teacher });

  return (
    <section aria-labelledby="stage-character-heading" className="min-w-0">
      <h3 id="stage-character-heading" className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Nhân vật</h3>
      <p className="mb-3 text-xs text-slate-400">Chọn từng bộ riêng. Bản xem trước và LIVE Studio sẽ đổi cùng lúc.</p>
      {error && <p role="status" className="mb-2 text-xs text-amber-300">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <section aria-labelledby="student-set-heading">
          <h4 id="student-set-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Bộ học sinh</h4>
          <div className="grid grid-cols-1 gap-2">
            {STAGE_STUDENT_SETS.map((set) => (
              <CharacterChoice key={set.id} title={set.title} description={set.description} thumbnail={set.thumbnail} active={selected.student === set.id} onClick={() => chooseStudent(set.id)} />
            ))}
          </div>
        </section>
        <section aria-labelledby="teacher-set-heading">
          <h4 id="teacher-set-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Bộ giáo viên</h4>
          <div className="grid grid-cols-1 gap-2">
            {STAGE_TEACHER_SETS.map((set) => (
              <CharacterChoice key={set.id} title={set.title} description={set.description} thumbnail={set.thumbnail} active={selected.teacher === set.id} onClick={() => chooseTeacher(set.id)} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function CharacterChoice({
  title,
  description,
  thumbnail,
  active,
  onClick,
}: {
  title: string;
  description: string;
  thumbnail: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${title}${active ? ', đang sử dụng' : ''}`}
      className={`flex min-w-0 items-center gap-3 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
        active ? 'bg-amber-500/15 ring-2 ring-amber-400' : 'bg-slate-800 ring-1 ring-slate-700 hover:bg-slate-700'
      }`}
    >
      <img src={thumbnail} alt="" loading="lazy" decoding="async" className="h-24 w-16 shrink-0 rounded-md bg-emerald-950/70 object-contain object-bottom" />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-slate-100">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-400">{description}</span>
        {active && <span className="mt-1 block text-xs font-semibold text-amber-300">Đang dùng</span>}
      </span>
    </button>
  );
}

// Cùng 1 người tặng 3 lần cách nhau 1 giây: chỉ được cảm ơn 1 lần
function comboSameUser() {
  const who = pick();
  for (let i = 0; i < 3; i++) {
    setTimeout(() => emitTest('gift', { ...who, giftName: 'Hoa hồng', giftId: 5655, diamondCount: 1, repeatCount: 1 }), i * 1000);
  }
}

function confirmReset() {
  // không dùng window.confirm để tránh hộp thoại chặn
  void sendControl('reset');
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  tone = 'primary',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'ghost' | 'danger';
}) {
  const cls = {
    primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
    ghost: 'bg-slate-800 hover:bg-slate-700',
    danger: 'bg-rose-700 hover:bg-rose-600',
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
}

function localStorageGet(k: string) {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
}
function localStorageSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    // bỏ qua
  }
}

// Tốc độ giọng MC: kéo là gửi sang trang stage, stage nhớ mức đã chỉnh
function RateSlider() {
  const [rate, setRate] = useState(() => {
    try {
      return Number(localStorage.getItem('voice-rate')) || 1.1;
    } catch {
      return 1.1;
    }
  });
  const change = (r: number) => {
    setRate(r);
    try {
      localStorage.setItem('voice-rate', String(r));
    } catch {
      // bỏ qua
    }
    void sendControl('setRate', String(r));
  };
  return (
    <label className="flex items-center gap-1.5 text-slate-400">
      Tốc độ giọng
      <input type="range" min={0.8} max={1.5} step={0.05} value={rate} onChange={(e) => change(Number(e.target.value))} className="w-28 accent-amber-500" />
      <b className="w-10 text-slate-200">{rate.toFixed(2)}×</b>
    </label>
  );
}
