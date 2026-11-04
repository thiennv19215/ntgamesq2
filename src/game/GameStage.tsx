import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import type { GameState, StageView } from './useGame';
import { GAME } from './config';
import { Hair } from './Hair';
import { AnswerBadge, BouquetIcon, VaseFlower, ConfettiBurst } from './StageAssets';
import './stage.css';

/**
 * Màn hình lớp học 1080x1920. Nền là ảnh public/assets/bg/lop.webp (941x1672 phóng lên 1080 ngang),
 * nên mọi toạ độ dưới đây = toạ độ trên ảnh gốc x K.
 */
const K = 1080 / 941;

// 4 dãy bàn trên cùng: mép trên mặt bàn (y) và tâm từng bàn (x), đo trên ảnh nền gốc
const ROWS = [
  { y: 815, xs: [170, 322, 471, 620, 768], s: 0.92 },
  { y: 945, xs: [148, 310, 473, 636, 796], s: 0.98 },
  { y: 1097, xs: [125, 300, 476, 648, 822], s: 1.04 },
  { y: 1257, xs: [113, 296, 479, 661, 840], s: 1.1 },
];
const SPRITE_H = 250; // chiều cao cả người
const SHOW = 0.5; // ngồi ghế: chỉ hiện phần trên (đầu tới hông)
// khung đầu đã xoá khỏi ảnh thân sau lưng; Hair vẽ tóc riêng theo tài khoản học sinh
const HEAD = { nam: { x: 0.158, y: 0, w: 0.703, h: 0.293 }, nu: { x: 0.162, y: 0, w: 0.680, h: 0.263 } };
// người không có ghế chen chúc 2 bên ngoài cửa lớp: [tâm x, chân y] (px stage), hàng trước (gần lớp) trước
const CROWD_ROWS = 10;
const STAND: [number, number][] = [];
for (let r = 0; r < CROWD_ROWS; r++) {
  const foot = 960 - r * 42;
  for (let c = 0; c < 3; c++) {
    const dx = c * 40 + (r % 2) * 20 + ((r * 7 + c * 13) % 9) - 4; // so le + lệch nhẹ cho giống đám đông
    STAND.push([18 + dx, foot], [1062 - dx, foot]);
  }
}
const NAMED_STANDING = 6; // chỉ hiện tên vài bạn đứng trước, còn lại để đám đông cho gọn

const POSE = {
  nam: { dung: '01-dung', tay: '02-giong-tay', nghi: '03-suy-nghi', vui: '05-vui-mung', buon: '06-buon', ngac: '07-ngac-nhien', chao: '08-vay-chao' },
  nu: { dung: '01-dung', tay: '02-giong-tay', nghi: '03-suy-nghi', vui: '05-vui-mung', buon: '06-buon', ngac: '07-ngac-nhien', chao: '08-vay-chao' },
};
type PoseKey = keyof typeof POSE.nam;

// tải trước mọi tư thế để đổi tư thế không bị nháy trắng
const ALL_IMGS = [
  ...Object.values(POSE.nam).map((p) => `/assets/nv/nam/${p}.webp`),
  ...Object.values(POSE.nam).map((p) => `/assets/nv/nam/sau-${p}.webp`),
  ...Object.values(POSE.nu).map((p) => `/assets/nv/nu/${p}.webp`),
  ...Object.values(POSE.nu).map((p) => `/assets/nv/nu/sau-${p}.webp`),
  ...['01-dung', '02-giang-bai', '03-chi-trai', '04-chi-phai', '05-vui', '06-buon', '07-suy-nghi', '08-vay-chao'].map((p) => `/assets/nv/co-giao/${p}.webp`),
];
const TEACHER_IDLE = {
  x: [0, 0, 0, 0, 0],
  y: [0, -3, -1, -2, 0],
  rotate: [0, 0.45, 0, -0.45, 0],
};
const TEACHER_IDLE_TRANSITION = { duration: 5.2, repeat: Infinity, ease: 'easeInOut' as const };
const STUDENT_IDLE = {
  x: [0, 1.5, 0, -1.5, 0],
  y: [0, -4, 0, -2, 0],
  rotate: [0, 0.45, 0, -0.45, 0],
};
const STUDENT_IDLE_TRANSITIONS = Array.from({ length: 20 }, (_, i) => ({
  duration: 2.8 + (i % 4) * 0.3,
  delay: (i % 5) * 0.24,
  repeat: Infinity,
  ease: 'easeInOut' as const,
}));

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function GameStage({ game, staticPreview = false }: { game: GameState; staticPreview?: boolean }) {
  const now = useNow();
  useEffect(() => {
    for (const src of ALL_IMGS) new Image().src = src;
  }, []);
  const v = game.view;
  if (!v) {
    return (
      <div className="flex h-full items-center justify-center bg-black/60 p-20 text-center text-[48px] text-white">
        Chưa mở trang stage (lvh.me:3000/?view=stage) nên chưa có gì để xem trước
      </div>
    );
  }
  return (
    <MotionConfig reducedMotion={staticPreview ? 'always' : 'user'}>
      <div className={`relative h-full w-full overflow-hidden ${staticPreview ? 'stage-preview' : ''} ${v.clapping ? 'class-clap' : ''}`}>
        <Header v={v} name={game.channelName} />
        <Motto />
        <Board v={v} now={now} />
        <DayTop v={v} />
        <Vase v={v} />
        <Teacher v={v} now={now} />
        <Punished v={v} />
        <Podium v={v} />
        <SeatHint now={now} />
        <Students v={v} now={now} />
        <Standing v={v} now={now} />
        <StudentWalk v={v} />
        <GiftBanner gift={game.lastGift} now={now} />
        <BirthdayBanner v={v} />
        <LoveHearts n={v.loveFans} />
        <PollCard v={v} />
        {v.clapping && <Claps />}
        {(v.correctCount > 0 && v.correctTop.length > 0 && (v.phase === 'question' || v.phase === 'bonus')) && <ConfettiBurst key={v.correctTop[0]?.username ?? v.qNo} />}
        {v.phase === 'results' && <ConfettiBurst key={`results-${v.round}`} />}
      </div>
    </MotionConfig>
  );
}

