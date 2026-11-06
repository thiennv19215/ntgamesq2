import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { GameState, StageView } from './useGame';
import { GAME } from './config';
import { Hair } from './Hair';
import { giftOf } from './quiz';
import './stage.css';

/**
 * Màn hình lớp học 1080x1920 chuẩn dọc livestream TikTok.
 * Bố cục 2.5D phối cảnh có chiều sâu:
 * - Khoảng sàn trước lớp rộng rãi cho cô giáo, bục giảng và học sinh lên bảng / đứng phạt.
 * - 5 hàng ghế × 8 học sinh = 40 chỗ ngồi, chừa lối đi hai bên.
 */

// Các hàng dùng chung kích thước để hàng đầu và nhân vật không bị bé hơn hàng cuối.
const SEAT_SCALE = 1.16;
const STUDENT_WALK_SCALE = 1.06;
const STUDENT_BODY_SCALE = 0.78;
const WALKER_H = 200;
const ROWS = [
  // Chừa dải an toàn cuối sân cho thanh tiến độ và hướng dẫn lớp.
  { y: 1060, x1: 60, x2: 1020, n: GAME.rowSeats[0], s: SEAT_SCALE },
  { y: 1205, x1: 60, x2: 1020, n: GAME.rowSeats[1], s: SEAT_SCALE },
  { y: 1350, x1: 60, x2: 1020, n: GAME.rowSeats[2], s: SEAT_SCALE },
  { y: 1495, x1: 60, x2: 1020, n: GAME.rowSeats[3], s: SEAT_SCALE },
  { y: 1640, x1: 60, x2: 1020, n: GAME.rowSeats[4], s: SEAT_SCALE },
];
const SPRITE_H = 250; // chiều cao sprite học sinh
// khung đầu đã xoá khỏi ảnh thân sau lưng (tools/tach-nen.py)
const HEAD = { nam: { x: 0.136, y: 0, w: 0.682, h: 0.284 }, nu: { x: 0.174, y: 0, w: 0.668, h: 0.248 } };
// màu 4 tổ
const TEAM_COLOR = ['#ef4444', '#3b82f6', '#16a34a', '#f59e0b'];
const TEAM_ICON = ['🔴', '🔵', '🟢', '🟡'];

const POSE = {
  nam: { dung: '01-dung', tay: '02-giong-tay', nghi: '03-suy-nghi', vui: '05-vui-mung', buon: '06-buon', ngac: '07-ngac-nhien', chao: '08-vay-chao' },
  nu: { dung: '01-dung', tay: '02-giong-tay', nghi: '03-suy-nghi', vui: '05-vui-mung', buon: '06-buon', ngac: '07-ngac-nhien', chao: '08-vay-chao' },
};
type PoseKey = keyof typeof POSE.nam;

// Trang phục cô Ngân
const OUTFIT_POSE: Record<string, string> = {
  '01-dung': '01-dung',
  '02-gioi-thieu': '02-giang-bai',
  '03-chi-bang': '04-chi-phai',
  '04-vay-chao': '13-vay-chao',
  '05-dang-tay': '15-chao-don',
  '06-cuoi': '06-cuoi-che-mieng',
  '07-tay-nguc': '05-cuoi-tuoi',
  '08-ngon-cai': '08-like',
  '09-mung': '14-co-vu',
  '10-vo-tay': '07-vo-tay',
  '11-nhun-vai': '12-nhun-vai',
  '12-gai-dau': '11-suy-nghi',
  '13-ngac-nhien': '10-bat-ngo',
  '14-ngon-tro': '09-nghiem-nhe',
  '15-chong-hong': '16-tu-tin',
  '16-chi-trai': '03-chi-trai',
};
const EVEREST_POSES = [
  '01-dung-san-sang', '02-chi-len-dinh', '03-chi-lo-trinh', '04-chao-doan-leo', '05-doc-ban-do', '06-suy-nghi', '07-like', '08-co-vu',
  '09-bat-ngo', '10-cuoi-vui', '11-nhac-nho-an-toan', '12-vay-chao', '13-cam-co-dinh', '14-dong-vien', '15-vo-tay', '16-tu-tin',
];
const CHUONG_POSES = [
  '01-cam-chuong-san-sang', '02-rung-chuong-ben', '03-rung-chuong-cao', '04-rung-chuong-hai-tay', '05-rung-chuong-nghieng-nguoi',
  '06-rung-chuong-cuoi-tuoi', '07-rung-chuong-hao-hung', '08-rung-chuong-nghiem-tuc', '09-bao-hieu-bat-dau', '10-mung-chien-thang',
  '11-bat-ngo-nghe-chuong', '12-moi-thi-sinh', '13-vay-chao-cam-chuong', '14-tu-hao-gio-chuong', '15-chuan-bi-rung', '16-nghi-thang-tran',
];

// Decode at most two images at once; never load every teacher outfit on first paint.
const imageQueue: string[] = [];
const queuedImages = new Set<string>();
let decodingImages = 0;
function warmImages(urls: string[]) {
  for (const url of urls) if (!queuedImages.has(url)) { queuedImages.add(url); imageQueue.push(url); }
  const pump = () => {
    while (decodingImages < 2 && imageQueue.length) {
      const url = imageQueue.shift()!;
      decodingImages++;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      img.decode().catch(() => { queuedImages.delete(url); }).finally(() => { decodingImages--; window.setTimeout(pump, 24); });
    }
  };
  window.setTimeout(pump, 100);
}

