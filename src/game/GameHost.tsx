import type { ComponentType } from 'react';
import { GameStage } from './GameStage';
import type { GameState } from './useGame';
import { getGameDefinition, type GameId } from './gameRegistry';
import { ScoreboardScene } from './modes/scoreboard/ScoreboardScene';
import type { ScoreboardGameState } from './modes/scoreboard/useScoreboardGame';

export interface GameHostRuntime {
  classroom: GameState;
  scoreboard: ScoreboardGameState;
}

interface SceneProps {
  runtime: GameHostRuntime;
}

const SCENES: Record<'classroom' | 'scoreboard', ComponentType<SceneProps>> = {
  classroom: ({ runtime }) => <GameStage game={runtime.classroom} />,
  scoreboard: ({ runtime }) => <ScoreboardScene game={runtime.scoreboard} />,
};

/** Stage host chỉ tra registry rồi chuyển tiếp tới scene của game đã chọn. */
export function GameHost({ gameId, runtime }: { gameId: GameId; runtime: GameHostRuntime }) {
  const Scene = SCENES[getGameDefinition(gameId).scene];
  return <Scene runtime={runtime} />;
}
