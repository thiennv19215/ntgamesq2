import { useEffect, useRef, useState } from 'react';
import { useLiveEvents } from '../../../live/useLiveEvents';
import type { LiveStatus } from '../../../live/types';
import { IS_STAGE } from '../../../live/page';
import { voice } from '../../../live/voice';
import { GAME } from '../../config';
import { scoreboardTeamFromComment, ScoreboardRuntime, type ScoreboardView } from './scoreboardRuntime';

interface ScoreboardEventPerson {
  username: string;
  nickname: string;
  avatar: string;
}

// Keep the query consistent with the classroom game: `?mute=1` is useful when
// composing a stage preview in LIVE Studio. We do not change voice.enabled here;
// useLiveEvents owns that flag for the active stage speaker.
const MUTED = new URLSearchParams(window.location.search).get('mute') === '1';

interface ScoreboardVoiceMarker {
  phase: ScoreboardView['phase'];
  qNo: number;
  correctCount: number;
}

function withoutCountdown(message: string): string {
  return message.replace(/\s·\s\d+s$/u, '');
}

function announceScoreboardView(view: ScoreboardView, previous: ScoreboardVoiceMarker | null): void {
  if (MUTED || !IS_STAGE) return;

  if (!previous) {
    voice.say('Chào mừng đến với Bảng thi đấu. Các đội hãy sẵn sàng nhé!', true);
    return;
  }

  if (view.phase === 'intro' && previous.phase !== 'intro') {
    voice.say('Vòng thi mới bắt đầu. Các đội hãy sẵn sàng!', true);
    return;
  }

  const hasNewCorrectAnswer = view.correctCount > previous.correctCount;
  if (hasNewCorrectAnswer) {
    voice.say(withoutCountdown(view.message), true);
  }

  if (view.phase === 'results' && previous.phase === 'question') {
    voice.say(
      hasNewCorrectAnswer
        ? 'Đã đủ lượt trả lời. Chuyển sang phần kết quả.'
        : withoutCountdown(view.message),
      true,
    );
    return;
  }

  if (view.phase === 'question' && (previous.phase !== 'question' || previous.qNo !== view.qNo)) {
    voice.say(`Câu ${view.qNo}: ${view.prompt}. ${view.hint}`, true);
  }
}

export interface ScoreboardGameState {
  status: LiveStatus | null;
  view: ScoreboardView | null;
  stageCount: number;
  channelName: string;
}

/** Hook runtime riêng cho scoreboard. Khi không được chọn, nó không khởi tạo game. */
export function useScoreboardGame(active: boolean): ScoreboardGameState {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [view, setView] = useState<ScoreboardView | null>(null);
  const [stageCount, setStageCount] = useState(0);
  const [channelName, setChannelName] = useState(GAME.defaultChannelName);
  const runtimeRef = useRef<ScoreboardRuntime | null>(null);
  const voiceMarkerRef = useRef<ScoreboardVoiceMarker | null>(null);

  useLiveEvents({
    onStatus: setStatus,
    onSpeaker: (speaker) => setStageCount(speaker.count),
    onControl: (command) => {
      if (!active) return;
      if (command.action === 'setName' && command.text) {
        setChannelName(command.text);
        runtimeRef.current?.setChannelName(command.text);
      }
      if (command.action === 'reset' || (command.action === 'custom' && command.text === 'newRound')) {
        if (IS_STAGE) voice.stop();
        voiceMarkerRef.current = null;
        runtimeRef.current?.reset(Date.now());
      }
    },
    onMember: (person) => {
      if (active) runtimeRef.current?.enter(person as ScoreboardEventPerson);
    },
    onChat: (event) => {
      if (!active || !runtimeRef.current) return;
      const person: ScoreboardEventPerson = {
        username: event.username,
        nickname: event.nickname,
        avatar: event.avatar,
      };
      const team = scoreboardTeamFromComment(event.comment);
      if (team) {
        runtimeRef.current.chooseTeam(person, team);
        return;
      }
      runtimeRef.current.enter(person);
      runtimeRef.current.answer(event.username, event.comment, Date.now());
    },
    onGameState: (snapshot) => {
      if (!IS_STAGE && active && snapshot?.gameId === 'scoreboard') setView(snapshot as ScoreboardView);
    },
  }, { trackStage: active });

  useEffect(() => {
    runtimeRef.current = null;
    setView(null);
    voiceMarkerRef.current = null;
    if (!active || !IS_STAGE) return;

    voice.volume = MUTED ? 0 : 1;
    const runtime = new ScoreboardRuntime(Date.now(), channelName);
    runtimeRef.current = runtime;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const now = Date.now();
      runtime.tick(now);
      const next = runtime.view(now);
      setView(next);
      fetch('/api/game/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }).catch(() => {});
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      voice.stop();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, [active]);

  // `view` is refreshed every 200ms for the clock. Announce only stable game
  // transitions so the queue never receives the same line on every tick.
  useEffect(() => {
    if (!active || !IS_STAGE || !view) return;
    const previous = voiceMarkerRef.current;
    announceScoreboardView(view, previous);
    voiceMarkerRef.current = { phase: view.phase, qNo: view.qNo, correctCount: view.correctCount };
  }, [active, view]);

  return { status, view, stageCount, channelName };
}