function useNow(ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function GameStage({ game }: { game: GameState }) {
  const now = useNow();
  const v = game.view;
  useEffect(() => {
    const timer = window.setTimeout(() => warmImages(['nam', 'nu'].flatMap((g) =>
      Object.values(POSE[g as 'nam' | 'nu']).flatMap((p) => [`/assets/nv/${g}/${p}.webp`, `/assets/nv/${g}/sau-${p}.webp`]))), 500);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!v) return;
    if (v.show) warmImages((v.show.kind === 'everest' ? EVEREST_POSES : CHUONG_POSES).map((p) => `/assets/nv/co-ngan/${v.show!.kind}/${p}.webp`));
    else if (v.outfit && v.outfit !== 'trang') warmImages(Object.values(OUTFIT_POSE).map((p) => `/assets/nv/co-ngan/${v.outfit}/${p}.webp`));
    else warmImages(Object.keys(OUTFIT_POSE).map((p) => `/assets/nv/co-ngan/${p}.webp?v=classic-restored`));
  }, [v?.outfit, v?.show?.kind]);
  if (!v) {
    return (
      <div className="flex h-full items-center justify-center bg-black/60 p-20 text-center text-[48px] text-white">
        Chưa mở trang stage (lvh.me:3006/stage) nên chưa có gì để xem trước
      </div>
    );
  }
  return (
    <div className={`relative h-full w-full overflow-hidden ${v.clapping ? 'class-clap' : ''}`}>
      {v.cfg.bg && <img alt="" src={`/room-bg/${encodeURIComponent(v.cfg.bg)}`} className="absolute inset-0 h-full w-full object-cover" />}
      <motion.div className="absolute inset-0" style={{ transformOrigin: '330px 700px' }} animate={{ scale: 1 }}>
        {/* Lớp bóng sàn gỗ ấm */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[560px] bg-gradient-to-b from-[#3b1d07]/0 via-[#3b1d07]/15 to-[#3b1d07]/25 mix-blend-multiply" />
        <Header v={v} name={game.channelName} />
        <ClassOfficers v={v} />
        <BoardSidebar v={v} />
        <ClassroomGuide />
        <HeartProgress v={v} />
        <HallwayStudents v={v} />
        <Board v={v} now={now} />
        <Teacher v={v} now={now} />
        <Punished v={v} />
        <CallupStudent v={v} />
        <Podium v={v} />
        <Students v={v} now={now} />
        <StudentMovements v={v} now={now} />
        <FlowerWalk v={v} />
      </motion.div>
      <GiftBanner gift={game.lastGift} now={now} />
      <BirthdayBanner v={v} />
      <GoodbyeBanner v={v} />
      <FundParty v={v} />
      <RoseGiftFireworks v={v} />
      <HeartFireworks v={v} />
      <LoveHearts n={v.loveFans} />
      <PollCard v={v} />
      {(v.clapping || v.fund.party > 0) && <Claps />}
    </div>
  );
}

// Quỹ hoa đạt mốc
function FundParty({ v }: { v: StageView }) {
  if (v.heartFireworks?.party) return null;
  return (
    <AnimatePresence>
      {v.fund.party > 0 && (
        <motion.div
          key={v.fund.party}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 top-[620px] z-[70] w-[880px] -translate-x-1/2 rounded-[30px] border-4 border-white bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 px-6 py-4 text-center font-extrabold text-white shadow-2xl"
        >
          <div className="text-[44px] leading-tight">🎆 Quỹ lớp đủ {v.fund.party} bông hoa! 🎆</div>
          <div className="text-[30px]">Cô cảm ơn cả lớp nhiều lắm 💕</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HeartProgress({ v }: { v: StageView }) {
  const hearts = v.heartFireworks;
  if (!hearts) return null;
  return (
    <div className="heart-progress pointer-events-none absolute bottom-[145px] left-[120px] z-[70] flex h-[32px] w-[840px] items-center gap-3 rounded-full border-2 border-[#d65b88] bg-[#fff8ef] px-4 text-[#8d3152] shadow-sm">
      <span className="whitespace-nowrap text-[20px] font-extrabold">{hearts.party ? '🎆 Cả lớp đỉnh quá!' : '❤️ Đủ 100 tim, bắn pháo!'}</span>
      <div role="progressbar" aria-label="Tim để bắn pháo hoa" aria-valuemin={0} aria-valuemax={hearts.goal} aria-valuenow={hearts.progress} className="h-[14px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#efd2dc]">
        <motion.div animate={{ width: `${(hearts.progress / hearts.goal) * 100}%` }} transition={{ duration: 0.35 }} className="h-full rounded-full bg-gradient-to-r from-[#ef6591] to-[#eaaa3b]" />
      </div>
      <span className="whitespace-nowrap text-[20px] font-extrabold tabular-nums">{hearts.progress}/{hearts.goal}</span>
    </div>
  );
}

function RoseGiftFireworks({ v }: { v: StageView }) {
  if (!v.roseFireworks?.lightParty) return null;
  const light = true;
  const origins = [[160, 820], [920, 820]];
  const colors = ['#ffe074', '#ff81b0', '#87e7ff', '#c0f58b'];
  return (
    <svg key={`${light ? 'light' : 'big'}-${light ? v.roseFireworks.lightPartyAt : v.roseFireworks.partyAt}`} className="pointer-events-none absolute inset-0 z-[70] h-full w-full motion-reduce:hidden" viewBox="0 0 1080 1920" aria-hidden="true">
      {origins.map(([x, y], burst) => <g key={burst} transform={`translate(${x},${y})`}>
        {Array.from({ length: light ? 10 : 14 }, (_, i) => {
          const angle = i * Math.PI * 2 / (light ? 10 : 14);
          const distance = light ? 55 + (i % 3) * 10 : 100 + (i % 3) * 24;
          return <motion.circle key={i} r={light ? 3 : 4} fill={colors[i % colors.length]} initial={{ cx: 0, cy: 0, opacity: 0 }} animate={{ cx: [0, Math.cos(angle) * distance], cy: [0, Math.sin(angle) * distance + 35], opacity: [0, 1, 1, 0] }} transition={{ duration: light ? 1.2 : 1.5, delay: burst * 0.25, repeat: light ? 0 : 2, repeatDelay: 0.25 }} />;
        })}
      </g>)}
    </svg>
  );
}

function HeartFireworks({ v }: { v: StageView }) {
  const hearts = v.heartFireworks;
  if (!hearts?.party) return null;
  const origins = [[140, 300], [940, 370], [160, 1130], [920, 1250]];
  const colors = ['#ffe074', '#ff81b0', '#87e7ff', '#c0f58b'];
  return (
    <svg key={`heart-${hearts.partyAt}`} className="pointer-events-none absolute inset-0 z-[70] h-full w-full motion-reduce:hidden" viewBox="0 0 1080 1920" aria-hidden="true">
      {origins.map(([x, y], burst) => <g key={burst} transform={`translate(${x},${y})`}>
        {Array.from({ length: 14 }, (_, i) => {
          const angle = i * Math.PI * 2 / 14;
          const distance = 100 + (i % 3) * 24;
          return <motion.circle key={i} r={4} fill={colors[i % colors.length]} initial={{ cx: 0, cy: 0, opacity: 0 }} animate={{ cx: [0, Math.cos(angle) * distance], cy: [0, Math.sin(angle) * distance + 35], opacity: [0, 1, 1, 0] }} transition={{ duration: 1.5, delay: burst * 0.25, repeat: 2, repeatDelay: 0.25 }} />;
        })}
      </g>)}
    </svg>
  );
}

function Header({ v, name }: { v: StageView; name: string }) {
  const sub =
    v.phase === 'team'
      ? `Chọn tổ · Tiết ${v.round}`
      : v.phase === 'show' && v.show
      ? v.show.kind === 'everest' ? '🏔️ Đường lên đỉnh Everest' : '🔔 Rung Chuông Đồng'
      : v.phase === 'recess'
      ? 'Giờ ra chơi'
      : v.phase === 'vote'
        ? 'Chọn chủ đề tiết sau'
        : v.qNo > 0 && v.phase !== 'results'
          ? `${v.review ? 'Ôn bài' : `Tiết ${v.round}`} · Câu ${v.qNo}/${v.total}`
          : `Tiết ${v.round}`;
  return (
    <div className="classroom-title absolute left-1/2 top-[20px] z-20 flex w-[520px] -translate-x-1/2 flex-col items-center px-5 pb-2.5 pt-4">
      <div className="max-w-full truncate classroom-title-text font-extrabold leading-none tracking-wide text-[#fff6bd]" style={{ fontSize: name.length > 14 ? 30 : 38 }}>
        {name.toUpperCase()}
      </div>
      <div className="mt-2 whitespace-nowrap rounded-full bg-[#fff5cd] px-3.5 py-0.5 text-[21px] font-bold text-[#6b3718] shadow-sm">
        {sub} · 👥 {v.roster.seated}/{v.roster.seats}
        {v.roster.waiting > 0 && ` · ⏳ chờ ${v.roster.waiting}`}
      </div>
    </div>
  );
}

// ---------- Bảng đen ----------
function Board({ v, now }: { v: StageView; now: number }) {
  const left = Math.max(0, Math.ceil((v.endsAt - now) / 1000));
  return (
    <div className={`chalk classroom-board absolute left-[220px] top-[210px] z-[2] h-[544px] w-[840px] text-[#f4f1e6] ${v.golden && v.phase !== 'recess' ? 'golden-board' : ''}`}>
      {/* 4 Nẹp góc đồng cổ điển bo tròn */}
      <div className="board-corner board-corner-tl" />
      <div className="board-corner board-corner-tr" />
      <div className="board-corner board-corner-bl" />
      <div className="board-corner board-corner-br" />

      {/* 2 Móc treo bằng đồng nối khẩu hiệu phía trên với đỉnh bảng đen */}
      <div className="pointer-events-none absolute -top-[18px] left-[120px] h-[20px] w-[14px] rounded-t-sm border-[2.5px] border-[#6f2c07] bg-gradient-to-b from-[#ffe07a] to-[#d4972c] shadow" />
      <div className="pointer-events-none absolute -top-[18px] right-[120px] h-[20px] w-[14px] rounded-t-sm border-[2.5px] border-[#6f2c07] bg-gradient-to-b from-[#ffe07a] to-[#d4972c] shadow" />

      {/* Máng phấn gỗ 2.5D thanh thoát có giẻ lau nỉ gỗ và 4 viên phấn màu */}
      <div className="pointer-events-none absolute -bottom-[20px] left-[14px] right-[14px] z-10 h-[24px]">
        <div className="relative h-full w-full rounded-md border-[2.5px] border-[#7d360c] bg-gradient-to-b from-[#fed898] via-[#df9438] to-[#ab5a16] shadow-[0_3px_0_#5e2604,0_6px_10px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-x-3 top-1 h-[4px] rounded-full bg-[#6a2b06]/70 shadow-inner" />
          {/* Giẻ lau bảng nỉ gỗ */}
          <div className="absolute left-6 -top-3 flex h-[15px] w-[54px] flex-col overflow-hidden rounded-[3px] border-[1.5px] border-[#5a2405] shadow-sm">
            <div className="h-[7px] w-full bg-gradient-to-b from-[#ffebb5] to-[#d69542]" />
            <div className="h-[8px] w-full bg-[#242424]" />
          </div>
          {/* Viên phấn trắng */}
          <div className="absolute left-[90px] -top-1 h-[8px] w-[24px] rounded-full border border-[#cbd5e1] bg-white shadow-sm" />
          {/* Viên phấn vàng chanh */}
          <div className="absolute left-[122px] -top-1 h-[8px] w-[22px] rounded-full border border-[#eab308] bg-[#fef08a] shadow-sm" />
          {/* Viên phấn hồng */}
          <div className="absolute left-[152px] -top-1 h-[8px] w-[20px] rounded-full border border-[#f472b6] bg-[#fbcfe8] shadow-sm" />
          {/* Viên phấn xanh mint */}
          <div className="absolute left-[180px] -top-1 h-[8px] w-[20px] rounded-full border border-[#34d399] bg-[#a7f3d0] shadow-sm" />
        </div>
      </div>
      <div className="absolute bottom-[120px] left-[22px] right-[22px] top-[20px] overflow-hidden">
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
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between">
            {v.golden ? (
              <span className="rounded-full bg-[#ffd84a] px-4 text-[28px] font-bold text-[#7a2e0e]">⭐ CÂU HỎI VÀNG x2</span>
            ) : !v.slot && !v.boardShown ? (
              <span />
            ) : (
              <span className={`rounded-full border-2 px-4 text-[26px] ${v.slot ? 'border-[#ffe680] text-[#ffe680]' : 'border-[#f4f1e6]/60'}`}>
                {v.slot === 'meo'
                  ? `🤪 Đố mẹo ${v.riddleNo}/2`
                  : v.slot === 'su'
                    ? '📜 Lịch sử'
                    : v.slot === 'anh'
                      ? '🔤 Tiếng Anh'
                      : v.slot === 'dh'
                        ? '🖼️ Đuổi hình bắt chữ'
                        : v.category}
              </span>
            )}
            {v.phase !== 'reveal' ? <Timer left={left} /> : <span className="text-[34px] text-[#9df29d]">Đáp án</span>}
          </div>
          {!v.boardShown ? (
            v.riddleNo === 1 ? (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 160, damping: 13 }}
                className="flex flex-1 flex-col items-center justify-center text-center"
              >
                <motion.div animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-[90px] leading-none">
                  🤪
                </motion.div>
                <div className="mt-2 text-[58px] font-bold leading-none text-[#ffe680]">PHẦN ĐỐ MẸO</div>
                <div className="mt-3 text-[36px]">2 câu liền · vẫn tính điểm</div>
                <div className="mt-2 text-[32px] opacity-90">Chuẩn bị tinh thần, nghĩ xéo mới thắng!</div>
              </motion.div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="text-[72px] font-bold leading-none text-[#ffe680]">Câu {v.qNo}</div>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="mt-6 text-[40px] text-[#ffe680]"
                >
                  👂 Nghe cô đọc đề nè…
                </motion.div>
              </div>
            )
          ) : v.slot === 'dh' ? (
            <motion.div
              key={v.clue}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 14 }}
              className={`mt-3 shrink-0 whitespace-nowrap text-center text-[84px] leading-[110px] ${v.phase === 'reveal' ? 'opacity-60' : ''}`}
            >
              {v.clue}
            </motion.div>
          ) : v.math ? (
            <motion.div
              key={v.math}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`mt-4 shrink-0 text-center text-[76px] font-extrabold leading-[96px] text-[#ffe680] ${v.phase === 'reveal' ? 'opacity-50' : ''}`}
            >
              {v.math}
            </motion.div>
          ) : (
            <>
              <div className="mt-2 line-clamp-2 min-h-[96px] shrink-0 text-center text-[38px] leading-[48px]">{v.clue}</div>
              {v.phase !== 'reveal' && <Tiles letters={v.tiles} dim={false} />}
            </>
          )}
          {v.boardShown && <Slots slots={v.slots} reveal={v.phase === 'reveal'} />}
          {v.boardShown && v.math && v.phase !== 'reveal' && <div className="mt-2 text-center text-[28px] opacity-80">Gõ số vào bình luận</div>}
          {v.phase === 'bonus' && (
            <div className="mt-auto text-center text-[28px] text-[#ffe680]">{v.math ? 'Thêm 10 giây, nhẩm lẹ lên!' : 'Cô mở thêm 1 chữ, thêm 10 giây!'}</div>
          )}
        </div>
      )}

      {v.phase === 'team' && <TeamPick v={v} left={left} />}
      {v.phase === 'show' && v.show && <ShowBoard v={v} left={left} />}
      {v.phase === 'praise' && <Praise v={v} />}
      {v.phase === 'vote' && v.vote && <Vote v={v} left={left} />}
      {v.phase === 'results' && <Results v={v} />}
      {v.phase === 'recess' && v.recess && <Recess v={v} left={left} />}
      </div>
      <div className="absolute bottom-[14px] left-[22px] right-[22px] h-[100px] overflow-hidden rounded-[12px] border border-[#ffe680]/35 bg-[#092f24] px-4 py-2">
        {v.teacherChat && !isFastestNotice(v)
          ? <TeacherChat v={v} />
          : <div className="flex h-full items-center text-[24px] font-bold text-[#fff0ba]">💬 Gõ đáp án trong bình luận · Cùng cô học vui mỗi ngày!</div>}
      </div>
    </div>
  );
}

function Timer({ left }: { left: number }) {
  const urgent = left <= 5;
  return (
    <motion.div
      key={urgent ? left : 'calm'}
      initial={urgent ? { scale: 1.35 } : false}
      animate={{ scale: 1 }}
      className={`flex h-[78px] min-w-[78px] items-center justify-center rounded-full border-[5px] px-2 text-[50px] font-bold leading-none ${urgent ? 'border-[#ff8a7a] bg-[#ff8a7a]/20 text-[#ff8a7a]' : 'border-[#f4f1e6]'}`}
    >
      {left}
    </motion.div>
  );
}

