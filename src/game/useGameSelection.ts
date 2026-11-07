import { useEffect, useState } from 'react';
import { useLiveEvents } from '../live/useLiveEvents';
import type { ControlCommand } from '../live/types';
import { GAME_ID_EVENT, readGameId, saveGameId, type GameId } from './gameRegistry';

function gameIdFromControl(command: ControlCommand): GameId | null {
  if (command.action !== 'custom' || !command.text?.startsWith('game:')) return null;
  const id = command.text.slice('game:'.length);
  return id === 'scoreboard' || id === 'classroom' ? id : null;
}

/** Đồng bộ lựa chọn game giữa Dashboard, stage và các tab đang mở. */
export function useGameSelection(): [GameId, (id: GameId) => void] {
  const [gameId, setGameId] = useState<GameId>(readGameId);

  useLiveEvents({
    onControl: (command) => {
      const next = gameIdFromControl(command);
      if (next) {
        setGameId(next);
        try { localStorage.setItem('game.id', next); } catch { /* no-op */ }
      }
    },
  }, { trackStage: false });

  useEffect(() => {
    const onGameId = (event: Event) => setGameId((event as CustomEvent<GameId>).detail || readGameId());
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'game.id') setGameId(readGameId());
    };
    window.addEventListener(GAME_ID_EVENT, onGameId);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(GAME_ID_EVENT, onGameId);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return [gameId, saveGameId];
}