function Header({ v, name }: { v: StageView; name: string }) {
  const sub =
    v.phase === 'recess'
      ? 'Giờ ra chơi'
      : v.phase === 'vote'
        ? 'Chọn chủ đề tiết sau'
        : v.qNo > 0 && v.phase !== 'results'
          ? `${v.review ? 'Ôn bài' : `Tiết ${v.round}`} · Câu ${v.qNo}/${v.total}`
          : `Tiết ${v.round}`;
  return (
    <div className="absolute left-1/2 top-[14px] flex w-[470px] -translate-x-1/2 flex-col items-center rounded-[28px] border-[5px] border-[#7a4a1d] bg-[#f6e3b4] px-6 py-3 shadow-[0_8px_0_#5b3512]">
      <div className="max-w-full truncate font-extrabold leading-none tracking-wide text-[#7a2e0e]" style={{ fontSize: name.length > 14 ? 34 : 46 }}>
        {name.toUpperCase()}
      </div>
      <div className="mt-1 text-[26px] font-semibold text-[#6b4a22]">
        {sub} · {v.classSize} bạn
      </div>
    </div>
  );
}

// ---------- Bảng đen ----------
function Board({ v, now }: { v: StageView; now: number }) {
  const left = Math.max(0, Math.ceil((v.endsAt - now) / 1000));
  return (
    <div className={`chalk absolute left-[350px] top-[262px] h-[348px] w-[555px] text-[#f4f1e6] ${v.golden && v.phase !== 'recess' ? 'golden-board' : ''}`}>
      {v.phase === 'intro' && v.round % 2 === 0 && v.weekTop.length > 0 && <WeekBoard v={v} left={left} />}
      {v.phase === 'intro' && !(v.round % 2 === 0 && v.weekTop.length > 0) && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="text-[64px] leading-none">Sắp vào học!</div>
          <div className="mt-6 text-[36px] leading-snug">
            Cô xáo chữ, cả lớp đoán từ.
            <br />
            Gõ đáp án vào <b className="text-[#ffe680]">bình luận</b>
            <br />
            Nhanh nhất <b className="text-[#ffe680]">+10 điểm</b>
          </div>
          {v.topic && <div className="mt-3 text-[32px] text-[#ffe680]">🗳️ Cả lớp chọn: {v.topic}</div>}
          {v.review && <div className="mt-3 text-[32px] text-[#ffe680]">📖 Giờ ôn bài · gõ "vào lớp" để học bài mới</div>}
          <div className="mt-4 text-[30px] opacity-80">Bắt đầu sau {left} giây</div>
        </div>
      )}

      {(v.phase === 'question' || v.phase === 'bonus' || v.phase === 'reveal') && (
        <motion.div
          key={`${v.phase}-${v.qNo}`}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="flex h-full flex-col"
        >
          <div className="flex items-center justify-between">
            {v.golden ? (
              <span className="rounded-full bg-[#ffd84a] px-4 text-[28px] font-bold text-[#7a2e0e]">⭐ CÂU HỎI VÀNG x2</span>
            ) : (
              <span className={`rounded-full border-2 px-4 text-[26px] ${v.slot ? 'border-[#ffe680] text-[#ffe680]' : 'border-[#f4f1e6]/60'}`}>
                {v.slot === 'meo' ? (v.category === 'Đố dân gian vui' ? '😂 Đố dân gian' : '🤪 Đố mẹo') : v.slot === 'su' ? '📜 Lịch sử' : v.slot === 'anh' ? '🔤 Tiếng Anh' : v.category}
              </span>
            )}
            {v.phase !== 'reveal' ? <Timer left={left} duration={v.phase === 'bonus' ? GAME.bonusSec : GAME.questionSec} /> : <span className="text-[34px] text-[#9df29d]">Đáp án</span>}
          </div>
          {!v.boardShown ? (
            // cô đang đọc đề: chưa hiện chữ xáo / phép tính, hô bắt đầu mới hiện
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              {!v.math && <div className="line-clamp-2 text-[38px] leading-[48px]">{v.clue}</div>}
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mt-6 text-[40px] text-[#ffe680]"
              >
                👂 Nghe cô đọc đề nè…
              </motion.div>
            </div>
          ) : v.math ? (
            // câu toán: phép tính viết to bằng phấn, người xem gõ số
            <motion.div
              key={v.qNo}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`mt-4 shrink-0 text-center text-[76px] font-extrabold leading-[96px] text-[#ffe680] ${v.phase === 'reveal' ? 'opacity-50' : ''}`}
            >
              {v.math}
            </motion.div>
          ) : (
            <>
              <div className="mt-2 line-clamp-2 min-h-[96px] shrink-0 text-center text-[38px] leading-[48px]">{v.clue}</div>
              <Tiles key={v.qNo} letters={v.tiles} dim={v.phase === 'reveal'} />
            </>
          )}
          {v.boardShown && <Slots slots={v.slots} reveal={v.phase === 'reveal'} />}
          {v.boardShown && v.math && v.phase !== 'reveal' && <div className="mt-2 text-center text-[28px] opacity-80">Gõ số vào bình luận</div>}
          {v.phase === 'bonus' && (
            <div className="mt-auto text-center text-[28px] text-[#ffe680]">{v.math ? 'Thêm 10 giây, nhẩm lẹ lên!' : 'Cô mở thêm 1 chữ, thêm 10 giây!'}</div>
          )}
        </motion.div>
      )}

      {v.phase === 'vote' && v.vote && <Vote v={v} left={left} />}
      {v.phase === 'results' && <Results v={v} />}
      {v.phase === 'recess' && v.recess && <Recess v={v} left={left} />}
    </div>
  );
}

