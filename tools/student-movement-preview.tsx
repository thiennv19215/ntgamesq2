/** Local visual fixture only: no live hooks, event emitting, API calls, or persistence. */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GameStage } from '../src/game/GameStage';
import { StageFrame } from '../src/live/StageFrame';
import { Classroom } from '../src/game/quiz';
import { GAME } from '../src/game/config';
import { QUESTIONS } from '../src/game/bank';
import type { GameState, StageView } from '../src/game/useGame';
import '../src/index.css';

const person = (i: number) => ({ username: `preview-${i}`, nickname: i === 0 ? 'Bạn ngủ gật' : i === 40 ? 'Bạn hàng chờ' : `Học sinh ${i}`, spoken: `Học sinh ${i}`, avatar: '' });
function setup(leavers = 1, punish = false) {
  const deadline = Date.now() + 1800;
  const ask = deadline - GAME.questionSec * 1000;
  const start = ask - GAME.introSec * 1000;
  const oldTeam = GAME.teamPickSec;
  GAME.teamPickSec = 0;
  const room = new Classroom(QUESTIONS, start);
  room.newRound(start);
  for (let i = 0; i < GAME.seats; i++) room.enter(person(i), start);
  room.view(start); // baseline positions never replay historical entries
  room.tick(ask);
  room.showBoard(ask);
  for (let i = leavers; i < GAME.seats; i++) room.chat({ ...person(i), comment: i === leavers ? room.q!.answer : 'xin chào '.repeat(40), createTime: ask + 1000 }, ask + 1000);
  if (punish) for (let i = 0; i < Math.min(leavers, GAME.standMax); i++) room.chat({ ...person(i), comment: 'X'.repeat(room.answerLetters.length), createTime: ask + 1100 }, ask + 1100);
  for (let i = GAME.seats; i < GAME.seats + leavers; i++) room.enter(person(i), ask + 2000);
  GAME.teamPickSec = oldTeam;
  return { room, deadline };
}
function Preview() {
  const [run, setRun] = useState(0);
  const [perf, setPerf] = useState({ fps: 0, worst: 0, longFrames: 0, motionMin: 0, peakActors: 0, motionSlowFrames: 0 });
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let start = previous;
    let count = 0;
    let worst = 0;
    let longFrames = 0;
    let motionMin = Infinity;
    let peakActors = 0;
    let motionSlowFrames = 0;
    const sample = (now: number) => {
      const gap = now - previous;
      previous = now;
      worst = Math.max(worst, gap);
      if (gap > 50) longFrames++;
      count++;
      if (now - start >= 1000) {
        const fps = Math.round(count * 1000 / (now - start));
        const actors = document.querySelectorAll('[data-student-movement]').length;
        if (actors > 0) { motionMin = Math.min(motionMin, fps); peakActors = Math.max(peakActors, actors); motionSlowFrames += longFrames; }
        setPerf({ fps, worst: Math.round(worst), longFrames, motionMin: Number.isFinite(motionMin) ? motionMin : 0, peakActors, motionSlowFrames });
        start = now; count = 0; worst = 0; longFrames = 0;
      }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, [run]);
  const [model] = useState(() => ({ current: setup() }));
  const [view, setView] = useState<StageView>(() => ({ ...model.current.room.view(Date.now()), weekTop: [], todayTop: [], talkTop: [] }));
  useEffect(() => {
    const update = () => {
      const { room } = model.current;
      const now = Date.now();
      if (room.phase !== 'reveal') room.tick(now);
      if (room.phase === 'bonus') room.tick(room.phaseEndsAt); // stress preview skips the empty-answer bonus wait
      setView({ ...room.view(now), weekTop: [], todayTop: [], talkTop: [] });
    };
    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [run]);
  const reset = (leavers = 1, punish = false) => { model.current = setup(leavers, punish); setRun((n) => n + 1); };
  const game = { view, channelName: GAME.defaultChannelName, lastGift: null } as GameState;
  return <div className="flex h-screen items-center justify-center bg-[#1c1715]">
    <aside className="fixed left-3 top-3 z-[100] max-w-[245px] rounded-xl bg-white p-3 text-sm text-stone-800 shadow-lg">
      <b>Thử chuyển động riêng</b><p className="my-2">40 học sinh + 1 bạn chờ. Khi hết câu, bạn ngủ đi ra, người chờ vào đúng ghế trống.</p>
      <button onClick={() => reset()} className="rounded-lg bg-amber-700 px-3 py-2 font-bold text-white">Chạy lại chuyển động</button>
      <button onClick={() => reset(GAME.seats)} className="mt-2 rounded-lg bg-stone-700 px-3 py-2 font-bold text-white">Thử cả lớp cùng ra / vào</button>
      <button onClick={() => reset(GAME.standMax, true)} className="mt-2 rounded-lg bg-rose-700 px-3 py-2 font-bold text-white">Thử học sinh lên đứng bảng</button>
      <button disabled={!view.punished.length} onClick={() => { for (const s of model.current.room.students.values()) s.standLeft = 0; }} className="mt-2 rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white disabled:opacity-40">Cho học sinh về ghế</button>
      <button onClick={() => { const entries = model.current.room.seats(); entries.forEach((s, i) => { s.score = (i + 1) * 10; }); }} className="mt-2 rounded-lg bg-indigo-700 px-3 py-2 font-bold text-white">Thử đổi thứ hạng cả lớp</button>
      <p className="mt-2">{Object.entries(view.movements.reduce<Record<string, number>>((counts, m) => { counts[m.kind] = (counts[m.kind] ?? 0) + 1; return counts; }, {})).map(([kind, count]) => `${count} bạn: ${kind}`).join(' · ') || 'Đang chờ chốt câu'}</p>
      <p className="mt-2" aria-live="off">{perf.fps} FPS · khung chậm nhất {perf.worst} ms · {perf.longFrames} khung trên 50 ms</p>
      <p className="mt-1" data-fps-summary>Trong chuyển động: thấp nhất {perf.motionMin || '—'} FPS · tối đa {perf.peakActors} nhân vật · {perf.motionSlowFrames} khung trên 50 ms</p>
      <small>Không kết nối TikTok hoặc ghi dữ liệu thật.</small>
    </aside>
    <StageFrame><GameStage game={game} /></StageFrame>
  </div>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Preview />);