function Tiles({ letters, dim }: { letters: string[]; dim: boolean }) {
  const n = letters.length || 1;
  const size = Math.min(84, Math.floor((700 - 8 * (n - 1)) / n));
  return (
    <div className={`mt-3.5 flex justify-center gap-2 ${dim ? 'opacity-40' : ''}`}>
      {letters.map((ch, i) => (
        <motion.div
          key={`${i}${ch}`}
          initial={{ y: -30, opacity: 0, rotate: -8 }}
          animate={{ y: 0, opacity: 1, rotate: ((i * 37) % 9) - 4 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
          className="tile flex items-center justify-center font-extrabold"
          style={{ width: size, height: size * 1.12, fontSize: size * 0.65 }}
        >
          {ch}
        </motion.div>
      ))}
    </div>
  );
}

function Slots({ slots, reveal }: { slots: (string | null)[]; reveal: boolean }) {
  const n = slots.length || 1;
  const size = Math.min(64, Math.floor((700 - 6 * (n - 1)) / n));
  return (
    <div data-board-answer={reveal ? 'revealed' : 'guess'} className="mt-4 flex justify-center gap-[6px]">
      {slots.map((ch, i) =>
        ch === ' ' ? (
          <div key={i} style={{ width: size * 0.5 }} />
        ) : (
          <div
            key={i}
            className={`flex items-end justify-center border-b-[5px] font-bold ${reveal ? 'border-[#9df29d] text-[#9df29d]' : 'border-[#f4f1e6]'}`}
            style={{ width: size, height: size, fontSize: size * 0.82, lineHeight: 1 }}
          >
            {ch ?? ''}
          </div>
        ),
      )}
    </div>
  );
}

function Vote({ v, left }: { v: StageView; left: number }) {
  const r = v.vote!;
  const total = r.counts[0] + r.counts[1] || 1;
  return (
    <div className="flex h-full flex-col items-center text-center">
      <div className="flex w-full items-center justify-between">
        <span className="rounded-full bg-[#ffd84a] px-4 text-[26px] font-bold text-[#7a2e0e]">🗳️ Cả lớp quyết định</span>
        <Timer left={left} />
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

function Praise({ v }: { v: StageView }) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="text-[50px] leading-none text-[#ffe680]">🎁 Cô phát quà nè!</div>
      <div className="mt-1 text-[28px] opacity-80">Bạn nhỏ giỏi nhất sau {v.qNo} câu</div>
      <div className="mt-4 w-full space-y-2">
        {v.praiseTop.map((s, i) => (
          <motion.div
            key={s.username}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.4 }}
            className="flex items-center gap-3 px-6 text-[40px]"
          >
            <span className="w-12">{['🥇', '🥈', '🥉'][i]}</span>
            <span className="flex-1 truncate">{s.nickname}</span>
            <span className="text-[34px]">{s.desk[s.desk.length - 1]?.icon}</span>
            <span>{s.score}đ</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-auto text-[30px] text-[#ffe680]">Chào cô, thả tim để được quà nha! 💕</div>
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
      {v.teamWin.length > 0 && (
        <div className="mt-auto text-[36px] text-[#ffe680]">
          🚩 {v.teamWin.map((n) => `Tổ ${n}`).join(' & ')} thắng tiết này!
        </div>
      )}
    </div>
  );
}

function TeamPick({ v, left }: { v: StageView; left: number }) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="flex w-full items-center justify-between">
        <span className="rounded-full bg-[#ffd84a] px-4 text-[26px] font-bold text-[#7a2e0e]">🚩 Chọn tổ thi đua</span>
        <Timer left={left} />
      </div>
      <div className="mt-2 text-[34px] leading-tight">
        Gõ <b className="text-[#ffe680]">tổ 1</b>, <b className="text-[#ffe680]">tổ 2</b>, <b className="text-[#ffe680]">tổ 3</b> hoặc <b className="text-[#ffe680]">tổ 4</b>
      </div>
      <div className="mt-3 grid w-full grid-cols-2 gap-3 px-2">
        {v.teams.map((t, i) => (
          <div key={t.no} className="flex h-[96px] flex-col items-center justify-center rounded-2xl border-[3px] bg-white/10 text-center leading-[38px]" style={{ borderColor: TEAM_COLOR[i] }}>
            <div className="text-[32px] font-bold" style={{ color: TEAM_COLOR[i] }}>
              {TEAM_ICON[i]} Tổ {t.no}
            </div>
            <motion.div key={t.members} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="text-[28px] leading-[32px]">
              {t.members} bạn{t.wins > 0 && <span className="ml-2 text-[24px] text-[#ffe680]">🚩{t.wins}</span>}
            </motion.div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center text-[27px] leading-[32px] text-[#e1eadb]">
        {v.noTeam > 0 ? `${v.noTeam} bạn chưa chọn, hết giờ cô xếp giùm` : 'Chưa chọn thì cô tự xếp vào tổ ít người'}
      </div>
    </div>
  );
}

function TeacherChat({ v }: { v: StageView }) {
  if (!v.teacherChat) return null;
  return (
    <div className="flex h-full items-center gap-3 text-[#fff4d2]" role="status" aria-live="polite" aria-atomic="true">
      <span aria-hidden="true" className="text-[30px]">{v.teacherChat.text.startsWith('Cô cảm ơn ') ? '💝' : '💬'}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[20px] font-bold leading-[23px] text-[#ffd895]">{v.cfg.teacherName} nhắn cả lớp</div>
        <div className="line-clamp-2 break-words text-[26px] font-bold leading-[28px]">{v.teacherChat.text}</div>
      </div>
    </div>
  );
}

function BoardSidebar({ v }: { v: StageView }) {
  const tabs = ['🏆 Điểm', '💬 Tương tác', '⚡ Nhanh nhất'];
  const [tab, setTab] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTab((i) => (i + 1) % tabs.length), 8000);
    return () => window.clearInterval(timer);
  }, [tabs.length]);
  return (
    <aside className="floating-info-rail absolute right-[18px] top-[20px] z-20 w-[210px]" aria-label="Góc thông tin lớp">
      <div className="mb-2 flex gap-1">
        {tabs.map((label, i) => <button key={label} type="button" title={label} onClick={() => setTab(i)} aria-label={label} aria-pressed={tab === i} className={`min-w-0 flex-1 rounded-lg border px-1 py-2 text-[13px] font-bold leading-[15px] ${tab === i ? 'border-[#ffe680] bg-[#ffe680] text-[#573316]' : 'border-white/30 text-[#fff4d2]'}`}><span aria-hidden="true">{label}</span></button>)}
      </div>
      <div className="board-sidebar">
        {tab === 0 ? <DayTop v={v} floating /> : tab === 1 ? <TalkTop v={v} floating /> : <FastestBoard v={v} floating />}
      </div>
    </aside>
  );
}

function isFastestNotice(v: StageView) {
  return Boolean(v.teacherChat && /^chưa ai đúng\b/iu.test(v.teacherChat.text));
}

function HintGuide({ v }: { v: StageView }) {
  const settings = v.roseSettings;
  if (!settings?.visible) return null;
  const rows = [
    { label: 'Mở 1 ô chữ', amount: settings.hint },
    { label: 'Làm lớp trưởng', amount: settings.leader },
    { label: 'Mời cô giáo', amount: settings.teacher },
  ];
  return (
    <aside aria-label="Gợi ý quà hoa hồng" className="hint-sign pointer-events-none absolute right-[18px] top-[430px] z-20 w-[210px] side-rail-board px-2 py-2 text-[#9b2852]">
      <div className="text-center text-[21px] font-extrabold">🌹 Tặng hoa hồng</div>
      <div className="mb-2 text-center text-[16px] font-bold text-[#8d3152]">Hoa giúp mở chữ và nhận vai trong lớp</div>
      {rows.map((row) => <div key={row.label} className="flex min-h-[34px] items-center justify-between gap-1 text-[18px] font-bold leading-[26px]"><span className="whitespace-nowrap">{row.label}</span><span className="shrink-0 whitespace-nowrap">x{row.amount} 🌹</span></div>)}
      <div className="mt-2 text-center text-[13px]">Vai cô giáo kéo dài 2 phút</div>
    </aside>
  );
}

function ClassroomGuide() {
  const tips = [
    '💬 Gõ đáp án trong bình luận để tham gia lớp học',
    '⚡ Trả lời đúng càng sớm, điểm xếp hạng càng cao',
    '❤️ Thả tim để cả lớp cùng vỗ tay với cô nhé!',
    '➕ Follow kênh để được ưu tiên khi chờ vào lớp',
    '👦 Gõ “nam” / “nữ” để đổi nhân vật của bạn',
    '🚪 Gõ “vào lớp” để đăng ký tham gia cùng cả lớp',
  ];
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % tips.length), 6000);
    return () => window.clearInterval(timer);
  }, [tips.length]);
  return (
    <div className="classroom-ribbon absolute left-[220px] top-[142px] z-20 flex h-[56px] w-[620px] items-center overflow-hidden px-4 text-center text-[20px] font-extrabold text-[#fff5c4]" aria-label="Hướng dẫn chơi và tương tác">
      <div className="relative min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={index} initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -22 }} transition={{ duration: reducedMotion ? 0 : 0.3 }} className="whitespace-nowrap leading-[28px]">
            {tips[index]}
          </motion.div>
        </AnimatePresence>
      </div>
      <span aria-hidden="true" className="ml-4 shrink-0 text-[17px] tabular-nums text-[#ffe680]">{index + 1}/{tips.length}</span>
    </div>
  );
}

function EventBadge() {
  return null;
}

type ShowView = NonNullable<StageView['show']>;
const SHOW_ACCENT = { everest: '#7dd3fc', chuong: '#fbbf24' };
function ShowBoard({ v, left }: { v: StageView; left: number }) {
  const s = v.show!;
  const accent = SHOW_ACCENT[s.kind];
  const answering = s.stage === 'ask' && v.boardShown;
  const badge =
    s.tag === 'tie' ? '⚖️ Câu phụ' : s.tag === 'bell' ? '🔔 Câu Chuông Đồng' : s.tag === 'rescue' ? '🤝 Cứu trợ cả phòng' : s.step === 'code' ? '🔐 Mật mã trạm' : s.step === 'stake' ? '🏔️ Chọn mức điểm' : `Câu ${s.qNo}`;
  return (
    <div className="flex h-full flex-col">
      {s.step !== 'gather' && s.step !== 'section' && s.step !== 'honor' && (
        <div className="flex shrink-0 items-center justify-between">
          <span className="rounded-full px-4 text-[26px] font-bold text-[#1e1b4b]" style={{ background: accent }}>
            {badge}
          </span>
          {answering ? <Timer left={left} /> : s.stage === 'reveal' ? <span className="text-[30px] text-[#9df29d]">Đáp án</span> : <span className="text-[26px] opacity-80">👂 Nghe cô đọc…</span>}
        </div>
      )}
      {s.step === 'gather' && <ShowGather s={s} left={left} />}
      {s.step === 'section' && (
        <motion.div key={s.section} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-full flex-col items-center justify-center text-center">
          <div className="text-[30px] opacity-80">{s.name}</div>
          <div className="mt-2 text-[58px] font-extrabold leading-tight" style={{ color: accent }}>
            {s.section}
          </div>
        </motion.div>
      )}
      {s.step === 'mc' && <ShowQuestion s={s} answering={answering} />}
      {s.step === 'stake' && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-[36px]">Câu tiếp theo cược bao nhiêu?</div>
          <div className="mt-3 flex gap-6">
            {[10, 20].map((x, i) => (
              <div key={x} className="w-[190px] rounded-2xl border-4 py-2" style={{ borderColor: accent }}>
                <div className="text-[54px] font-extrabold leading-none" style={{ color: accent }}>
                  {x}
                </div>
                <div className="text-[24px]">Gõ "{x}" · {s.stakes[i]} bạn</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[24px] opacity-80">Không chọn thì tính 10 · sai không bị trừ</div>
        </div>
      )}
      {(s.step === 'code' || s.step === 'codeReveal') && s.code && <ShowCode s={s} answering={answering} />}
      {s.step === 'honor' && <ShowHonor s={s} />}
      {answering && (s.step === 'mc' || s.step === 'stake') && (
        <div className="mt-auto shrink-0 text-center text-[24px] opacity-85">
          {s.step === 'stake' ? 'Gõ 10 hoặc 20' : 'Gõ A, B, C hoặc D'} · {s.answered} bạn đã chọn
          {s.tag === 'final' && s.tickets > 0 && !s.ticketUser && <span className="text-[#ffe680]"> · 🎟️ có phiếu: gõ "gợi ý"</span>}
        </div>
      )}
    </div>
  );
}

function ShowGather({ s, left }: { s: ShowView; left: number }) {
  const rules =
    s.kind === 'everest'
      ? ['👣 Bước chân đầu tiên · 🔐 Mật mã trạm', '🌪️ Bão tốc độ · 🏔️ Chạm đỉnh', 'Gõ A B C D · ai đúng cũng có điểm']
      : ['🔥 Làm nóng · 💪 Trụ vững · 🤝 Cứu trợ', '⚡ Thử thách cuối · 🔔 Câu Chuông Đồng', 'Gõ A B C D · sai không bị loại'];
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 0.47, repeat: Infinity }} className="text-[64px] leading-none">
        {s.kind === 'everest' ? '🏔️' : '🔔'}
      </motion.div>
      <div className="mt-1 text-[48px] font-extrabold leading-tight" style={{ color: SHOW_ACCENT[s.kind] }}>
        {s.name}
      </div>
      <div className="mt-2 space-y-1 text-[27px] leading-snug">
        {rules.map((r) => (
          <div key={r}>{r}</div>
        ))}
      </div>
      <div className="mt-3 text-[26px] opacity-80">Bắt đầu sau {left} giây</div>
    </div>
  );
}

function ShowQuestion({ s, answering }: { s: ShowView; answering: boolean }) {
  const reveal = s.stage === 'reveal';
  return (
    <>
      <div className="mt-2 line-clamp-3 shrink-0 text-center text-[31px] leading-[38px]">{s.question}</div>
      <div className="mt-2 grid flex-1 grid-cols-2 content-center gap-2">
        {s.opts.map((o, i) => {
          const right = reveal && i === s.ans;
          const gone = s.removed.includes(i);
          return (
            <motion.div
              key={i}
              initial={{ x: i % 2 ? 30 : -30, opacity: 0 }}
              animate={{ x: 0, opacity: gone || (reveal && !right) ? 0.35 : 1, scale: right ? [1, 1.08, 1] : 1 }}
              transition={{ delay: reveal ? 0 : i * 0.08 }}
              className={`flex min-h-[54px] items-center gap-2 rounded-xl border-[3px] px-2 text-[25px] leading-tight ${
                right ? 'border-[#4ade80] bg-[#16a34a]/50' : answering ? 'border-white/60 bg-white/10' : 'border-white/30 bg-white/5'
              }`}
            >
              <b className="w-7 shrink-0 text-center text-[28px]" style={{ color: SHOW_ACCENT[s.kind] }}>
                {'ABCD'[i]}
              </b>
              <span className={`min-w-0 flex-1 ${gone ? 'line-through' : ''}`}>{o}</span>
              {reveal && <span className="shrink-0 text-[20px] opacity-80">{s.counts[i]}</span>}
            </motion.div>
          );
        })}
      </div>
      {s.tag === 'tie' && s.stage === 'ask' && <div className="shrink-0 truncate text-center text-[22px] text-[#ffe680]">Chỉ tính: {s.tied.join(', ')}</div>}
      {s.ticketUser && s.stage === 'ask' && <div className="shrink-0 truncate text-center text-[22px] text-[#ffe680]">🎟️ {s.ticketUser} tiếp sức: bỏ 2 đáp án sai</div>}
      {reveal && <div className="shrink-0 text-center text-[24px] text-[#9df29d]">{s.lastRight} bạn trả lời đúng</div>}
    </>
  );
}

function ShowCode({ s, answering }: { s: ShowView; answering: boolean }) {
  const c = s.code!;
  const letters = c.answer ? [...c.answer.replace(/\s+/g, '')] : [];
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-2 flex shrink-0 justify-center gap-1">
        {Array.from({ length: c.len }, (_, i) => (
          <div key={i} className="flex h-[48px] w-[38px] items-end justify-center border-b-4 border-[#ffe680] text-[34px] font-bold leading-none text-[#ffe680]">
            {letters[i] ?? (i === 0 ? c.first : '')}
          </div>
        ))}
      </div>
      <div className="mt-2 flex-1 space-y-1 overflow-hidden">
        {c.hints.map((h, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 text-[24px] leading-[30px]">
            <b className="shrink-0 text-[#7dd3fc]">{[30, 20, 10][i]}đ</b>
            <span className="line-clamp-2">{h}</span>
          </motion.div>
        ))}
        {c.rescue && !c.answer && <div className="text-[24px] text-[#ffe680]">🆘 Cứu trợ 10 giây · chữ đầu là {c.first}</div>}
      </div>
      <div className="shrink-0 text-center text-[23px] opacity-90">
        {c.answer
          ? c.solvers.length
            ? `🔓 ${c.solved} bạn giải được: ${c.solvers.map((x) => x.nickname).slice(0, 3).join(', ')}`
            : '🔒 Không ai giải được'
          : answering
            ? `Gõ từ khoá có dấu · đúng được ${c.pts} điểm · ${c.solved} bạn đã giải`
            : `${c.solved} bạn đã giải`}
      </div>
    </div>
  );
}