function Timer({ left, duration }: { left: number; duration: number }) {
  const urgent = left <= 5;
  const circumference = 2 * Math.PI * 34;
  const progress = Math.max(0, Math.min(1, left / duration));
  const ring = urgent ? '#ff8a7a' : '#ffe680';
  return (
    <motion.div
      key={left}
      initial={false}
      animate={{
        filter: urgent
          ? ['drop-shadow(0 0 2px rgba(255,110,80,.25))', 'drop-shadow(0 0 11px rgba(255,110,80,.8))', 'drop-shadow(0 0 2px rgba(255,110,80,.25))']
          : ['drop-shadow(0 0 1px rgba(255,230,128,.15))', 'drop-shadow(0 0 7px rgba(255,230,128,.52))', 'drop-shadow(0 0 1px rgba(255,230,128,.15))'],
      }}
      transition={{ duration: urgent ? 0.42 : 0.3, ease: 'easeOut' }}
      className={`relative flex h-[64px] w-[64px] shrink-0 items-center justify-center px-2 text-[40px] font-extrabold leading-none tabular-nums ${urgent ? 'text-[#ff8a7a]' : 'text-[#fff7dc]'}`}
    >
      <img src="/assets/ui/classroom-timer.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -inset-[9px] h-[82px] w-[82px] select-none" />
      <svg aria-hidden="true" className="pointer-events-none absolute -inset-[12px] h-[88px] w-[88px] -rotate-90 overflow-visible">
        <circle cx="44" cy="44" r="41" fill="none" stroke="rgba(255,255,255,.24)" strokeWidth="2.5" />
        <motion.circle
          cx="44"
          cy="44"
          r="41"
          fill="none"
          stroke={ring}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - progress), opacity: urgent ? [1, 0.55, 1] : 1 }}
          transition={{ strokeDashoffset: { duration: 0.45, ease: 'easeOut' }, opacity: { duration: 0.35 } }}
        />
      </svg>
      <motion.span
        key={`digit-${left}`}
        initial={{ scale: 1.22, opacity: 0.7 }}
        animate={{ scale: [1.22, 0.96, 1.08, 1], opacity: 1 }}
        transition={{ duration: 0.32, times: [0, 0.45, 0.72, 1], ease: 'easeOut' }}
        className="inline-block"
      >
        {left}
      </motion.span>
    </motion.div>
  );
}

