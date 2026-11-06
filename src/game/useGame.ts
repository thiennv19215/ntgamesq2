import { useEffect, useRef, useState } from 'react';
import { useLiveEvents } from '../live/useLiveEvents';
import type { GiftEvent, LiveStatus } from '../live/types';
import { voice, speakableName } from '../live/voice';
import { containsBanned } from '../live/bannedWords';
import { NameBatcher } from '../live/scoreboard';
import { GiftThanker, OncePerPerson } from '../live/chatter';
import { IS_STAGE } from '../live/page';
import { GAME } from './config';
import { QUESTIONS, SHOW_BANK } from './bank';
import { Classroom, plain, type ClassView, type RecessGame, type Say } from './quiz';
import type { ShowKind } from './show';
import { sfx } from './sfx';

// ?view=stage&mute=1: xem thử trang stage không phát tiếng
const MUTED = new URLSearchParams(window.location.search).get('mute') === '1';

export type WeekRow = { username: string; nickname: string; points: number };
export type StageView = ClassView & { weekTop: WeekRow[]; todayTop: WeekRow[]; talkTop: WeekRow[] };

/** Top 5 hôm nay: điểm server đã lưu + điểm vừa ghi chưa kịp gửi lên (bảng cập nhật ngay, không chờ 20 giây) */
function dayBoard(saved: WeekRow[], pending: Map<string, { nickname: string; points: number }>): WeekRow[] {
  const all = new Map(saved.map((r) => [r.username, { ...r }]));
  for (const [username, p] of pending) {
    const cur = all.get(username) ?? { username, nickname: p.nickname, points: 0 };
    cur.points += p.points;
    cur.nickname = p.nickname || cur.nickname;
    all.set(username, cur);
  }
  return [...all.values()].sort((a, b) => b.points - a.points).slice(0, 5);
}

/**
 * Trang stage chạy game thật (lõi ở quiz.ts), đọc/ghi sổ lớp trên server và gửi ảnh chụp trạng thái lên.
 * Trang điều khiển không tự chạy game, chỉ vẽ lại ảnh chụp đó, nên xem trước luôn khớp với live.
 */