function ShowHonor({ s }: { s: ShowView }) {
  return (
    <div className="flex h-full flex-col items-center">
      <div className="text-[44px] font-extrabold leading-none" style={{ color: SHOW_ACCENT[s.kind] }}>
        {s.kind === 'everest' ? '🚩 Vinh danh đỉnh Everest' : '🔔 Vinh danh Chuông Đồng'}
      </div>
      {s.honors.length === 0 && <div className="mt-16 text-[34px]">Chưa ai ghi điểm</div>}
      <div className="mt-2 grid w-full grid-cols-2 gap-x-4 px-2 text-[22px] leading-[30px]">
        {s.honors.map((h, i) => (
          <motion.div key={h.username} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} className={`flex min-w-0 gap-1 ${i === 0 ? 'col-span-2 justify-center text-[30px] text-[#ffe680]' : ''}`}>
            <span className="shrink-0">{i === 0 ? h.title.split(' ')[0] : `${i + 1}.`}</span>
            <span className="min-w-0 truncate">{h.nickname}</span>
            <b className="shrink-0">{h.score}đ</b>
          </motion.div>
        ))}
      </div>
      {s.honors[0] && <div className="mt-auto text-[24px] opacity-85">{s.honors[0].title.slice(s.honors[0].title.indexOf(' ') + 1)} · top 10 nhận huy hiệu</div>}
    </div>
  );
}