function Tiles({ letters, dim }: { letters: string[]; dim: boolean }) {
  const n = letters.length || 1;
  const size = Math.min(76, Math.floor((555 - 8 * (n - 1)) / n));
  return (
    <div className={`mt-3 flex justify-center gap-2 ${dim ? 'opacity-40' : ''}`}>
      {letters.map((ch, i) => (
        <motion.div
          key={`${i}${ch}`}
          initial={{ y: -30, opacity: 0, rotate: -8 }}
          animate={{ y: 0, opacity: 1, rotate: ((i * 37) % 9) - 4 }}
          transition={{ delay: i * 0.025, type: 'spring', stiffness: 300, damping: 18 }}
          className="shrink-0"
          style={{ width: size, height: size * 1.1 }}
        >
          <div
            className={`tile flex h-full w-full items-center justify-center font-extrabold ${dim ? '' : 'tile-float'}`}
            style={{ fontSize: size * 0.62, animationDelay: `${i * 0.11}s`, animationDuration: `${2.8 + (i % 4) * 0.2}s` }}
          >
            {ch}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Slots({ slots, reveal }: { slots: (string | null)[]; reveal: boolean }) {
  const n = slots.length || 1;
  const size = Math.min(56, Math.floor((555 - 6 * (n - 1)) / n));
  return (
    <div className="mt-4 flex justify-center gap-[6px]">
      {slots.map((ch, i) =>
        ch === ' ' ? (
          <div key={i} style={{ width: size * 0.5 }} />
        ) : (
          <div
            key={i}
            className={`flex items-end justify-center border-b-4 ${reveal ? 'border-[#9df29d] text-[#9df29d]' : 'border-[#f4f1e6]'}`}
            style={{ width: size, height: size, fontSize: size * 0.8, lineHeight: 1 }}
          >
            {ch ?? ''}
          </div>
        ),
      )}
    </div>
  );
}

// Cả lớp chọn chủ đề tiết sau: gõ 1 hoặc 2
function Vote({ v, left }: { v: StageView; left: number }) {
  const r = v.vote!;
  const total = r.counts[0] + r.counts[1] || 1;
  return (
    <div className="flex h-full flex-col items-center text-center">
      <div className="flex w-full items-center justify-between">
        <span className="rounded-full bg-[#ffd84a] px-4 text-[26px] font-bold text-[#7a2e0e]">🗳️ Cả lớp quyết định</span>
        <Timer left={left} duration={GAME.voteSec} />
      </div>
      <div className="mt-1 text-[44px] leading-tight text-[#ffe680]">Tiết sau học gì?</div>
      <div className="mt-3 w-full space-y-4 px-4">
        {r.topics.map((label, i) => {
          const pct = Math.round((r.counts[i] / total) * 100);
          return (
            <div key={label} className="relative h-[76px] overflow-hidden rounded-2xl border-2 border-white/40 text-left">
              <div className="absolute inset-y-0 left-0 bg-[#ffd84a]/35 transition-all duration-500" style={{ width: `${pct}%` }} />
              <div className="relative flex h-full items-center justify-between gap-3 px-4 text-[32px]">
                <span className="truncate">
                  Gõ <b className="text-[#ffe680]">{i + 1}</b>: {label}
                </span>
                <span>{r.counts[i]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Results({ v }: { v: StageView }) {
  const top = v.seats.filter((s) => s.score > 0).slice(0, 5);
  return (
    <div className="flex h-full flex-col items-center">
      <div className="text-[56px] leading-none text-[#ffe680]">Bảng vàng tiết {v.round}</div>
      {top.length === 0 && <div className="mt-16 text-[38px]">Chưa ai ghi điểm</div>}
      <div className="mt-4 w-full space-y-1">
        {top.map((s, i) => (
          <motion.div
            key={s.username}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.25 }}
            className="flex items-center gap-3 px-6 text-[40px]"
          >
            <span className="w-12 text-[#ffe680]">{['🥇', '🥈', '🥉', '4', '5'][i]}</span>
            <span className="flex-1 truncate">{s.nickname}</span>
            <span>{s.score}đ</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------- Giờ ra chơi ----------
const RECESS_TITLE = { callup: 'Kiểm tra miệng', pick: 'Chọn phe', roll: 'Điểm danh siêu tốc', heart: 'Thả tim cả lớp' };

function Recess({ v, left }: { v: StageView; left: number }) {
  const r = v.recess!;
  if (r.stage === 'board') return <SessionBoard v={v} />;
  const playing = r.stage === 'play';
  return (
    <div className="flex h-full flex-col items-center text-center">
      <div className="flex w-full items-center justify-between">
        <span className="rounded-full bg-[#ffd84a] px-4 text-[26px] font-bold text-[#7a2e0e]">
          🔔 Giờ ra chơi{r.game === 'callup' ? ` · ${RECESS_TITLE.callup}` : ''}
        </span>
        {playing && <Timer left={left} duration={GAME.recessPlaySec[r.game]} />}
      </div>
      {r.game !== 'callup' && <div className="mt-1 shrink-0 text-[48px] leading-tight text-[#ffe680]">{RECESS_TITLE[r.game]}</div>}
      {r.game === 'callup' && (
        <>
          <div className="mt-1 max-w-full shrink-0 truncate text-[36px] text-[#ffe680]">📢 {r.callName} lên bảng!</div>
          <div className="line-clamp-2 shrink-0 text-[30px] leading-[36px]">{r.callClue}</div>
          <Tiles letters={r.callTiles} dim={!playing} />
          <Slots slots={r.callSlots} reveal={!playing} />
          {!playing && (
            <div className="mt-1 text-[34px]">{r.callResult === 'right' ? '✅ Đúng! +5 điểm' : r.callResult === 'wrong' ? '❌ Sai mất rồi' : '💤 Không trả lời'}</div>
          )}
        </>
      )}
      {r.game === 'pick' && (
        <div className="mt-4 w-full space-y-4 px-4">
          {r.pick.map((label, i) => {
            const total = r.votes[0] + r.votes[1] || 1;
            const pct = Math.round((r.votes[i] / total) * 100);
            return (
              <div key={label} className="relative h-[70px] overflow-hidden rounded-2xl border-2 border-white/40 text-left">
                <div className="absolute inset-y-0 left-0 bg-[#ffd84a]/35 transition-all duration-500" style={{ width: `${pct}%` }} />
                <div className="relative flex h-full items-center justify-between px-4 text-[36px]">
                  <span>
                    Gõ <b className="text-[#ffe680]">{i + 1}</b>: {label}
                  </span>
                  <span>{r.votes[i]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {r.game === 'roll' && (
        <>
          <div className="text-[34px]">
            Gõ <b className="text-[#ffe680]">CÓ MẶT</b> thật nhanh, 10 bạn đầu +3
          </div>
          <div className="mt-2 grid w-full grid-cols-2 gap-x-6 px-6 text-left text-[28px]">
            {r.roll.map((n, i) => (
              <div key={i} className="truncate">
                {i + 1}. {n}
              </div>
            ))}
          </div>
        </>
      )}
      {r.game === 'heart' && (
        <>
          <div className="mt-4 text-[90px] leading-none">❤️</div>
          <div className="mt-2 h-[40px] w-[460px] overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-[#ff5d8f] transition-all duration-300" style={{ width: `${Math.min(100, (r.hearts / r.heartTarget) * 100)}%` }} />
          </div>
          <div className="mt-2 text-[36px]">
            {r.hearts}/{r.heartTarget} tim
          </div>
        </>
      )}
    </div>
  );
}

// Cuối giờ ra chơi: lớp trưởng các tiết trước (mới nhất trên cùng), ai làm nhiều lần thì có số lần
function SessionBoard({ v }: { v: StageView }) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="text-[48px] leading-none text-[#ffe680]">👑 Lớp trưởng các tiết</div>
      {v.champions.length === 0 && <div className="mt-16 text-[36px]">Chưa có lớp trưởng</div>}
      <div className="mt-3 w-full space-y-1">
        {v.champions.map((c, i) => (
          <motion.div
            key={c.round}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center gap-3 px-6 text-[36px]"
          >
            <span className="w-[110px] text-[26px] text-[#ffe680]">Tiết {c.round}</span>
            <span className="flex-1 truncate">{c.nickname}</span>
            {c.times > 1 && <span className="text-[26px] text-[#ffe680]">👑x{c.times}</span>}
            <span>{c.score}đ</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-auto text-[28px] opacity-80">Tiết mới điểm làm lại, ai cũng có thể làm lớp trưởng!</div>
    </div>
  );
}

function WeekBoard({ v, left }: { v: StageView; left: number }) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="text-[48px] leading-none text-[#ffe680]">Bảng vàng tuần này</div>
      <div className="mt-3 w-full space-y-1">
        {v.weekTop.slice(0, 5).map((s, i) => (
          <div key={s.username} className="flex items-center gap-3 px-6 text-[36px]">
            <span className="w-12 text-[#ffe680]">{['🥇', '🥈', '🥉', '4', '5'][i]}</span>
            <span className="flex-1 truncate">{s.nickname}</span>
            <span>{s.points}đ</span>
          </div>
        ))}
      </div>
      <div className="mt-auto text-[28px] opacity-80">Vào tiết sau {left} giây</div>
    </div>
  );
}

// Góc trái trên đầu cô: tờ giấy ghim "Học sinh xuất sắc hôm nay", tính tổng điểm cả ngày (server lưu, qua 0 giờ thì làm lại)
function DayTop({ v }: { v: StageView }) {
  const rows = v.todayTop ?? [];
  return (
    <div className="absolute left-[14px] top-[238px] z-20 w-[320px] -rotate-2 rounded-[14px] border-[3px] border-[#c9a45c] bg-[#fff8e1]/95 px-3 pb-2 pt-3 text-[#4a2c0e] shadow-[0_6px_10px_rgba(0,0,0,0.3)]">
      <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 text-[30px]">📌</div>
      <div className="whitespace-nowrap text-center text-[20px] font-extrabold leading-tight text-[#b45309]">🏆 Học sinh xuất sắc hôm nay</div>
      {rows.length === 0 && <div className="py-3 text-center text-[20px] text-[#8a6a3a]">Chưa có ai, trả lời đúng là lên bảng!</div>}
      <div className="mt-1 space-y-[2px]">
        {rows.map((r, i) => (
          <motion.div key={r.username} layout className="flex items-center gap-2 text-[21px] leading-[26px]">
            <span className="w-7 text-center">{['🥇', '🥈', '🥉', '4', '5'][i]}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{r.nickname}</span>
            <b className="text-[#c2410c]">{r.points}</b>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------- Cô giáo ----------
function Teacher({ v, now }: { v: StageView; now: number }) {
  let pose = '01-dung';
  if (now - v.lastFlowerAt < 3000) pose = '05-vui';
  else if (v.walk?.kind === 'answer') pose = '04-chi-phai';
  else if (v.phase === 'intro') pose = '08-vay-chao';
  else if (v.phase === 'question') pose = '04-chi-phai';
  else if (v.phase === 'bonus') pose = '07-suy-nghi';
  else if (v.phase === 'reveal') pose = v.correctCount > 0 ? '05-vui' : '06-buon';
  else if (v.phase === 'vote') pose = '02-giang-bai';
  else if (v.phase === 'results') pose = '02-giang-bai';
  else if (v.phase === 'recess') pose = v.recess?.stage === 'play' ? '08-vay-chao' : v.recess?.stage === 'result' ? '05-vui' : '03-chi-trai';
  const gotFlower = now - v.lastFlowerAt < 3000;
  return (
    <motion.div
      className="teacher-character absolute left-[96px] top-[410px] h-[490px] w-[300px]"
      animate={TEACHER_IDLE}
      transition={TEACHER_IDLE_TRANSITION}
      style={{ transformOrigin: '50% 100%' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.img
          key={pose}
          src={`/assets/nv/co-giao/${pose}.webp`}
          initial={{ opacity: 0, y: 7, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.99 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="h-full w-full object-contain object-bottom drop-shadow-[0_10px_8px_rgba(0,0,0,0.25)]"
        />
      </AnimatePresence>
      <AnimatePresence>
        {gotFlower && (
          <motion.div
            key={v.lastFlowerAt}
            initial={{ scale: 0, y: 80 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-[110px] top-[140px] drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
          >
            <BouquetIcon className="h-32 w-32" />
          </motion.div>
        )}
      </AnimatePresence>
      {v.flowers > 0 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1 text-[24px] font-bold text-pink-600 shadow">
          💐 {v.flowers} bó hoa
        </div>
      )}
    </motion.div>
  );
}

// ---------- Ai nhanh nhất câu này ----------
function Podium({ v }: { v: StageView }) {
  if (v.phase !== 'question' && v.phase !== 'bonus' && v.phase !== 'reveal') return null;
  return (
    <div className="absolute left-[330px] top-[636px] w-[600px]">
      <div className="flex items-center justify-between rounded-t-[20px] bg-[#7a2e0e] px-5 py-1 text-[26px] font-bold text-[#ffe9b8]">
        <span>⚡ Nhanh nhất</span>
        <span>{v.correctCount} bạn đã đúng</span>
      </div>
      <div className="flex h-[74px] items-center gap-2 rounded-b-[20px] bg-[#fff6dd]/95 px-3 shadow-lg">
        {v.correctTop.length === 0 && <div className="w-full text-center text-[28px] text-[#8a6a3a]">Chưa ai đoán ra…</div>}
        <AnimatePresence initial={false}>
          {v.correctTop.map((a, i) => (
            <motion.div
              key={a.username}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex w-1/3 min-w-0 items-center gap-1 text-[24px] text-[#4a2c0e]"
            >
              <span className="text-[30px]">{['🥇', '🥈', '🥉'][i]}</span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-semibold">{a.nickname}</div>
                <div className="font-extrabold text-[#c2410c]">+{a.points}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Dòng nhắc dưới khung "Nhanh nhất", trên hàng ghế đầu: cách được vào lớp ngồi (đổi câu mỗi 8 giây, viết ngắn)
const SEAT_HINTS = ['⭐ Đoán nhanh, điểm cao được vào lớp ngồi!', '💬 Tương tác nhiều để giữ chỗ trong lớp nha!'];
function SeatHint({ now }: { now: number }) {
  const i = Math.floor(now / 8000) % SEAT_HINTS.length;
  return (
    <div className="pointer-events-none absolute left-[360px] top-[770px] z-[9] flex w-[560px] justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="whitespace-nowrap rounded-full bg-[#7a2e0e]/85 px-5 py-1 text-[26px] font-bold text-[#ffe9b8] shadow-md"
        >
          {SEAT_HINTS[i]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------- Học sinh ----------
function studentPose(s: StageView['seats'][number], v: StageView, rank: number, now: number): PoseKey {
  if (v.clapping) return 'vui';
  if (now - s.joinedAt < 3000) return 'chao';
  const asking = v.phase === 'question' || v.phase === 'bonus';
  if (s.answered === 'right') return 'vui';
  if (s.answered === 'wrong') return asking ? 'buon' : 'ngac';
  if (asking) return now - s.lastActive < 2500 ? 'tay' : 'nghi';
  if (v.phase === 'results' && rank < 3 && s.score > 0) return 'vui';
  if (now - (s.desk[s.desk.length - 1]?.at ?? 0) < 3000) return 'vui'; // vừa được cô tặng quà
  return now - s.lastActive < 2500 ? 'tay' : 'dung';
}

/** Vị trí ghế thứ i (khung nửa trên người ngồi, toạ độ stage) */
function seatBox(i: number) {
  const row = ROWS[Math.floor(i / 5)];
  const scale = row.s;
  const w = SPRITE_H * 0.47 * scale;
  const h = SPRITE_H * scale;
  const show = h * SHOW;
  const x = row.xs[i % 5] * K - w / 2;
  const y = (row.y + 72) * K - show; // ngồi trên ghế, lưng quay ra khán giả, mặt nhìn lên bảng
  return { scale, w, h, show, x, y };
}

function Students({ v, now }: { v: StageView; now: number }) {
  const asking = v.phase === 'question' || v.phase === 'bonus';
  const first = asking ? v.correctTop[0]?.username : undefined;
  return (
    <>
      {v.seats.map((s, i) => {
        const { scale, w, h, show, x, y } = seatBox(i);
        const pose = studentPose(s, v, i, now);
        const g = s.girl ? 'nu' : 'nam';
        const hd = HEAD[g];
        const called = v.recess?.game === 'callup' && v.recess.callUser === s.username;
        // đang đi lên bảng / bục hoặc bị phạt: ghế trống, nhân vật vẽ ở chỗ khác
        const away = s.standing || v.walk?.username === s.username;
        return (
          <motion.div
            key={s.username}
            initial={{ opacity: 0, left: x, top: y + 40 }}
            // bạn đúng đầu tiên: nhảy lên vui mừng
            animate={{ opacity: away ? 0 : 1, left: x, top: s.username === first ? [y, y - 34, y, y - 18, y] : y }}
            transition={s.username === first ? { top: { duration: 0.9 } } : { type: 'spring', stiffness: 120, damping: 18 }}
            className={`absolute ${called ? 'called-up' : ''}`}
            style={{ width: w, height: show, zIndex: 10 + Math.floor(i / 5) }}
          >
            <motion.div
              className="student-character absolute inset-0 overflow-hidden"
              animate={STUDENT_IDLE}
              transition={STUDENT_IDLE_TRANSITIONS[i]}
            >
              <img
                src={`/assets/nv/${g}/sau-${POSE[g][pose]}.webp`}
                style={{ width: w, height: h }}
                className="max-w-none"
              />
              <div className="absolute" style={{ left: hd.x * w, top: hd.y * h, width: hd.w * w, height: hd.h * h }}>
                <Hair username={s.username} girl={s.girl} />
              </div>
            </motion.div>
            {s.answered && (
              <motion.div
                key={s.answered}
                initial={{ scale: 0, rotate: -22, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                className="absolute -right-3 top-[14%] z-20 h-10 w-10"
              >
                <AnswerBadge type={s.answered} />
              </motion.div>
            )}
            <DeskGifts desk={s.desk} x={x} y={y} w={w} show={show} scale={scale} />
            {s.sleeping && !s.bubble && (
              <motion.div
                animate={{ y: [0, -14, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity }}
                className="pointer-events-none absolute -top-[46px] right-0 text-[34px]"
                style={{ fontSize: 34 * scale }}
              >
                💤
              </motion.div>
            )}
            {s.bubble && <ChatBubble text={s.bubble} scale={scale} />}
            <div className="nametag" style={{ fontSize: 19 * scale }}>
              {i < 5 && s.score > 0 && <span className="rank">{i + 1}</span>}
              {s.title && <span className="mr-1">{s.title === 'lop-truong' ? '👑' : '⭐'}</span>}
              {called && <span className="mr-1">📢</span>}
              {s.days >= 2 && <span className="mr-1 whitespace-nowrap">🎒{s.days}</span>}
              <span className="truncate">{s.nickname}</span>
              {s.score > 0 && <b className="ml-1 text-[#c2410c]">{s.score}</b>}
            </div>
          </motion.div>
        );
      })}
    </>
  );
}

// Bong bóng chat trên đầu (đã lọc: không có câu trả lời, không có từ cấm)
function ChatBubble({ text, scale }: { text: string; scale: number }) {
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: 10, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="pointer-events-none absolute bottom-[calc(100%+30px)] left-1/2 z-30 max-w-[200px] -translate-x-1/2 truncate rounded-[16px] bg-white px-3 py-1 font-semibold text-[#3b2a14] shadow-md"
      style={{ fontSize: 18 * scale }}
    >
      {text}
      <div className="absolute -bottom-[7px] left-1/2 h-[14px] w-[14px] -translate-x-1/2 rotate-45 bg-white" />
    </motion.div>
  );
}

// Tặng hoa: bạn nhỏ đứng dậy đi lên bục đưa hoa cho cô, rồi đi về chỗ (bạn không có ghế thì đi từ cửa lớp)
const PODIUM: [number, number] = [372, 690]; // chỗ đứng đưa hoa, cạnh tay cô (toạ độ góc trên trái nhân vật)
const WALK_PATH_TIMES = [0, 0.35, 0.65, 1];
const WALK_GAIT_TIMES = [0, 0.035, 0.07, 0.105, 0.14, 0.175, 0.21, 0.245, 0.28, 0.315, 0.35, 0.65, 0.685, 0.72, 0.755, 0.79, 0.825, 0.86, 0.895, 0.93, 0.965, 1];
const WALK_PATH_TRANSITION = { duration: GAME.walkMs / 1000, times: WALK_PATH_TIMES, ease: 'easeInOut' as const };
const WALK_GAIT_TRANSITION = { duration: GAME.walkMs / 1000, times: WALK_GAIT_TIMES, ease: 'linear' as const };
const WALK_GAIT = {
  y: [0, -3, 0, -3, 0, -3, 0, -3, 0, -3, 0, 0, -3, 0, -3, 0, -3, 0, -3, 0, -3, 0],
  body: [0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0],
  left: [0, -7, 0, 7, 0, -7, 0, 7, 0, -7, 0, 0, 7, 0, -7, 0, 7, 0, -7, 0, 7, 0],
  right: [0, 7, 0, -7, 0, 7, 0, -7, 0, 7, 0, 0, -7, 0, 7, 0, -7, 0, 7, 0, -7, 0],
};
function StudentWalk({ v }: { v: StageView }) {
  const w = v.walk;
  if (!w) return null;
  const i = v.seats.findIndex((s) => s.username === w.username);
  const standIndex = v.standing.findIndex((s) => s.username === w.username);
  const H = 210;
  const [standX, standFoot] = STAND[standIndex] ?? [990, 760];
  const from: [number, number] = i >= 0 ? [seatBox(i).x, seatBox(i).y - 40] : [standX - (H * 0.47) / 2, standFoot - H];
  const g = w.girl ? 'nu' : 'nam';
  return <StudentWalker key={w.at} walk={w} from={from} gender={g} height={H} />;
}

function StudentWalker({ walk, from, gender, height }: { walk: NonNullable<StageView['walk']>; from: [number, number]; gender: 'nam' | 'nu'; height: number }) {
  const target: [number, number] = walk.kind === 'answer' ? [430, 670] : PODIUM;
  const [path] = useState(() => ({
    left: [from[0], target[0], target[0], from[0]],
    top: [from[1], target[1], target[1], from[1]],
    opacity: [1, 1, 1, 0],
  }));
  const sprite = `/assets/nv/${gender}/${POSE[gender][walk.kind === 'answer' ? 'tay' : 'vui']}.webp`;
  return (
    <motion.div
      initial={{ left: from[0], top: from[1], opacity: 0 }}
      animate={path}
      transition={WALK_PATH_TRANSITION}
      className="pointer-events-none absolute z-30"
      style={{ width: height * 0.47, height }}
    >
      {/* Tách chân khỏi thân để có nhịp bước thay vì chỉ kéo nguyên ảnh qua sân khấu. */}
      <motion.div
        className="absolute inset-0 drop-shadow-[0_4px_3px_rgba(0,0,0,0.3)]"
        animate={{ y: WALK_GAIT.y, rotate: WALK_GAIT.body }}
        transition={WALK_GAIT_TRANSITION}
      >
        <img src={sprite} className="absolute inset-0 h-full w-full" style={{ clipPath: 'inset(0 0 40% 0)' }} />
        <motion.img
          src={sprite}
          className="absolute inset-0 h-full w-full"
          style={{ clipPath: 'inset(60% 50% 0 0)', transformOrigin: '42% 60%' }}
          animate={{ rotate: WALK_GAIT.left }}
          transition={WALK_GAIT_TRANSITION}
        />
        <motion.img
          src={sprite}
          className="absolute inset-0 h-full w-full"
          style={{ clipPath: 'inset(60% 0 0 50%)', transformOrigin: '58% 60%' }}
          animate={{ rotate: WALK_GAIT.right }}
          transition={WALK_GAIT_TRANSITION}
        />
      </motion.div>
      {walk.kind === 'flower' ? (
        <div className="absolute -right-6 top-[62px] drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]"><BouquetIcon className="h-16 w-16" /></div>
      ) : (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1 text-[18px] font-bold text-white shadow">Đúng rồi!</div>
      )}
      <div className="nametag" style={{ fontSize: 16, bottom: 'calc(100% - 4px)' }}>
        <span className="truncate">{walk.nickname}</span>
      </div>
    </motion.div>
  );
}

// Học sinh cá biệt: bị cô phạt đứng cạnh bảng (bên phải), đeo bảng tên đỏ
const STAND_SPOTS = [870, 965];
function Punished({ v }: { v: StageView }) {
  return (
    <>
      {v.punished.slice(0, STAND_SPOTS.length).map((s, i) => {
        const H = 185;
        const g = s.girl ? 'nu' : 'nam';
        return (
          <motion.div
            key={s.username}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute z-30"
            style={{ left: STAND_SPOTS[i] - (H * 0.47) / 2, top: 640 - H, width: H * 0.47, height: H }}
          >
            <img src={`/assets/nv/${g}/${POSE[g].buon}.webp`} className="h-full w-full drop-shadow-[0_4px_3px_rgba(0,0,0,0.3)]" />
            <div className="absolute -top-[52px] left-1/2 w-[120px] -translate-x-1/2 rounded-md bg-red-600 px-1 text-center text-[15px] font-bold leading-tight text-white shadow">
              😅 Học sinh cá biệt
              <div className="truncate text-[14px] font-semibold">{s.nickname}</div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}

// Bình hoa trên bàn cô: hoa các bạn tặng cắm vào, càng nhiều hoa càng đầy bình
const VASE_SPOTS: [number, number][] = [
  [0, 0], [-22, 8], [22, 8], [-12, -18], [12, -18], [0, -30], [-30, -10], [30, -10], [-20, -36], [20, -36], [-36, 14], [36, 14],
];
function Vase({ v }: { v: StageView }) {
  const n = Math.min(v.flowers, VASE_SPOTS.length);
  return (
    <div className="pointer-events-none absolute left-[150px] top-[585px] z-[9]">
      {VASE_SPOTS.slice(0, n).map(([dx, dy], i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i === n - 1 ? GAME.walkMs / 2000 : 0, type: 'spring' }}
          className="absolute text-[30px]"
          style={{ left: dx, top: dy }}
        >
          <VaseFlower index={i} />
        </motion.div>
      ))}
    </div>
  );
}

// Quà cô thưởng: bay từ tay cô giáo xuống, đặt lên mặt bàn 2 bên người bạn nhỏ
const TEACHER_HAND: [number, number] = [300, 640]; // px stage
function DeskGifts({ desk, x, y, w, show, scale }: { desk: StageView['seats'][number]['desk']; x: number; y: number; w: number; show: number; scale: number }) {
  const size = 34 * scale;
  const deskTop = show - 72 * K + 44 * scale; // mặt bàn: mép trên bàn (ROWS.y) lùi xuống, tính trong khung học sinh
  // chỗ trống trên mặt bàn 2 bên đầu bạn nhỏ (lệch so với tâm bàn): trái, phải, trái ngoài, phải ngoài
  const SPOTS = [-40, 40, -58, 58];
  return (
    <>
      {desk.map((g, i) => {
        const left = w / 2 + SPOTS[i % SPOTS.length] * scale - size / 2;
        const top = deskTop - size + (i >= 2 ? 3 : 0) * scale;
        return (
          <motion.div
            key={g.at + g.icon}
            // quà cũ (mở lại trang, đổi chỗ ngồi) thì nằm sẵn trên bàn, không bay lại
            initial={Date.now() - g.at < 2000 ? { x: TEACHER_HAND[0] - (x + left), y: TEACHER_HAND[1] - (y + top), scale: 2.2, rotate: -30, opacity: 0 } : false}
            animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.3, 1.4, 0.5, 1], opacity: { duration: 0.2 } }}
            className="pointer-events-none absolute drop-shadow-[0_4px_2px_rgba(0,0,0,0.35)]"
            style={{ left, top, fontSize: size, lineHeight: 1, zIndex: 5 }}
          >
            {g.icon}
          </motion.div>
        );
      })}
    </>
  );
}

// Hết ghế: chen chúc đứng ngoài 2 bên cửa nhìn vào, vẫn tính điểm; chỉ vài bạn đứng đầu có bảng tên
function Standing({ v, now }: { v: StageView; now: number }) {
  return (
    <>
      {v.standing.slice(0, STAND.length).map((s, i) => {
        const [cx, foot] = STAND[i];
        const H = 100 + (foot - 540) * 0.12; // xa thì nhỏ
        const w = H * 0.47;
        const g = s.girl ? 'nu' : 'nam';
        const pose = studentPose(s, v, GAME.seats + i, now);
        const walking = v.walk?.username === s.username;
        return (
          <motion.div
            key={s.username}
            initial={{ opacity: 0, left: cx - w / 2, top: foot - H + 30 }}
            animate={{ opacity: walking ? 0 : 1, left: cx - w / 2, top: foot - H }}
            className="absolute"
            style={{ width: w, height: H, zIndex: Math.floor(foot / 20) }}
          >
            <img src={`/assets/nv/${g}/${POSE[g][pose]}.webp`} className="h-full w-full drop-shadow-[0_3px_2px_rgba(0,0,0,0.3)]" />
            {s.answered === 'right' && <div className="badge bg-[#16a34a]" style={{ width: 20, height: 20, fontSize: 13, right: 0 }}>✓</div>}
            {i < NAMED_STANDING && (
              <div className="nametag" style={{ fontSize: 14, maxWidth: 104, bottom: 'calc(100% - 2px)', zIndex: 60 }}>
                {s.title && <span className="mr-1">{s.title === 'lop-truong' ? '👑' : '⭐'}</span>}
                <span className="truncate">{s.nickname}</span>
                {s.score > 0 && <b className="ml-1 text-[#c2410c]">{s.score}</b>}
              </div>
            )}
          </motion.div>
        );
      })}
    </>
  );
}

// Bảng khẩu hiệu đỏ trên bảng đen
function Motto() {
  return (
    <div className="motto absolute left-1/2 top-[168px] -translate-x-1/2 whitespace-nowrap px-10 py-[6px] text-[38px] font-extrabold tracking-wider">
      TIÊN HỌC LỄ – HẬU HỌC VĂN
    </div>
  );
}

function GiftBanner({ gift, now }: { gift: GameState['lastGift']; now: number }) {
  const show = gift && now - gift.at < 4000;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={gift.at}
          initial={{ opacity: 0, y: -30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-[24px] top-[470px] z-50 max-w-[560px] rounded-[26px] bg-gradient-to-r from-pink-500 to-rose-400 px-6 py-3 text-[30px] font-bold text-white shadow-xl"
        >
          💐 <span className="inline-block max-w-[300px] truncate align-bottom">{gift.nickname}</span> tặng cô {gift.repeatCount > 1 ? `${gift.repeatCount} × ` : ''}
          {gift.giftName}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// "Ai yêu cô thì gõ số 1": mỗi bạn gõ là một trái tim bay lên cạnh cô, kèm số đếm
function LoveHearts({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <div className="pointer-events-none absolute left-[60px] top-[330px] z-40 h-[520px] w-[340px]">
      {Array.from({ length: Math.min(n, 30) }, (_, i) => (
        <motion.div
          key={i}
          initial={{ y: 480, opacity: 0, scale: 0.6 }}
          animate={{ y: -20, opacity: [0, 1, 0], scale: 1.2 }}
          transition={{ duration: 2.4, delay: (i % 6) * 0.15, repeat: Infinity, repeatDelay: 0.4 }}
          className="absolute text-[54px]"
          style={{ left: ((i * 67) % 280) + 10 }}
        >
          {i % 3 === 0 ? '💕' : '❤️'}
        </motion.div>
      ))}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink-500 px-5 py-1 text-[30px] font-bold text-white shadow-lg">
        💕 {n} bạn yêu cô
      </div>
    </div>
  );
}

// Bình chọn vui ("miền Bắc gõ B..."): thẻ đếm phiếu cạnh cô trong 15 giây
function PollCard({ v }: { v: StageView }) {
  return (
    <AnimatePresence>
      {v.poll && (
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          className="absolute left-[16px] top-[640px] z-40 w-[330px] rounded-[20px] border-[3px] border-white bg-gradient-to-br from-sky-500 to-indigo-500 px-4 py-2 text-white shadow-xl"
        >
          <div className="text-center text-[24px] font-extrabold">🗳️ Gõ chữ để chọn nha!</div>
          {v.poll.map((o) => (
            <div key={o.key} className="flex items-center gap-2 text-[24px] leading-[34px]">
              <b className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white text-indigo-600">{o.key.toUpperCase()}</b>
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              <b>{o.n}</b>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Chúc mừng sinh nhật: biểu ngữ trên đầu lớp, bánh kem đã đặt lên bàn bạn nhỏ
function BirthdayBanner({ v }: { v: StageView }) {
  return (
    <AnimatePresence>
      {v.birthday && (
        <motion.div
          key={v.birthday.at}
          initial={{ opacity: 0, y: -40, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="absolute left-1/2 top-[620px] z-50 w-[900px] -translate-x-1/2 rounded-[30px] border-4 border-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-amber-400 px-6 py-4 text-center font-extrabold text-white shadow-2xl"
        >
          <div className="text-[46px] leading-tight">🎉 Chúc mừng sinh nhật 🎂</div>
          <div className="mt-1 truncate text-[54px] leading-tight drop-shadow">{v.birthday.nickname}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Claps() {
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {Array.from({ length: 14 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ y: 1500, opacity: 0 }}
          animate={{ y: 700, opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, delay: (i % 7) * 0.25, repeat: Infinity }}
          className="absolute text-[70px]"
          style={{ left: 60 + i * 70 }}
        >
          👏
        </motion.div>
      ))}
    </div>
  );
}