export function useGame() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [view, setView] = useState<StageView | null>(null);
  const [lastGift, setLastGift] = useState<(GiftEvent & { at: number }) | null>(null);
  const [stageCount, setStageCount] = useState(0);
  const [channelName, setChannelName] = useState(GAME.defaultChannelName);

  const roomRef = useRef<Classroom | null>(null);
  const weekTop = useRef<WeekRow[]>([]);
  const todayTop = useRef<WeekRow[]>([]); // điểm cả ngày (server), cho bảng Học sinh xuất sắc hôm nay
  const talkTop = useRef<WeekRow[]>([]); // tương tác cả ngày (server), cho bảng Top tương tác
  const likeBase = useRef<number | null>(null);
  const dirty = useRef(true);
  const firstChats = useRef(new Set<string>());

  const [talk] = useState(() => ({
    greeter: new NameBatcher(
      GAME.greetEveryMs,
      GAME.namesPerGreeting,
      (names) => roomRef.current && say([roomRef.current.greet(joinNames(names))]),
      () => chatter.current.length >= 2, // còn câu nói thêm đang chờ thì gom tên lượt sau
    ),
    gifts: new GiftThanker(GAME.giftThanksCooldownMs, GAME.bigGiftCoins),
    follows: new OncePerPerson(),
  }));

  // Nhịp giọng bám chương trình:
  // - Câu chính (đề, đáp án, tổng kết, ra chơi) đọc ngay; trong lúc cô đọc, đồng hồ phần đó dừng lại.
  // - Câu nói thêm (chào, cảm ơn, cà khịa) giữ ở đây, chỉ nói khi đang chờ học sinh trả lời và còn hơn 5 giây.
  const mainSpeaking = useRef(0);
  const chatter = useRef<{ text: string; priority: boolean; until: number }[]>([]);
  const lastGiftSpeechAt = useRef(-Infinity);
  function say(lines: Say[]) {
    const now = Date.now();
    for (const l of lines) {
      if (l.main) {
        mainSpeaking.current++;
        // câu hô bắt đầu: cô vừa mở miệng hô thì hiện bảng chữ
        const onStart = l.go
          ? () => {
              roomRef.current?.showBoard();
              dirty.current = true;
            }
          : undefined;
        // chế độ nhanh: đọc xong đề mới hiện bảng chữ, nhận đáp án
        const onDone = l.showAfter
          ? () => {
              mainSpeaking.current--;
              roomRef.current?.showBoard();
              dirty.current = true;
            }
          : () => mainSpeaking.current--;
        voice.say(l.text, true, onDone, false, onStart);
      } else if (l.warn) {
        voice.say(l.text, true); // nhắc sắp hết giờ: chen lên đọc liền, đồng hồ vẫn chạy
      } else {
        const ttl = l.ttl ?? (l.priority ? GAME.giftLineMaxWaitMs : GAME.chatterMaxWaitMs);
        chatter.current.push({ text: l.text, priority: !!l.priority, until: now + ttl });
      }
    }
    dirty.current = true;
  }
  /** Nhả 1 câu nói thêm nếu đang tới lúc (gọi mỗi nhịp game) */
  function flushChatter(room: Classroom, now: number) {
    chatter.current = chatter.current.filter((c) => c.until > now);
    if (voice.busy || mainSpeaking.current > 0 || !room.chatterWindow(now)) return;
    // cảm ơn quà trước; câu thường mỗi phần chỉ nói GAME.chatterPerPhase câu, còn lại chờ phần sau hoặc hết hạn thì bỏ
    const giftTurn = now - lastGiftSpeechAt.current >= 15_000;
    const notice = giftTurn ? room.takeRoleNotice(now) : null;
    if (notice) {
      lastGiftSpeechAt.current = now;
      voice.say(notice.text); // Nhận vai dùng cùng lượt nói thêm như cảm ơn quà, không giữ đồng hồ.
      return;
    }
    const p = giftTurn ? chatter.current.findIndex((c) => c.priority) : -1;
    const i = p >= 0 ? p : room.chatterAllowed(false) ? chatter.current.findIndex((c) => !c.priority) : -1;
    if (i < 0) return;
    const next = chatter.current.splice(i, 1)[0];
    if (!next) return;
    if (!next.priority) room.chatterUsed++;
    else lastGiftSpeechAt.current = now;
    voice.say(next.text);
  }

  // Tên an toàn để hiện/đọc: tên có từ cấm thì dùng username
  const person = (e: { nickname: string; username: string; avatar: string }) => {
    const nickname = containsBanned(e.nickname) ? e.username : e.nickname;
    return { username: e.username, nickname, spoken: speakableName(nickname), avatar: e.avatar };
  };

  useLiveEvents({
    onStatus: setStatus,
    onSpeaker: (d) => setStageCount(d.count),
    onGameState: (s) => {
      if (!IS_STAGE) setView(s as StageView);
    },

    onMember: (e) => {
      const room = roomRef.current;
      if (!room) return;
      room.enter(person(e), Date.now());
      room.socialChat('join', person(e), Date.now());
      dirty.current = true;
    },

    onChat: (e) => {
      const room = roomRef.current;
      if (!room) return;
      const p = person(e);
      const isNew = !firstChats.current.has(e.username);
      firstChats.current.add(e.username);
      say(room.chat({ ...p, comment: e.comment, createTime: e.createTime ?? e.timestamp, safe: !containsBanned(e.comment) }, Date.now()));
      if (isNew && p.spoken !== 'bạn' && GAME.joinKeywords.includes(plain(e.comment))) talk.greeter.add(e.username, p.spoken);
      // chuyên cần: lần đầu bình luận trong buổi thì báo server, server trả về số ngày đi học liền
      if (isNew && IS_STAGE) {
        fetch('/api/game/attend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: e.username, nickname: p.nickname }) })
          .then((r) => r.json())
          .then((d) => roomRef.current && say(roomRef.current.attendance(p, Number(d.days) || 0, Date.now(), d.life)))
          .catch(() => {});
      }
    },

    onGift: (e) => {
      const room = roomRef.current;
      if (!room) return;
      const p = person(e);
      const coins = e.diamondCount * e.repeatCount;
      if (e.repeatCount > 0) setLastGift({ ...e, nickname: p.nickname, at: Date.now() });
      const hint = room.gift(p, coins, Date.now(), e.repeatCount, e.giftName, e.roleCount ?? e.repeatCount);
      // Mọi lời về quà (mở chữ, nhận vai, cảm ơn) chờ cùng lượt nói thêm, không chen lời giảng.
      say(hint.map((line) => ({ ...line, main: false, warn: false, priority: true })));
      // combo / tặng liên tục chỉ cảm ơn 1 lần mỗi 30 giây; quà to luôn cảm ơn
      if (e.repeatCount > 0) room.socialChat('gift', p, Date.now());
      const pendingRole = e.giftName.toLowerCase() === 'rose' && (e.roleCount ?? e.repeatCount) >= room.roseSettings.deputy;
      if (e.repeatCount > 0 && !pendingRole && !(e.giftName.toLowerCase() === 'rose' && e.roleCount === 0) && !hint.length && talk.gifts.shouldThank(e.username, coins, chatter.current.filter((c) => c.priority).length)) say([room.thank(p, e.giftName, coins)]);
    },

    onFollow: (e) => {
      const room = roomRef.current;
      if (room && talk.follows.first(e.username)) {
        room.socialChat('follow', person(e), Date.now());
        say([room.follow(person(e))]);
      }
    },

    onShare: (e) => {
      const room = roomRef.current;
      if (!room) return;
      room.socialChat('share', person(e), Date.now());
      dirty.current = true;
    },

    onLike: (e) => {
      const room = roomRef.current;
      if (!room) return;
      room.socialChat('like', { username: e.username, nickname: e.nickname || e.username, spoken: speakableName(e.nickname || e.username), avatar: '' }, Date.now());
      if (likeBase.current === null) likeBase.current = e.totalLikes - e.likeCount;
      // tim thật x GAME.heartBoost: đủ 300 tim (60 tim thật) là cả lớp vỗ tay
      const reached = (e.totalLikes - likeBase.current) * GAME.heartBoost >= GAME.likesPerClap;
      if (reached) likeBase.current = e.totalLikes;
      say(room.like(e.likeCount, Date.now(), reached));
    },

    onControl: (c) => {
      if (c.action === 'setName' && c.text) setChannelName(c.text);
      const room = roomRef.current;
      if (!room) return;
      if (c.action === 'custom' && c.text === 'teacherChatTest') {
        room.previewTeacherChat(Date.now());
        dirty.current = true;
      }
      if (c.action === 'custom' && c.text?.startsWith('roseSettings:')) {
        try {
          if (room.setRoseSettings(JSON.parse(c.text.slice('roseSettings:'.length)))) {
            localStorage.setItem('classroom.roseSettings', JSON.stringify(room.roseSettings));
            dirty.current = true;
          }
        } catch { /* Bỏ qua thiết lập không hợp lệ. */ }
      }
      if (c.action === 'speak' && c.text) voice.say(c.text, true);
      if (c.action === 'setRate' && c.text) voice.rate = Number(c.text) || 1;
      if (c.action === 'reset' || (c.action === 'custom' && c.text === 'newRound')) {
        voice.stop();
        chatter.current = [];
        say(room.newRound(Date.now()));
      }
      if (c.action === 'custom' && c.text === 'skip') say(room.skip(Date.now()));
      if (c.action === 'custom' && c.text === 'ban') say(room.banCurrent(Date.now()));
      // chủ kênh tự bấm chúc sinh nhật: tên trùng bạn đang trong lớp thì bánh kem đặt lên bàn bạn đó
      if (c.action === 'custom' && c.text?.startsWith('birthday:')) {
        const name = c.text.slice(9).trim().slice(0, 40);
        const s = [...room.students.values()].find((x) => x.nickname.toLowerCase() === name.toLowerCase());
        if (name) say(room.celebrate(s ?? person({ username: `kenh:${name}`, nickname: name, avatar: '' }), Date.now()));
      }
      if (c.action === 'custom' && c.text === 'goodbye') say(room.goodbye(Date.now()));
      if (c.action === 'custom' && c.text?.startsWith('recess:')) say(room.forceRecess(c.text.slice(7) as RecessGame, Date.now()));
      if (c.action === 'custom' && c.text?.startsWith('show:')) say(room.forceShow(c.text.slice(5) as ShowKind, Date.now()));
    },
  });

  // Mở trang stage: đọc sổ lớp (câu đã hỏi, bảng vàng tuần) rồi mới vào học
  useEffect(() => {
    if (!IS_STAGE) return;
    if (MUTED) {
      voice.volume = 0;
      sfx.volume = 0;
    }
    sfx.loadFiles();
    let prevView: StageView | null = null;
    let stop = false;
    const timers: ReturnType<typeof setInterval>[] = [];

    const save = async () => {
      const room = roomRef.current;
      if (!room) return;
      const used = room.usedLog.splice(0);
      const week = [...room.weekDelta].map(([username, v]) => ({ username, ...v }));
      room.weekDelta.clear();
      const banned = room.banLog.splice(0);
      const report = room.reportLog.splice(0);
      const life = [...room.lifeDelta].map(([username, v]) => ({ username, ...v }));
      room.lifeDelta.clear();
      const talk = [...room.talkDelta].map(([username, v]) => ({ username, ...v }));
      room.talkDelta.clear();
      const flowers = room.flowerDelta;
      room.flowerDelta = 0;
      try {
        const r = await fetch('/api/game/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ used, week, banned, report, life, talk, flowers }) });
        const d = await r.json();
        weekTop.current = d.weekTop ?? [];
        todayTop.current = d.todayTop ?? [];
        talkTop.current = d.talkTop ?? [];
        if (typeof d.flowersToday === 'number') roomRef.current?.setFlowersSaved(d.flowersToday);
        room.weekLeader = weekTop.current[0] ? speakableName(weekTop.current[0].nickname) : '';
      } catch {
        room.usedLog.unshift(...used); // server tắt: giữ lại, lần sau gửi
        for (const w of week) room.weekDelta.set(w.username, w);
        room.banLog.unshift(...banned);
        room.reportLog.unshift(...report);
        for (const l of life) room.lifeDelta.set(l.username, l);
        for (const w of talk) room.talkDelta.set(w.username, w);
        room.flowerDelta += flowers;
      }
    };

    (async () => {
      let used: Record<string, number> = {};
      let banned: string[] = [];
      let flowersSaved = 0;
      try {
        const d = await (await fetch('/api/game/save')).json();
        used = d.used ?? {};
        banned = d.banned ?? [];
        weekTop.current = d.weekTop ?? [];
        todayTop.current = d.todayTop ?? [];
        talkTop.current = d.talkTop ?? [];
        flowersSaved = Number(d.flowersToday) || 0; // quỹ hoa hôm nay (mở lại trang không mất)
      } catch {
        // server cũ chưa có sổ: chơi bình thường, chỉ không nhớ câu đã hỏi
      }
      if (stop) return;
      const room = new Classroom(QUESTIONS, Date.now(), Math.random, used, banned);
      try { room.setRoseSettings(JSON.parse(localStorage.getItem('classroom.roseSettings') ?? 'null')); } catch { /* Dùng mặc định. */ }
      room.setFlowersSaved(flowersSaved);
      room.showBank = SHOW_BANK;
      room.weekLeader = weekTop.current[0] ? speakableName(weekTop.current[0].nickname) : '';
      roomRef.current = room;
      say(room.newRound(Date.now()));

      // Nhịp game: 5 lần/giây đẩy đồng hồ, có đổi thì vẽ lại và gửi ảnh chụp cho trang điều khiển
      let lastSent = 0;
      let lastTick = Date.now();
      timers.push(
        setInterval(() => {
          const now = Date.now();
          // cô đang đọc câu chính: dừng đồng hồ (vd đọc đề xong mới đếm 20 giây)
          if (mainSpeaking.current > 0) {
            room.hold(now - lastTick);
            dirty.current = true;
          }
          lastTick = now;
          say(room.tick(now));
          flushChatter(room, now);
          // game lớn: tích tắc 5 giây cuối như câu hỏi tiết học
          sfx.clock(room.showAsking() ? 'question' : room.phase, room.boardShown, room.phaseEndsAt, now);
          // nhạc nền EDM game lớn: cô đang đọc thì nhạc lùi xa cho rõ giọng; chờ trả lời thì sập sình, 5 giây cuối dồn dập
          const sh = room.show;
          const step = sh?.steps[sh.i]?.k;
          const busy = mainSpeaking.current > 0;
          sfx.music(sh?.kind ?? null, !sh || busy ? 0 : room.showAsking() ? (room.phaseEndsAt - now <= 5000 ? 2 : 1) : step === 'gather' || step === 'honor' ? 1 : 0);
          if (!dirty.current && now - lastSent < 1000) return;
          dirty.current = false;
          const v = { ...room.view(now), weekTop: weekTop.current, todayTop: dayBoard(todayTop.current, room.weekDelta), talkTop: dayBoard(talkTop.current, room.talkDelta) };
          sfx.watch(prevView, v);
          prevView = v;
          setView(v);
          if (now - lastSent >= 400) {
            lastSent = now;
            fetch('/api/game/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) }).catch(() => {});
          }
        }, 200),
        setInterval(() => say([room.share()]), GAME.shareReminderEveryMs),
        setInterval(save, 20_000),
      );
    })();

    window.addEventListener('beforeunload', save);
    return () => {
      stop = true;
      timers.forEach(clearInterval);
      window.removeEventListener('beforeunload', save);
    };
  }, []);

  return { status, view, lastGift, stageCount, channelName };
}

export type GameState = ReturnType<typeof useGame>;

// ['An', 'Bình', 'Chi'] -> 'bạn An, bạn Bình và bạn Chi'
function joinNames(names: string[]) {
  const spoken = names.map((n) => `bạn ${n}`);
  return spoken.length > 1 ? `${spoken.slice(0, -1).join(', ')} và ${spoken[spoken.length - 1]}` : spoken[0] ?? '';
}
