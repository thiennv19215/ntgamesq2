export type GameId = 'classroom' | 'scoreboard';
export type GameSceneId = 'classroom' | 'scoreboard';

export interface GameInitialState {
  gameId: GameId;
  phase: 'idle';
}

export interface GameModeDefinition {
  id: GameId;
  name: string;
  description: string;
  scene: GameSceneId;
  options: {
    background?: string;
    assetsPath: string;
  };
  createState: (now?: number) => GameInitialState;
}

/**
 * Registry duy nhất của các game thật. `stageLayouts` chỉ còn là cấu hình
 * trình bày của game lớp học; chọn entry ở đây mới đổi game/runtime.
 */
export const GAME_REGISTRY = {
  classroom: {
    id: 'classroom',
    name: 'Lớp học hiện tại',
    description: 'Cô giáo xáo chữ, cả lớp trả lời và ngồi vào lớp.',
    scene: 'classroom',
    options: { assetsPath: '/assets/nv/' },
    createState: () => ({ gameId: 'classroom', phase: 'idle' }),
  },
  scoreboard: {
    id: 'scoreboard',
    name: 'Bảng thi đấu',
    description: 'Câu hỏi và bảng xếp hạng riêng, dùng art direction scoreboard.',
    scene: 'scoreboard',
    options: {
      background: '/assets/generated/scoreboard-classroom-v2.png',
      assetsPath: '/assets/nv/scoreboard/',
    },
    createState: () => ({ gameId: 'scoreboard', phase: 'idle' }),
  },
} satisfies Record<GameId, GameModeDefinition>;

export function getGameDefinition(id: GameId): GameModeDefinition {
  return GAME_REGISTRY[id] ?? GAME_REGISTRY.classroom;
}

export const GAME_ID_KEY = 'game.id';
export const GAME_ID_EVENT = 'game-id-change';

export function readGameId(): GameId {
  try {
    return localStorage.getItem(GAME_ID_KEY) === 'scoreboard' ? 'scoreboard' : 'classroom';
  } catch {
    return 'classroom';
  }
}

export function saveGameId(id: GameId): void {
  try {
    localStorage.setItem(GAME_ID_KEY, id);
  } catch {
    // Vẫn đổi được runtime nếu localStorage bị chặn.
  }
  window.dispatchEvent(new CustomEvent<GameId>(GAME_ID_EVENT, { detail: id }));
}