function Mountain({ v }: { v: StageView }) {
  const s = v.show!;
  const W = 400;
  const H = 168;
  const top = s.top.slice(0, 10);
  const pos = (i: number, score: number) => {
    const p = Math.min(1, score / Math.max(1, s.maxScore));
    const side = i % 2 === 0 ? -1 : 1;
    const y = H - 18 - p * (H - 40);
    const halfWidth = ((y - 20) / (H - 20)) * (W / 2 - 10);
    return { x: W / 2 + side * Math.max(8, halfWidth * (0.35 + ((i * 37) % 50) / 100)), y };
  };
  return (
    <div className="absolute left-[392px] top-[640px] z-30 overflow-hidden rounded-[16px] border-[3px] border-[#0c4a6e] bg-gradient-to-b from-[#bae6fd] to-[#e0f2fe] shadow-xl" style={{ width: W, height: H }}>
      <svg width={W} height={H} className="absolute inset-0">
        <polygon points={`10,${H} ${W / 2},20 ${W - 10},${H}`} fill="#64748b" />
        <polygon points={`${W / 2 - 46},62 ${W / 2},20 ${W / 2 + 46},62 ${W / 2 + 20},54 ${W / 2},66 ${W / 2 - 22},54`} fill="#f8fafc" />
        <line x1={W / 2} y1={20} x2={W / 2} y2={2} stroke="#7c2d12" strokeWidth={3} />
        <polygon points={`${W / 2},2 ${W / 2 + 22},8 ${W / 2},14`} fill="#ef4444" />
      </svg>
      <div className="absolute left-2 top-1 text-[18px] font-extrabold text-[#0c4a6e]">⛰️ Top 10 leo núi · {s.players} bạn chơi</div>
      {top.length === 0 && <div className="absolute inset-x-0 bottom-3 text-center text-[20px] font-bold text-white">Trả lời đúng để leo lên nha!</div>}
      {top.map((r, i) => {
        const p = pos(i, r.score);
        return (
          <motion.div
            key={r.username}
            animate={{ left: p.x, top: p.y }}
            transition={{ type: 'spring', stiffness: 80, damping: 14 }}
            className="absolute flex -translate-x-1/2 -translate-y-full items-center gap-[2px] whitespace-nowrap rounded-full bg-white/90 px-[6px] text-[14px] font-bold text-[#0c4a6e] shadow"
          >
            {i === 0 ? '🚩' : '🧗'}
            <span className="max-w-[90px] truncate">{r.nickname}</span>
            <span className="text-[#c2410c]">{r.score}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

function BellBoard({ v }: { v: StageView }) {
  const s = v.show!;
  const top = s.top.slice(0, 5);
  return (
    <div className="absolute left-[392px] top-[640px] z-30 w-[400px] overflow-hidden rounded-[16px] border-[3px] border-[#78350f] bg-[#fffbeb]/97 shadow-xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#b45309] to-[#d97706] px-3 py-[2px] text-[19px] font-bold text-[#fff7d6]">
        <span>🔔 Bảng điểm Chuông Đồng</span>
        <span>
          {s.players} bạn chơi{s.tickets > 0 ? ` · 🎟️ ${s.tickets}` : ''}
        </span>
      </div>
      <div className="space-y-[3px] px-2 py-1">
        {top.length === 0 && <div className="py-3 text-center text-[20px] text-[#92400e]">Trả lời đúng để lên bảng nha!</div>}
        {top.map((r, i) => (
          <motion.div key={r.username} layout className="relative h-[26px] overflow-hidden rounded-md bg-[#fde68a]/50">
            <motion.div className="absolute inset-y-0 left-0 bg-[#f59e0b]/70" animate={{ width: `${Math.min(100, (r.score / Math.max(1, s.maxScore)) * 100)}%` }} />
            <div className="relative flex h-full items-center gap-2 px-2 text-[18px] font-bold text-[#78350f]">
              <span>{['🥇', '🥈', '🥉', '4', '5'][i]}</span>
              <span className="min-w-0 flex-1 truncate">{r.nickname}</span>
              <span>{r.score}đ</span>
            </div>
          </motion.div>
        ))}
        {s.bellRingers.length > 0 && <div className="truncate text-[17px] font-semibold text-[#b45309]">🔔 Rung chuông: {s.bellRingers.join(', ')}</div>}
      </div>
    </div>
  );
}

const RECESS_TITLE = { rps: 'Oẳn tù tì với cô', callup: 'Kiểm tra miệng', pick: 'Chọn phe', roll: 'Điểm danh siêu tốc', heart: 'Thả tim cả lớp' };

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
        {playing && <Timer left={left} />}
      </div>
      {r.game !== 'callup' && <div className="mt-1 shrink-0 text-[48px] leading-tight text-[#ffe680]">{RECESS_TITLE[r.game]}</div>}
      {r.game === 'rps' && (
        <>
          <div className="mt-3 flex w-full justify-center gap-6 text-[34px]">
            {[
              ['✊', 'búa'],
              ['✌️', 'kéo'],
              ['✋', 'bao'],
            ].map(([icon, word], i) => (
              <div key={word} className={`w-[150px] rounded-2xl border-2 py-2 ${r.teacher === word ? 'border-[#ffd84a] bg-white/15' : 'border-white/30'}`}>
                <div className="text-[56px] leading-none">{icon}</div>
                <div>{word}</div>
                <div className="text-[30px] text-[#9df29d]">{r.rpsCounts[i]}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[32px]">{playing ? 'Gõ: búa, kéo hoặc bao' : r.teacher ? `Cô ra: ${r.teacher}` : 'Không ai chơi'}</div>
        </>
      )}
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

function DayTop({ v, floating = false }: { v: StageView; floating?: boolean }) {
  const rows = [...(v.todayTop ?? [])].filter((s) => s.points > 0).sort((a, b) => b.points - a.points || a.username.localeCompare(b.username)).slice(0, 5);
  return (
    <aside className={`classroom-panel honor-board side-rail-board ${floating ? 'relative inset-auto z-auto w-full' : 'absolute left-[18px] top-[25px] z-20 w-[210px]'}`} aria-label="Top 5 học sinh xuất sắc hôm nay">
      <h2 className="honor-board-title">🏆 Top hôm nay</h2>
      <div className="honor-board-body">
        {rows.length === 0 && <p className="honor-board-empty">Trả lời đúng để ghi tên<br />lên bảng vàng nhé!</p>}
        {rows.map((r, i) => (
          <div key={r.username} className="honor-row" title={`${r.nickname} · ${r.points} điểm`}>
            <span className={`honor-rank honor-rank-${i + 1}`}>{i + 1}</span>
            <span className="honor-name">{r.nickname}</span>
            <b className="honor-value">{r.points}</b>
          </div>
        ))}
      </div>
      <div className="honor-board-footer">Trả lời đúng để lên hạng</div>
    </aside>
  );
}

function TalkTop({ v, floating = false }: { v: StageView; floating?: boolean }) {
  const rows = [...(v.talkTop ?? [])]
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username))
    .slice(0, 5);
  return (
    <aside className={`classroom-panel honor-board side-rail-board ${floating ? 'relative inset-auto z-auto w-full' : 'absolute left-[18px] top-[25px] z-20 w-[210px]'}`} aria-label="Top 5 bạn tương tác hôm nay">
      <h2 className="honor-board-title">💬 Top tương tác</h2>
      <div className="honor-board-body">
        {rows.length === 0 && <p className="honor-board-empty">Bình luận, tim và follow<br />để lên bảng tương tác nhé!</p>}
        {rows.map((r, i) => (
          <div key={r.username} className="honor-row" title={`${r.nickname} · ${r.points} lượt tương tác`}>
            <span className={`honor-rank honor-rank-${i + 1}`}>{i + 1}</span>
            <span className="honor-name">{r.nickname}</span>
            <b className="honor-value">{r.points}</b>
          </div>
        ))}
      </div>
      <div className="honor-board-footer">Bình luận · thả tim · follow</div>
    </aside>
  );
}

function teacherPose(v: StageView, now: number): string {
  if (v.walk) return now - v.walk.at < GAME.walkMs * 0.35 ? '13-ngac-nhien' : '06-cuoi';
  if (now - v.lastFlowerAt < 3000) return '06-cuoi';
  if (v.birthday) return '09-mung';
  if (v.clapping) return '10-vo-tay';
  if (v.loveFans > 0) return '07-tay-nguc';
  switch (v.phase) {
    case 'team':
    case 'intro':
      return '04-vay-chao';
    case 'question':
      if (!v.boardShown) return '02-gioi-thieu';
      if (v.correctCount > 0) return '08-ngon-cai';
      return now % 8000 < 4000 ? '03-chi-bang' : '01-dung';
    case 'bonus':
      return '12-gai-dau';
    case 'reveal':
      return v.correctCount === 0 ? '11-nhun-vai' : v.golden ? '09-mung' : '08-ngon-cai';
    case 'praise':
      return '09-mung';
    case 'results':
    case 'vote':
      return '14-ngon-tro';
    case 'recess':
      if (v.recess?.stage === 'play') return v.recess.game === 'callup' ? '16-chi-trai' : '05-dang-tay';
      return v.recess?.stage === 'result' ? '15-chong-hong' : '07-tay-nguc';
  }
  return '01-dung';
}

function showPose(v: StageView, now: number): string {
  const sh = v.show!;
  const flower = now - v.lastFlowerAt < 3000 || !!v.walk;
  const alt = now % 6000 < 3000;
  const answering = sh.stage === 'ask' && v.boardShown;
  if (sh.kind === 'everest') {
    if (flower) return '10-cuoi-vui';
    if (v.clapping) return '15-vo-tay';
    switch (sh.step) {
      case 'gather':
        return alt ? '04-chao-doan-leo' : '12-vay-chao';
      case 'section':
        return sh.section.includes('Chạm đỉnh') ? '02-chi-len-dinh' : '03-chi-lo-trinh';
      case 'stake':
        return '16-tu-tin';
      case 'code':
        return !answering ? '05-doc-ban-do' : sh.code?.rescue ? '14-dong-vien' : alt ? '06-suy-nghi' : '01-dung-san-sang';
      case 'codeReveal':
        return sh.code?.solved ? '10-cuoi-vui' : '09-bat-ngo';
      case 'honor':
        return '13-cam-co-dinh';
      default:
        if (sh.stage === 'reveal') return sh.lastRight > 0 ? '07-like' : '09-bat-ngo';
        if (!answering) return '05-doc-ban-do';
        if (Math.max(0, v.endsAt - now) <= 3000) return '11-nhac-nho-an-toan';
        return alt ? '08-co-vu' : '01-dung-san-sang';
    }
  }
  if (flower) return '06-rung-chuong-cuoi-tuoi';
  if (v.clapping) return '07-rung-chuong-hao-hung';
  switch (sh.step) {
    case 'gather':
      return alt ? '12-moi-thi-sinh' : '13-vay-chao-cam-chuong';
    case 'section':
      return sh.section.includes('Chuông') ? '15-chuan-bi-rung' : '09-bao-hieu-bat-dau';
    case 'honor':
      return alt ? '10-mung-chien-thang' : '03-rung-chuong-cao';
    default:
      if (sh.stage === 'reveal') {
        if (sh.lastRight === 0) return '11-bat-ngo-nghe-chuong';
        return sh.tag === 'bell' ? '04-rung-chuong-hai-tay' : alt ? '02-rung-chuong-ben' : '05-rung-chuong-nghieng-nguoi';
      }
      if (!answering) return sh.tag === 'tie' ? '16-nghi-thang-tran' : '08-rung-chuong-nghiem-tuc';
      return alt ? '01-cam-chuong-san-sang' : '14-tu-hao-gio-chuong';
  }
}

function isGuestTeacher(v: StageView, username: string) {
  return v.roleHolders?.some((role) => role.label === 'Cô giáo' && role.username === username) ?? false;
}

function ClassOfficers({ v }: { v: StageView }) {
  const officers = v.roleHolders?.filter((role) => role.expiresAt === null).sort((a, b) => Number(b.label === 'Lớp trưởng') - Number(a.label === 'Lớp trưởng')) ?? [];
  const donors = [...(v.goodStudents ?? [])].sort((a, b) => b.gifts - a.gifts || a.username.localeCompare(b.username));
  const pages = Math.max(1, Math.ceil(donors.length / 3));
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) return;
    const timer = setInterval(() => setPage((n) => (n + 1) % pages), 5000);
    return () => clearInterval(timer);
  }, [pages]);
  const start = (page % pages) * 3;
  return (
    <aside className="gift-corner-board classroom-panel honor-board flower-board absolute left-[18px] top-[20px] z-20 w-[210px] side-rail-board" aria-label="Góc tặng hoa và cán bộ lớp">
      <h2 className="honor-board-title">💐 Tặng hoa cho cô<span>TẤM LÒNG HỌC TRÒ</span></h2>
      <div className="honor-board-body">
        {donors.length ? donors.slice(start, start + 3).map((student, i) => (
          <div key={student.username} className="honor-row" title={`${student.nickname} (@${student.username}) · ${student.gifts} món quà`}>
            <span className={`honor-rank honor-rank-${start + i + 1}`}>{start + i + 1}</span>
            <span className="honor-name">{student.nickname || student.username}</span>
            <b className="honor-value">{student.gifts}<small> quà</small></b>
          </div>
        )) : <p className="honor-board-empty">Bông hoa đầu tiên<br />đang chờ bạn trao cô!</p>}
      </div>
      {officers.length > 0 && <div className="honor-officers">{officers.map((role) => (
        <div key={role.label} title={`${role.nickname} · ${role.source === 'score' ? `${role.points} điểm` : `Hoa hồng x${role.roses}`}`}>
          <span>{role.icon} {role.label}</span><b>{seatName(role.nickname)}</b>
        </div>
      ))}</div>}
      <div className="honor-board-footer">{pages > 1 ? `${start + 1}–${Math.min(start + 3, donors.length)} / ${donors.length} bạn · Cảm ơn cả lớp!` : 'Cô cảm ơn những món quà!'} </div>
    </aside>
  );
}

function Teacher({ v, now }: { v: StageView; now: number }) {
  const guest = v.roleHolders?.find((role) => role.label === 'Cô giáo');
  if (guest) {
    const g = guest.girl ? 'nu' : 'nam';
    return (
      <motion.div key={guest.username} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="absolute left-[14px] top-[300px] z-[3] h-[620px] w-[170px]">
        <div className="teacher-shadow" />
        <img src={`/assets/nv/${g}/${POSE[g].tay}.webp`} alt={guest.nickname} className="h-full w-full object-contain object-bottom drop-shadow-lg" />
        <div className="absolute -bottom-1 left-1/2 w-[210px] -translate-x-1/2 rounded-xl border-2 border-[#fff6dd] bg-[#be426b] px-2 py-1 text-center text-white shadow-lg">
          <div className="text-[19px] font-extrabold">👩‍🏫 Cô giáo · {Math.max(0, Math.ceil(((guest.expiresAt ?? now) - now) / 1000))}s</div>
          <div className="truncate text-[19px] font-bold" title={guest.nickname}>{guest.nickname}</div>
        </div>
      </motion.div>
    );
  }
  const gotFlower = now - v.lastFlowerAt < 3000;
  const src = v.show
    ? `/assets/nv/co-ngan/${v.show.kind}/${showPose(v, now)}.webp`
    : v.outfit === 'trang' || !v.outfit
      ? `/assets/nv/co-ngan/${teacherPose(v, now)}.webp?v=classic-restored`
      : `/assets/nv/co-ngan/${v.outfit}/${OUTFIT_POSE[teacherPose(v, now)] ?? '01-dung'}.webp`;
  return (
    <div className="teacher-character absolute left-[10px] top-[300px] z-[3] h-[620px] w-[180px]">
      <div className="teacher-shadow" />
      <img src={src} style={!v.show && (!v.outfit || v.outfit === 'trang') ? { clipPath: 'none' } : undefined} className="teacher-sprite h-full w-full object-contain object-bottom drop-shadow-[0_8px_6px_rgba(0,0,0,0.25)]" />
      <div className="absolute bottom-[10px] left-[12px] z-10 whitespace-nowrap rounded-full border-2 border-[#fff6dd] bg-gradient-to-b from-[#ff6b9a] to-[#d63384] px-3 py-[2px] text-[17px] font-extrabold text-white shadow-[0_3px_0_#9d174d]">
        🌸 {v.cfg.teacherName}
      </div>
      <AnimatePresence>
        {gotFlower && (
          <motion.div
            key={v.lastFlowerAt}
            initial={{ scale: 0, y: 80 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-[130px] top-[140px] text-[75px]"
          >
            💐
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const secText = (ms: number) => `${(ms / 1000).toFixed(3).replace('.', ',')} giây`;
function FastestBoard({ v, floating = false }: { v: StageView; floating?: boolean }) {
  const reveal = v.phase === 'reveal';
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fastest-board ${floating ? 'relative inset-auto z-auto w-full' : `absolute right-0 z-30 ${reveal ? 'top-[650px] w-[300px]' : 'top-[330px] w-[280px]'}`} overflow-hidden rounded-[14px] border-[3px] border-[#99521f] bg-[#fffbe7] shadow-lg`}
    >
      <div className={`flex items-center justify-between bg-[#7a2e0e] px-3 font-bold text-[#ffe9b8] ${reveal ? 'h-[30px] text-[18px]' : 'h-[34px] text-[20px]'}`}>
        <span>⚡ Nhanh nhất</span>
        <span>{v.correctCount} bạn đúng</span>
      </div>
      {v.fastest.length === 0 && <div className={`text-center text-[#8a6a3a] ${reveal ? 'py-3 text-[22px]' : 'py-4 text-[24px]'}`}>Chưa ai đúng câu này</div>}
      {v.fastest.slice(0, 3).map((a, i) => (
        <motion.div
          key={a.username}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 * i }}
          className={`grid ${reveal ? 'min-h-[46px] text-[18px] leading-[20px]' : 'min-h-[58px] text-[20px] leading-[23px]'} grid-cols-[30px_1fr_44px] items-center gap-x-1 px-3 py-1 text-[#4a2c0e] ${i % 2 ? 'bg-[#f6e3b4]/60' : ''}`}
        >
          <span className={`w-7 shrink-0 text-center ${reveal ? 'text-[21px]' : 'text-[24px]'}`}>{['🥇', '🥈', '🥉', '4', '5'][i]}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{a.nickname}</span>
          <span className={`col-start-2 row-start-2 whitespace-nowrap font-bold tabular-nums text-[#6b4a22] ${reveal ? 'text-[13px]' : 'text-[15px]'}`}>{secText(a.ms)}</span>
          <b className={`col-start-3 row-span-2 row-start-1 text-right text-[#c2410c] ${reveal ? 'text-[21px]' : 'text-[23px]'}`}>+{a.points}</b>
        </motion.div>
      ))}
      {v.laterCount > 0 && (
        <div className="border-t border-[#e9d8a6] px-2 py-2 text-center text-[15px] font-semibold leading-[18px] text-[#6b4a22]">
          {v.laterCount} bạn đúng khác · +{v.laterPoints} điểm/bạn
        </div>
      )}
    </motion.div>
  );
}

function Podium({ v }: { v: StageView }) {
  if (v.phase === 'show' && v.show) return v.show.kind === 'everest' ? null : <BellBoard v={v} />;
  return null;
}

function studentPose(s: StageView['seats'][number], v: StageView, rank: number, now: number): PoseKey {
  if (v.clapping) return 'vui';
  if (now - s.joinedAt < 3000) return 'chao';
  const asking = v.phase === 'question' || v.phase === 'bonus';
  if (s.answered === 'right') return 'vui';
  if (s.answered === 'wrong') return asking ? 'buon' : 'ngac';
  if (asking) return now - s.lastActive < 2500 ? 'tay' : 'nghi';
  if ((v.phase === 'results' || v.phase === 'praise') && rank < 3 && s.score > 0) return 'vui';
  if (now - (s.desk[s.desk.length - 1]?.at ?? 0) < 3000) return 'vui';
  return now - s.lastActive < 2500 ? 'tay' : 'dung';
}

/** Bàn học sinh 2.5D: mặt bàn gỗ ấm mật ong, bo góc tròn, viền gỗ, hộc bàn, chân bàn và quyển vở nhỏ */
function StudentDeskShape({ cx, cy, scale }: { cx: number; cy: number; scale: number }) {
  const w = 84 * scale;
  const h = 36 * scale;
  const legH = 46 * scale;
  const left = cx - w / 2;
  const top = cy;
  return (
    <div data-seat-furniture="desk" className="pointer-events-none absolute" style={{ left, top, width: w, height: h + legH }}>
      <svg width={w} height={h + legH} viewBox={`0 0 ${w} ${h + legH}`} className="overflow-visible">
        <defs>
          <linearGradient id={`desk-top-${Math.round(cx)}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffebbe" />
            <stop offset="35%" stopColor="#f7ba63" />
            <stop offset="100%" stopColor="#db8028" />
          </linearGradient>
          <linearGradient id={`desk-edge-${Math.round(cx)}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c56d1e" />
            <stop offset="100%" stopColor="#96480e" />
          </linearGradient>
        </defs>

        {/* Bóng chân bàn trên sàn */}
        <ellipse cx={w * 0.22} cy={h + legH - 2} rx={w * 0.16} ry={4 * scale} fill="#462109" opacity={0.25} />
        <ellipse cx={w * 0.78} cy={h + legH - 2} rx={w * 0.16} ry={4 * scale} fill="#462109" opacity={0.25} />

        {/* Chân bàn */}
        <rect x={w * 0.18} y={h} width={6 * scale} height={legH - 2} rx={3 * scale} fill="#9b4d1b" stroke="#71320c" strokeWidth={1.5 * scale} />
        <rect x={w * 0.74} y={h} width={6 * scale} height={legH - 2} rx={3 * scale} fill="#9b4d1b" stroke="#71320c" strokeWidth={1.5 * scale} />
        <rect x={w * 0.17} y={h + legH - 5 * scale} width={8 * scale} height={4 * scale} rx={1.5 * scale} fill="#3d1c08" />
        <rect x={w * 0.73} y={h + legH - 5 * scale} width={8 * scale} height={4 * scale} rx={1.5 * scale} fill="#3d1c08" />

        {/* Hộc bàn */}
        <path
          d={`M ${w * 0.12} ${h * 0.75} L ${w * 0.88} ${h * 0.75} L ${w * 0.82} ${h + 16 * scale} L ${w * 0.18} ${h + 16 * scale} Z`}
          fill="#af5c1b"
          stroke="#79350d"
          strokeWidth={1.5 * scale}
        />
        <line x1={w * 0.22} y1={h + 7 * scale} x2={w * 0.78} y2={h + 7 * scale} stroke="#d88433" strokeWidth={1.5 * scale} strokeLinecap="round" />

        {/* Cạnh trước dày của mặt bàn */}
        <path
          d={`M 2 ${h - 4 * scale} Q ${w / 2} ${h + 1 * scale} ${w - 2} ${h - 4 * scale} L ${w - 3} ${h + 4 * scale} Q ${w / 2} ${h + 9 * scale} 3 ${h + 4 * scale} Z`}
          fill={`url(#desk-edge-${Math.round(cx)})`}
          stroke="#73320b"
          strokeWidth={1.5 * scale}
        />

        {/* Mặt bàn */}
        <path
          d={`M ${4 * scale} ${5 * scale} Q ${w / 2} 0 ${w - 4 * scale} ${5 * scale} Q ${w} ${h * 0.4} ${w - 2} ${h - 3 * scale} Q ${w / 2} ${h + 2 * scale} 2 ${h - 3 * scale} Q 0 ${h * 0.4} ${4 * scale} ${5 * scale} Z`}
          fill={`url(#desk-top-${Math.round(cx)})`}
          stroke="#7e370e"
          strokeWidth={2 * scale}
        />

        {/* Highlight mặt bàn */}
        <path
          d={`M ${7 * scale} ${6 * scale} Q ${w / 2} ${2 * scale} ${w - 7 * scale} ${6 * scale}`}
          fill="none"
          stroke="#fff7dc"
          strokeWidth={2 * scale}
          strokeLinecap="round"
        />
        <path
          d={`M ${6 * scale} ${h - 4 * scale} Q ${w / 2} ${h} ${w - 6 * scale} ${h - 4 * scale}`}
          fill="none"
          stroke="#ffe6a2"
          strokeWidth={1.5 * scale}
          strokeLinecap="round"
        />

        {/* Hộp bút nhỏ bên trái */}
        <g transform={`translate(${w * 0.12}, ${h * 0.25})`}>
          <rect x={0} y={0} width={w * 0.22} height={6 * scale} rx={3 * scale} fill="#38bdf8" stroke="#0284c7" strokeWidth={0.8 * scale} />
          <circle cx={w * 0.05} cy={3 * scale} r={1.5 * scale} fill="#ffffff" />
        </g>

        {/* Quyển vở nhỏ mở ra bên phải */}
        <g transform={`translate(${w * 0.48}, ${h * 0.15})`}>
          <rect x={0} y={0} width={w * 0.44} height={h * 0.58} rx={2 * scale} fill="#fffdfa" stroke="#d4924c" strokeWidth={1 * scale} />
          <line x1={w * 0.22} y1={0} x2={w * 0.22} y2={h * 0.58} stroke="#c0782f" strokeWidth={1 * scale} />
          <line x1={w * 0.05} y1={h * 0.2} x2={w * 0.18} y2={h * 0.2} stroke="#cbd5e1" strokeWidth={0.8 * scale} />
          <line x1={w * 0.05} y1={h * 0.36} x2={w * 0.18} y2={h * 0.36} stroke="#cbd5e1" strokeWidth={0.8 * scale} />
          <line x1={w * 0.26} y1={h * 0.2} x2={w * 0.39} y2={h * 0.2} stroke="#cbd5e1" strokeWidth={0.8 * scale} />
          <line x1={w * 0.26} y1={h * 0.36} x2={w * 0.39} y2={h * 0.36} stroke="#cbd5e1" strokeWidth={0.8 * scale} />
        </g>
      </svg>
    </div>
  );
}

/** Lưng ghế học sinh 2.5D: uốn cong mềm mại, lỗ cầm tay bầu dục, che phần thân dưới học sinh */
function StudentChairBackShape({ cx, cy, scale, zIndex }: { cx: number; cy: number; scale: number; zIndex: number }) {
  const w = 62 * scale;
  const h = 48 * scale;
  const left = cx - w / 2;
  const top = cy + 14 * scale; // Che ngang hông học sinh
  return (
    <div data-seat-furniture="chair" className="pointer-events-none absolute" style={{ left, top, width: w, height: h, zIndex }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <defs>
          <linearGradient id={`chair-wood-${Math.round(cx)}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe6b0" />
            <stop offset="35%" stopColor="#f5af54" />
            <stop offset="100%" stopColor="#c36f23" />
          </linearGradient>
          <linearGradient id={`chair-rim-${Math.round(cx)}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d9822a" />
            <stop offset="100%" stopColor="#8d400e" />
          </linearGradient>
        </defs>

        {/* 2 Chân ghế sau */}
        <line x1={w * 0.2} y1={h * 0.65} x2={w * 0.12} y2={h + 16 * scale} stroke="#8c4416" strokeWidth={4 * scale} strokeLinecap="round" />
        <line x1={w * 0.8} y1={h * 0.65} x2={w * 0.88} y2={h + 16 * scale} stroke="#8c4416" strokeWidth={4 * scale} strokeLinecap="round" />
        <circle cx={w * 0.12} cy={h + 16 * scale} r={2.5 * scale} fill="#3b1b07" />
        <circle cx={w * 0.88} cy={h + 16 * scale} r={2.5 * scale} fill="#3b1b07" />

        {/* Đệm ghế ngồi che hông */}
        <path
          d={`M ${4 * scale} ${h * 0.68} Q ${w / 2} ${h * 0.6} ${w - 4 * scale} ${h * 0.68} L ${w - 2} ${h * 0.82} Q ${w / 2} ${h * 0.94} 2 ${h * 0.82} Z`}
          fill="#c06e22"
          stroke="#73320c"
          strokeWidth={1.5 * scale}
        />
        <path
          d={`M ${5 * scale} ${h * 0.66} Q ${w / 2} ${h * 0.58} ${w - 5 * scale} ${h * 0.66} L ${w - 3} ${h * 0.76} Q ${w / 2} ${h * 0.86} 3 ${h * 0.76} Z`}
          fill="#e2913b"
        />

        {/* 2 thanh giằng */}
        <rect x={w * 0.28} y={h * 0.35} width={4 * scale} height={h * 0.35} rx={2 * scale} fill="#994d1b" stroke="#71320c" strokeWidth={1 * scale} />
        <rect x={w * 0.64} y={h * 0.35} width={4 * scale} height={h * 0.35} rx={2 * scale} fill="#994d1b" stroke="#71320c" strokeWidth={1 * scale} />

        {/* Lưng tựa ghế gỗ uốn cong */}
        <path
          d={`M ${6 * scale} ${h * 0.15} Q ${w / 2} 0 ${w - 6 * scale} ${h * 0.15} Q ${w} ${h * 0.32} ${w - 4 * scale} ${h * 0.52} Q ${w / 2} ${h * 0.58} ${4 * scale} ${h * 0.52} Q 0 ${h * 0.32} ${6 * scale} ${h * 0.15} Z`}
          fill={`url(#chair-rim-${Math.round(cx)})`}
          transform={`translate(0, ${2 * scale})`}
        />
        <path
          d={`M ${6 * scale} ${h * 0.14} Q ${w / 2} 0 ${w - 6 * scale} ${h * 0.14} Q ${w} ${h * 0.3} ${w - 4 * scale} ${h * 0.5} Q ${w / 2} ${h * 0.56} ${4 * scale} ${h * 0.5} Q 0 ${h * 0.3} ${6 * scale} ${h * 0.14} Z`}
          fill={`url(#chair-wood-${Math.round(cx)})`}
          stroke="#7d370e"
          strokeWidth={2 * scale}
        />
        <path
          d={`M ${10 * scale} ${h * 0.15} Q ${w / 2} ${3 * scale} ${w - 10 * scale} ${h * 0.15}`}
          fill="none"
          stroke="#fff8e4"
          strokeWidth={2 * scale}
          strokeLinecap="round"
        />

        {/* Khe khoét tay cầm */}
        <rect
          x={w * 0.32}
          y={h * 0.18}
          width={w * 0.36}
          height={7 * scale}
          rx={3.5 * scale}
          fill="#8e4213"
          stroke="#682c09"
          strokeWidth={1 * scale}
        />
        <rect
          x={w * 0.33}
          y={h * 0.19}
          width={w * 0.34}
          height={3 * scale}
          rx={1.5 * scale}
          fill="#682c09"
          opacity={0.7}
        />
      </svg>
    </div>
  );
}

// Furniture is static: skip rebuilding 80 SVG trees on each classroom tick.
const StudentDesk = memo(StudentDeskShape);
const StudentChairBack = memo(StudentChairBackShape);

type MovingStudent = StageView['movements'][number];
type WalkPoint = { x: number; y: number; scale?: number };

// Chung mặt sàn, các bạn xa đứng sau và cao chân hơn; không xếp thành ô trên tường.
function hallwaySpot(index: number): WalkPoint & { scale: number } {
  // Hàng chờ đứng thành lớp nền phía sau cô: lệch trái/phải để lộ vai và tạo cảm giác có người đang đợi.
  const side = index % 2;
  const depth = Math.floor(index / 2);
  return { x: side ? 198 : 38, y: 760 + depth * 96 + side * 12, scale: 0.62 * STUDENT_WALK_SCALE };
}

function studentWalkScale(y: number) {
  return Math.max(0.76, Math.min(1.08, 0.76 + (y - 900) / 2400)) * STUDENT_WALK_SCALE;
}

/** Feet positions share the same physical seat index as the reserved chair. */
function movementSeat(index: number) {
  let first = 0;
  let ri = 0;
  for (; ri < ROWS.length - 1; ri++) {
    if (index < first + ROWS[ri].n) break;
    first += ROWS[ri].n;
  }
  const row = ROWS[ri];
  const cx = row.x1 + ((index - first + 0.5) * (row.x2 - row.x1)) / row.n;
  return { cx, feet: row.y + 77 * row.s, lane: row.y + 110 * row.s, ri };
}

function boardSpot(index = 0): WalkPoint {
  return { x: STAND_SPOTS[index] ?? STAND_SPOTS[0], y: STAND_FEET, scale: (120 / 185) * STUDENT_WALK_SCALE };
}
function seatToFront(index: number): WalkPoint[] {
  const seat = movementSeat(index);
  const aisle = seat.cx < 540 ? 28 : 1052;
  return [{ x: seat.cx, y: seat.feet }, { x: seat.cx, y: seat.lane }, { x: aisle, y: seat.lane }, { x: aisle, y: 960 }];
}
function studentRoute(m: MovingStudent): WalkPoint[] {
  const hall = hallwaySpot(m.hallwayIndex ?? 0);
  const frontHall = [{ x: 1052, y: 960 }, { x: 1030, y: 1020 }, hall];
  const target = boardSpot(m.standIndex);
  const seatPath = seatToFront(m.seatIndex);
  if (m.kind === 'to-board') {
    const from = m.fromSeatIndex === undefined ? frontHall.slice().reverse() : seatToFront(m.fromSeatIndex);
    return [...from, { x: target.x, y: 960 }, target];
  }
  if (m.kind === 'from-board') return [target, { x: target.x, y: 960 }, ...seatPath.slice().reverse()];
  if (m.kind === 'reseat') return [...seatToFront(m.fromSeatIndex ?? m.seatIndex), ...seatPath.slice().reverse()];
  const from = m.standIndex === undefined ? seatPath : [target, { x: target.x, y: 960 }];
  const departure = [...from, ...frontHall];
  return m.kind === 'leave' ? departure : departure.slice().reverse();
}
function movementLabel(m: MovingStudent) {
  if (m.kind === 'to-board') return '📋 Lên đứng bảng';
  if (m.kind === 'from-board') return '🎒 Về chỗ';
  if (m.kind === 'reseat') return '⭐ Đổi chỗ theo điểm';
  return m.kind === 'leave' ? (m.reason === 'rank' ? '↔ Nhường ghế' : '💤 Ra hành lang') : '🎒 Vào lớp';
}

function routeTimes(points: WalkPoint[]) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const times = [0];
  for (const length of lengths) times.push(times[times.length - 1] + length / total);
  times[times.length - 1] = 1;
  return times;
}

function routeSample(points: WalkPoint[], times: number[], progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  let i = times.findIndex((t, index) => index > 0 && t >= p) - 1;
  if (i < 0) i = points.length - 2;
  const f = (p - times[i]) / Math.max(0.0001, times[i + 1] - times[i]);
  const a = points[i];
  const b = points[i + 1];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x, dy: b.y - a.y };
}

/** Hàng chờ thật đặt bên trái bảng, cùng bố cục với bảng thành tích. */
function HallwayStudents({ v }: { v: StageView }) {
  const people = v.hallway ?? [];
  return (
    <>
      {people.slice(0, 6).map((s, i) => {
        const point = hallwaySpot(i);
        const h = 185;
        const w = h * 0.47;
        const g = s.girl ? 'nu' : 'nam';
        return (
          <div
            key={`hallway-person-${s.username}`}
            data-hallway-person={s.username}
            className="pointer-events-none absolute z-[2]"
            style={{ left: point.x, top: point.y, width: w, height: h, marginLeft: -w / 2, marginTop: -h, transform: `scale(${point.scale})`, transformOrigin: '50% 100%' }}
          >
            <div className="student-walker-shadow" />
            <img src={`/assets/nv/${g}/${POSE[g].dung}.webp`} alt="" className="h-full w-full object-contain" />
            <div className="student-walker-label student-walker-label-compact" title={s.nickname || s.username}>
              <span>{seatName(s.nickname || s.username)}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function StudentMovements({ v, now }: { v: StageView; now: number }) {
  const events = (v.movements ?? []).filter((m) => !isGuestTeacher(v, m.username));
  const moving = events.filter((m) => now >= m.startedAt && now < m.startedAt + m.durationMs);
  const queued = events.filter((m) => now < m.startedAt);
  const compact = moving.length > 8;
  return <>
    {queued.map((m) => <QueuedStudent key={m.id} movement={m} />)}
    {moving.map((m) => <WalkingStudent key={m.id} movement={m} compact={compact} />)}
  </>;
}
const QueuedStudent = memo(function QueuedStudent({ movement: m }: { movement: MovingStudent }) {
  const point = studentRoute(m)[0];
  const scale = point.scale ?? studentWalkScale(point.y);
  const H = WALKER_H;
  const W = H * 0.47;
  const g = m.girl ? 'nu' : 'nam';
  return <div data-student-queued={m.kind} className="pointer-events-none absolute" style={{ left: point.x, top: point.y, width: W, height: H, marginLeft: -W / 2, marginTop: -H, transform: `scale(${scale})`, transformOrigin: '50% 100%', zIndex: point.x > 960 && point.y < 900 ? 1 : 12 + Math.max(0, ROWS.filter((r) => point.y > r.y + 90 * r.s).length - 1) * 6 }}>
    <div className="student-walker-shadow" /><img src={`/assets/nv/${g}/${POSE[g].dung}.webp`} alt="" className="h-full w-full" />
    <div className="student-walker-label student-walker-label-compact" title={m.nickname || m.username}><span>{m.nickname || m.username}</span></div>
  </div>;
}, (a, b) => a.movement.id === b.movement.id && a.movement.girl === b.movement.girl && a.movement.seatIndex === b.movement.seatIndex && a.movement.fromSeatIndex === b.movement.fromSeatIndex && a.movement.standIndex === b.movement.standIndex && a.movement.hallwayIndex === b.movement.hallwayIndex);

const WalkingStudent = memo(function WalkingStudent({ movement: m, compact }: { movement: MovingStudent; compact: boolean }) {
  const element = useRef<HTMLDivElement>(null);
  const journey = useMemo(() => {
    const points = studentRoute(m);
    return { points, times: routeTimes(points) };
  }, [m.seatIndex, m.kind, m.hallwayIndex, m.standIndex, m.fromSeatIndex]);
  const [progress, setProgress] = useState(() => Math.max(0, (Date.now() - m.startedAt) / m.durationMs));
  const position = routeSample(journey.points, journey.times, progress);
  const sideways = Math.abs(position.dx) > Math.abs(position.dy);
  const back = !sideways && position.dy < 0;
  const g = m.girl ? 'nu' : 'nam';
  const hd = HEAD[g];
  const H = WALKER_H;
  const W = H * 0.47;
  const perspective = (y: number) => studentWalkScale(y);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    node.style.visibility = 'visible';
    const now = Date.now();
    const elapsed = Math.max(0, now - m.startedAt);
    const animation = node.animate(journey.points.map((p, i) => ({
      transform: `translate3d(${p.x}px, ${p.y}px, 0) scale(${p.scale ?? studentWalkScale(p.y)})`,
      offset: journey.times[i],
    })), { duration: m.durationMs, delay: Math.max(0, m.startedAt - now), easing: 'linear', fill: 'both' });
    if (elapsed > 0) animation.currentTime = elapsed;
    // Only path corners update React; animation frames run in the browser compositor.
    const timers = journey.times.slice(0, -1).flatMap((t) => {
      const wait = m.startedAt + t * m.durationMs - now;
      return wait > 0 ? [window.setTimeout(() => setProgress(Math.min(0.999, t + 0.00001)), wait)] : [];
    });
    animation.onfinish = () => { node.style.visibility = 'hidden'; };
    return () => { animation.cancel(); timers.forEach(clearTimeout); };
  }, [journey, m.startedAt, m.durationMs]);
  const zIndex = position.x > 960 && position.y < 900 ? 1 : 12 + Math.max(0, ROWS.filter((r) => position.y > r.y + 90 * r.s).length - 1) * 6;
  const waiting = progress === 0 && Date.now() < m.startedAt;
  return (
    <div
      ref={element}
      className={`student-walker pointer-events-none absolute ${compact ? 'student-walker-compact' : ''}`}
      data-student-movement={m.kind}
      aria-label={`${m.nickname}: ${movementLabel(m)}`}
      style={{ left: 0, top: 0, contain: 'layout style', willChange: 'transform', width: W, height: H, marginLeft: -W / 2, marginTop: -H, transformOrigin: '50% 100%', zIndex,
        transform: `translate3d(${journey.points[0].x}px, ${journey.points[0].y}px, 0) scale(${journey.points[0].scale ?? perspective(journey.points[0].y)})` }}
    >
      <div className="student-walker-shadow" />
      <div className="student-walker-step" style={{ animationPlayState: waiting ? 'paused' : 'running' }}>
        <div className="relative h-full w-full" style={{ transform: `scaleX(${sideways ? (position.dx < 0 ? -0.76 : 0.76) : 1}) rotate(${sideways ? 2 : 0}deg)`, transformOrigin: '50% 100%' }}>
          <img src={`/assets/nv/${g}/${back ? 'sau-' : ''}${POSE[g].dung}.webp`} alt="" className="h-full w-full" />
          {back && <div className="absolute" style={{ left: hd.x * W, top: hd.y * H, width: hd.w * W, height: hd.h * H }}><Hair username={m.username} girl={m.girl} /></div>}
        </div>
      </div>
      <div className={`student-walker-label ${compact ? 'student-walker-label-compact' : ''}`} title={m.nickname || m.username}><span>{m.nickname || m.username}</span>{!compact && <small>{movementLabel(m)}</small>}</div>
    </div>
  );
}, (a, b) => a.compact === b.compact && a.movement.id === b.movement.id && a.movement.username === b.movement.username && a.movement.startedAt === b.movement.startedAt && a.movement.durationMs === b.movement.durationMs && a.movement.seatIndex === b.movement.seatIndex && a.movement.kind === b.movement.kind && a.movement.reason === b.movement.reason && a.movement.hallwayIndex === b.movement.hallwayIndex && a.movement.standIndex === b.movement.standIndex && a.movement.fromSeatIndex === b.movement.fromSeatIndex && a.movement.nickname === b.movement.nickname && a.movement.girl === b.movement.girl);

type StudentBodyProps = {
  s: StageView['seats'][number]; pose: PoseKey; away: boolean; called: boolean;
  w: number; h: number; left: number; top: number; scale: number; isFirst: boolean; qNo: number; zIndex: number;
};
const StudentBody = memo(function StudentBody({ s, pose, away, called, w, h, left, top, scale, isFirst, qNo, zIndex }: StudentBodyProps) {
  if (away) return null;
  const g = s.girl ? 'nu' : 'nam';
  const hd = HEAD[g];
  return (
                <motion.div
                  key={s.username}
                  initial={false}
                  animate={{
                    opacity: away ? 0 : 1,
                    y: isFirst ? [0, -30, 0, -15, 0] : 0,
                    x: s.answered === 'wrong' ? [-5, 5, -4, 4, -2, 2, 0] : 0,
                  }}
                  transition={isFirst ? { y: { duration: 0.9 } } : { type: 'spring', stiffness: 120, damping: 18 }}
                  className={`absolute ${called ? 'called-up' : ''}`}
                  style={{ left, top, width: w, height: h, zIndex: zIndex }}
                >
                  <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(0 0 38% 0)' }}>
                    <img src={`/assets/nv/${g}/sau-${POSE[g][pose]}.webp`} style={{ width: w, height: h }} className="max-w-none" />
                    <div className="absolute" style={{ left: hd.x * w, top: hd.y * h, width: hd.w * w, height: hd.h * h }}>
                      <Hair username={s.username} girl={s.girl} />
                    </div>
                  </div>
                  {s.roseRole && s.roseRole.expiresAt === null && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center" aria-label={s.roseRole.label}>
                      <span className="text-[34px] leading-[36px] drop-shadow-md">{s.roseRole.icon}</span>
                      <span className={`mt-[25px] whitespace-nowrap rounded-md border px-1 text-[14px] font-extrabold leading-[18px] shadow-sm ${s.roseRole.label === 'Lớp trưởng' ? 'border-[#b77915] bg-[#ffe080] text-[#713900]' : 'border-[#4088b5] bg-[#c9e9ff] text-[#16486a]'}`}>{s.roseRole.label}</span>
                    </div>
                  )}
                  {s.answered === 'right' && <div className="badge bg-[#16a34a]">✓</div>}
                  {s.answered === 'right' && s.gain > 0 && (
                    <motion.div
                      key={`gain${qNo}`}
                      initial={{ y: 0, opacity: 1, scale: 0.6 }}
                      animate={{ y: -80, opacity: [1, 1, 0], scale: 1.2 }}
                      transition={{ duration: 1.8, ease: 'easeOut' }}
                      className="pointer-events-none absolute left-1/2 top-0 z-40 -translate-x-1/2 whitespace-nowrap font-extrabold text-[#fde047] [text-shadow:0_2px_0_#7a2e0e,0_0_6px_#000]"
                      style={{ fontSize: 32 * scale }}
                    >
                      +{s.gain}
                    </motion.div>
                  )}
                  {s.answered === 'wrong' && (
                    <>
                      <motion.div
                        initial={{ scale: 0, rotate: -25 }}
                        animate={{ scale: [0, 1.35, 1], rotate: [0, -8, 8, 0] }}
                        transition={{ duration: 0.4 }}
                        className="badge bg-[#dc2626] border-2 border-white shadow-lg text-[22px] font-black"
                      >
                        ✗
                      </motion.div>
                      {/* Giọt mồ hôi lo lắng toát ra khi sai */}
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.5 }}
                        animate={{ opacity: [0, 1, 1, 0], y: [-6, 6, 14], scale: [0.5, 1.1, 1.1, 0.8] }}
                        transition={{ duration: 1.5, repeat: 1, repeatDelay: 0.4 }}
                        className="pointer-events-none absolute -top-[24px] left-[10px] text-[26px]"
                      >
                        💦
                      </motion.div>
                      {/* Text hoạt hình bay lên báo trả lời sai */}
                      <motion.div
                        key={`wrong${qNo}`}
                        initial={{ y: 0, opacity: 1, scale: 0.6 }}
                        animate={{ y: -70, opacity: [1, 1, 0], scale: 1.15 }}
                        transition={{ duration: 1.8, ease: 'easeOut' }}
                        className="pointer-events-none absolute left-1/2 top-0 z-40 -translate-x-1/2 whitespace-nowrap font-extrabold text-[#f87171] [text-shadow:0_2px_0_#7f1d1d,0_0_6px_#000]"
                        style={{ fontSize: 30 * scale }}
                      >
                        ❌ Sai rồi
                      </motion.div>
                    </>
                  )}
                  <DeskGifts desk={s.desk} scale={scale} />
                  {s.sleeping && !s.bubble && (
                    <motion.div
                      animate={{ y: [0, -12, 0], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2.4, repeat: Infinity }}
                      className="pointer-events-none absolute -top-[40px] right-0 text-[30px]"
                      style={{ fontSize: 30 * scale }}
                    >
                      💤
                    </motion.div>
                  )}
                </motion.div>
              );
}, (a, b) => a.pose === b.pose && a.away === b.away && a.called === b.called && a.w === b.w && a.h === b.h && a.left === b.left && a.top === b.top && a.scale === b.scale && a.isFirst === b.isFirst && a.qNo === b.qNo && a.zIndex === b.zIndex && a.s.roseRole?.label === b.s.roseRole?.label && a.s.username === b.s.username && a.s.girl === b.s.girl && a.s.answered === b.s.answered && a.s.gain === b.s.gain && a.s.bubble === b.s.bubble && a.s.sleeping === b.s.sleeping && a.s.desk.length === b.s.desk.length && a.s.desk.every((g, i) => g.at === b.s.desk[i].at && g.icon === b.s.desk[i].icon));

const SeatAvatar = memo(function SeatAvatar({ avatar, name, username, cx, cy, zIndex }: { avatar: string; name: string; username: string; cx: number; cy: number; zIndex: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(avatar) && failedSrc !== avatar;
  const initial = [...(name.trim() || username)][0]?.toLocaleUpperCase('vi') ?? '?';
  return (
    <div className="student-seat-avatar" style={{ left: cx, top: cy - 32, zIndex }} title={`${name} (@${username})`}>
      {showImage ? <img src={avatar} alt={`Ảnh đại diện ${name}`} decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSrc(avatar)} /> : <span aria-label={`Ảnh đại diện ${name}`}>{initial}</span>}
    </div>
  );
});

/** Chỉ rút gọn nhãn ghế, username và tên gốc vẫn dùng cho mọi sự kiện. */
const seatName = (name: string) => name.trim().split(/\s+/u).slice(0, 3).join(' ');

function Students({ v, now }: { v: StageView; now: number }) {
  const asking = v.phase === 'question' || v.phase === 'bonus';
  const first = asking ? v.correctTop[0]?.username : undefined;

  return (
    <>
      {ROWS.map((r, ri) => {
        const gap = (r.x2 - r.x1) / r.n;
        const baseZ = 10 + ri * 6;
        const startIndex = ROWS.slice(0, ri).reduce((total, row) => total + row.n, 0);
        const rowSeats = Array.from({ length: r.n }, (_, k) => {
          const seatIndex = startIndex + k;
          const student = v.seats.find((s, index) => (s.seatIndex ?? index) === seatIndex);
          const cx = r.x1 + (k + 0.5) * gap;
          const cy = r.y;
          return { seatIndex, student, rank: student ? v.seats.indexOf(student) : -1, cx, cy, k };
        });

        return (
          <div key={`row-${ri}`}>
            {/* Lớp 1: Mặt bàn và chân bàn */}
            {rowSeats.map(({ k, cx, cy }) => (
              <StudentDesk key={`desk-${ri}-${k}`} cx={cx} cy={cy} scale={r.s} />
            ))}

            {/* Lớp 2: Học sinh ngồi vào bàn */}
            {rowSeats.map(({ rank, student: s, cx, cy }) => {
              if (!s) return null;
              const scale = r.s * STUDENT_BODY_SCALE;
              const w = SPRITE_H * 0.47 * scale;
              const h = SPRITE_H * scale;
              const left = cx - w / 2;
              const top = cy - h * 0.44; // Đầu và vai nhô tự nhiên trên mặt bàn
              const pose = studentPose(s, v, rank, now);
              const called = v.recess?.game === 'callup' && v.recess.callUser === s.username;
              const moving = (v.movements ?? []).some((m) => m.username === s.username && now < m.startedAt + m.durationMs);
              const away = isGuestTeacher(v, s.username) || moving || s.standing || v.walk?.username === s.username || called;

              return <StudentBody key={s.username} s={s} pose={pose} away={away} called={called} w={w} h={h} left={left} top={top} scale={scale} isFirst={s.username === first} qNo={v.qNo} zIndex={baseZ + 2} />;
            })}

            {/* Lớp 3: Lưng ghế (che thân dưới) và Bảng tên */}
            {rowSeats.map(({ rank, student: s, cx, cy, k }) => {
              const scale = r.s * STUDENT_BODY_SCALE;
              const maxTagW = gap - 4;
              const called = s ? v.recess?.game === 'callup' && v.recess.callUser === s.username : false;
              const away = s && (isGuestTeacher(v, s.username) || s.standing || called || v.walk?.username === s.username || (v.movements ?? []).some((m) => m.username === s.username && now < m.startedAt + m.durationMs));
              return (
                <Fragment key={`chair-tag-${ri}-${k}`}>
                  <StudentChairBack cx={cx} cy={cy} scale={r.s} zIndex={baseZ + 3} />

                  {s && !away && <SeatAvatar key={s.username} avatar={s.avatar} name={s.nickname || s.username} username={s.username} cx={cx} cy={cy} zIndex={60 + ri} />}
                  {s && !away && s.bubble && (
                    <div className="student-seat-bubble" title={s.bubble} style={{ left: cx, top: cy - SPRITE_H * scale * 0.44 - 6, width: gap - 8, zIndex: 60 + ri }}>
                      <span>{s.bubble}</span>
                    </div>
                  )}
                  {s && !away && (
                    <div
                      className={`nametag student-seat-tag ${s.roseRole?.label === 'Lớp trưởng' ? 'student-officer-leader' : s.roseRole?.label === 'Lớp phó' ? 'student-officer-deputy' : ''}`}
                      style={{
                        left: cx,
                        top: cy + 8 * r.s,
                        transform: 'translateX(-50%)',
                        width: maxTagW,
                        maxWidth: maxTagW,
                        fontSize: 18,
                        zIndex: 60 + ri,
                      }}
                    >
                      <span className="student-tag-name" title={s.nickname || s.username} aria-label={s.nickname || s.username} style={{ fontSize: Math.max(13, Math.min(17, 210 / Math.max(1, [...seatName(s.nickname || s.username)].length))) }}>{seatName(s.nickname || s.username)}</span>
                      <span className="student-tag-meta">
                      {s.team > 0 && (
                        <span className="mr-1 shrink-0 rounded-full px-[5px] font-extrabold text-white" style={{ background: TEAM_COLOR[s.team - 1] }}>
                          {s.team}
                        </span>
                      )}
                      {rank < 5 && s.score > 0 && <span className="rank">{rank + 1}</span>}
                      {s.roseRole && s.roseRole.expiresAt === null ? (
                        <span className="mr-1 font-bold">🌹 x{s.roseRole.roses}</span>
                      ) : s.roseRole ? (
                        <span className="mr-1 rounded bg-[#fce7f3] px-1 text-[#9b2852]">{s.roseRole.icon} {s.roseRole.label}{s.roseRole.expiresAt !== null ? ` ${Math.max(0, Math.ceil((s.roseRole.expiresAt - now) / 1000))}s` : ` x${s.roseRole.roses}`}</span>
                      ) : s.title && <span className="mr-1">{s.title === 'lop-truong' ? '👑' : '⭐'}</span>}
                      {s.showIcons && <span className="mr-1 whitespace-nowrap">{s.showIcons}</span>}
                      {called && <span className="mr-1">📢</span>}
                      {s.days >= 2 && <span className="mr-1 whitespace-nowrap">🎒{s.days}</span>}
                      {s.grade >= 2 && (
                        <span className="mr-1 shrink-0 rounded-full bg-[#2563eb] px-[5px] font-extrabold text-white">
                          {s.grade > 12 ? '🎓' : `L${s.grade}`}
                        </span>
                      )}
                      {s.score > 0 && <b className="ml-1 text-[#c2410c]">{s.score}</b>}
                      </span>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        );
      })}
    </>
  );
}


const FLOWER_SPOT: [number, number] = [320, 940]; // Đưa quà cạnh cô trên sàn, không đi vào dải thông báo.
function FlowerWalk({ v }: { v: StageView }) {
  const w = v.walk;
  if (!w || isGuestTeacher(v, w.username) || (v.movements ?? []).some((m) => m.username === w.username && Date.now() < m.startedAt + m.durationMs)) return null;
  const i = v.seats.find((s) => s.username === w.username)?.seatIndex ?? -1;
  const H = 190;
  const target: [number, number] = [FLOWER_SPOT[0] - H * 0.235, FLOWER_SPOT[1] - H];
  const seat = i >= 0 ? movementSeat(i) : null;
  const from: [number, number] = seat ? [seat.cx - H * 0.235, seat.feet - H] : [65, 870];
  const aisle: [number, number] = [seat && seat.cx >= 540 ? 1052 - H * 0.235 : 28 - H * 0.235, 960 - H];
  const g = w.girl ? 'nu' : 'nam';
  return (
    <motion.div
      key={w.at}
      initial={{ left: from[0], top: from[1], opacity: 0 }}
      animate={{ left: [from[0], aisle[0], target[0], target[0], aisle[0], from[0]], top: [from[1], aisle[1], target[1], target[1], aisle[1], from[1]], opacity: [1, 1, 1, 1, 1, 0] }}
      transition={{ duration: GAME.walkMs / 1000, times: [0, 0.15, 0.35, 0.65, 0.85, 1], ease: 'easeInOut' }}
      className="pointer-events-none absolute z-30"
      style={{ width: H * 0.47, height: H }}
    >
      <img src={`/assets/nv/${g}/${POSE[g].vui}.webp`} className="h-full w-full drop-shadow-[0_4px_3px_rgba(0,0,0,0.3)]" />
      <div className="absolute -right-4 top-[70px] leading-none" style={{ fontSize: 40 * GAME.giftTiers[w.tier].size }}>
        {w.icon}
      </div>
      <div className="nametag" style={{ fontSize: 16, bottom: 'calc(100% - 4px)' }}>
        <span className="truncate">{w.nickname}</span>
      </div>
    </motion.div>
  );
}

// Học sinh bị phạt đứng: đứng ở khoảng sàn bục giảng trước lớp, trước dãy ghế đầu
const STAND_SPOTS = [760, 860, 960];
const STAND_FEET = 920; // Đầu và bảng tên nằm dưới mép bảng (y = 754), trước dãy bàn đầu.
function Punished({ v }: { v: StageView }) {
  return (
    <>
      {v.punished
        .filter((s) => v.walk?.username !== s.username && !isGuestTeacher(v, s.username) && !(v.movements ?? []).some((m) => m.username === s.username && Date.now() < m.startedAt + m.durationMs))
        .slice(0, STAND_SPOTS.length)
        .map((s) => {
          const i = s.standIndex ?? 0;
          const H = 190;
          const g = s.girl ? 'nu' : 'nam';
          return (
            <motion.div
              key={s.username}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none absolute z-30 flex flex-col items-center"
              style={{ left: STAND_SPOTS[i] - (H * 0.47) / 2, top: STAND_FEET - H, width: H * 0.47, height: H, transformOrigin: '50% 100%' }}
            >
              {/* Bóng chân đổ trên sàn gỗ */}
              <div className="absolute -bottom-1 left-1/2 h-[12px] w-[50px] -translate-x-1/2 rounded-full bg-black/30 filter blur-[2px]" />
              <img
                src={`/assets/nv/${g}/${POSE[g].tay}.webp`}
                className="h-full w-full object-contain object-bottom"
                alt={`${s.nickname} đang đứng cạnh bảng`}
              />
              <div className="nametag whitespace-nowrap px-2 py-0.5 text-[15px] font-bold shadow-md" style={{ top: 'auto', bottom: 'calc(100% + 6px)', maxWidth: 100 }}>
                <span className="mr-1 text-[13px] text-[#dc2626]">⚠️</span>
                <span className="max-w-[70px] truncate">{s.nickname}</span>
                {s.left > 0 && <span className="ml-1 text-[12px] font-extrabold text-[#b91c1c]">({s.left}c)</span>}
              </div>
            </motion.div>
          );
        })}
    </>
  );
}

// Học sinh được gọi lên bảng kiểm tra miệng trong giờ ra chơi
function CallupStudent({ v }: { v: StageView }) {
  if (v.recess?.game !== 'callup' || !v.recess.callUser) return null;
  if (isGuestTeacher(v, v.recess.callUser)) return null;
  const s = v.seats.find((st) => st.username === v.recess!.callUser);
  const g = s?.girl ?? false ? 'nu' : 'nam';
  const stage = v.recess.stage;
  const result = v.recess.callResult;
  const pose =
    result === 'right'
      ? POSE[g].vui
      : result === 'wrong'
      ? POSE[g].buon
      : stage === 'play'
      ? POSE[g].nghi
      : POSE[g].dung;
  const H = 190;
  const cx = 490; // Giữa sàn, tách cô bên trái và khu đứng phạt bên phải.
  const feet = 940;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="pointer-events-none absolute z-30 flex flex-col items-center"
      style={{ left: cx - (H * 0.47) / 2, top: feet - H, width: H * 0.47, height: H }}
    >
      <div className="absolute -bottom-2 left-1/2 h-[16px] w-[70px] -translate-x-1/2 rounded-full bg-[#fcd34d]/50 filter blur-[3px]" />
      <motion.img
        src={`/assets/nv/${g}/${pose}.webp`}
        animate={result === 'right' ? { y: [0, -14, 0] } : { y: [0, 4, 0] }}
        transition={{ duration: result === 'right' ? 0.6 : 1.4, repeat: Infinity }}
        className="h-full w-full object-contain drop-shadow-[0_5px_4px_rgba(0,0,0,0.35)]"
      />
      <div className="nametag whitespace-nowrap border-2 border-[#f59e0b] bg-[#fffbeb] px-2.5 py-0.5 text-[16px] font-bold text-[#78350f] shadow-md" style={{ top: 'auto', bottom: 'calc(100% + 6px)' }}>
        <span className="mr-1">📢</span>
        <span className="max-w-[80px] truncate">{v.recess.callName || s?.nickname || 'Học sinh'}</span>
      </div>
    </motion.div>
  );
}

function DeskGifts({ desk, scale }: { desk: StageView['seats'][number]['desk']; scale: number }) {
  const size = 30 * scale;
  const SPOTS = [-36, 36, -50, 50];
  return (
    <>
      {desk.map((g, i) => {
        const left = SPOTS[i % SPOTS.length] * scale;
        const top = 65 * scale + (i >= 2 ? 6 : 0) * scale;
        return (
          <motion.div
            key={g.at + g.icon}
            initial={Date.now() - g.at < 2000 ? { scale: 2.2, rotate: -30, opacity: 0 } : false}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.3, 1.4, 0.5, 1], opacity: { duration: 0.2 } }}
            className="pointer-events-none absolute drop-shadow-[0_3px_2px_rgba(0,0,0,0.35)]"
            style={{ left, top, fontSize: size, lineHeight: 1, zIndex: 6 }}
          >
            {g.icon}
          </motion.div>
        );
      })}
    </>
  );
}

function GiftGuideStrip({ v }: { v: StageView }) {
  const settings = v.roseSettings;
  if (!settings?.visible) return null;
  const gifts = [
    { amount: settings.hint, label: 'Mở 1 ô chữ' },
    { amount: settings.leader, label: 'Lớp trưởng' },
    { amount: settings.teacher, label: 'Cô giáo · 2′' },
  ];
  return (
    <aside aria-label="Hướng dẫn tặng quà" className="absolute bottom-[8px] left-[18px] z-20 grid h-[56px] w-[1044px] grid-cols-3 gap-3">
      {gifts.map((gift) => (
        <div key={gift.label} className="flex min-w-0 items-center justify-center gap-3 rounded-[12px] border-[3px] border-[#cf7891] bg-[#fff1e8] px-3 text-[#84294b] shadow-[0_3px_0_#87445c]">
          <b className="shrink-0 whitespace-nowrap text-[25px]">🌹 ×{gift.amount}</b>
          <span className="min-w-0 text-[28px] font-extrabold leading-[29px]">{gift.label}</span>
        </div>
      ))}
    </aside>
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
          {giftOf(gift.giftName)?.icon ?? '💐'} <span className="inline-block max-w-[300px] truncate align-bottom">{gift.nickname}</span> tặng cô {gift.repeatCount > 1 ? `${gift.repeatCount} × ` : ''}
          {giftOf(gift.giftName)?.say ?? gift.giftName}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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

function GoodbyeBanner({ v }: { v: StageView }) {
  return (
    <AnimatePresence>
      {v.goodbye && (
        <motion.div
          key={v.goodbye.at}
          initial={{ opacity: 0, y: -40, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="absolute left-1/2 top-[620px] z-50 w-[900px] -translate-x-1/2 rounded-[30px] border-4 border-white bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500 px-6 py-4 text-center font-extrabold text-white shadow-2xl"
        >
          <motion.div animate={{ rotate: [-12, 12, -12] }} transition={{ duration: 1, repeat: Infinity }} className="inline-block text-[64px] leading-none">
            👋
          </motion.div>
          <div className="mt-1 whitespace-nowrap text-[44px] leading-tight drop-shadow">Tan lớp rồi! Hẹn gặp lại cả lớp nha 💕</div>
          <div className="mt-2 text-[30px] font-bold leading-tight">Nhớ theo dõi kênh để không lỡ buổi học sau</div>
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
