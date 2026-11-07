export const STAGE_LAYOUT_KEY = 'stage.layout';
export const STAGE_LAYOUT_EVENT = 'stage-layout-change';

export type StageLayout = 'classroom' | 'scoreboard';

export function readStageLayout(): StageLayout {
  try {
    return localStorage.getItem(STAGE_LAYOUT_KEY) === 'scoreboard' ? 'scoreboard' : 'classroom';
  } catch {
    return 'classroom';
  }
}

export function saveStageLayout(layout: StageLayout): void {
  try {
    localStorage.setItem(STAGE_LAYOUT_KEY, layout);
  } catch {
    // Màn hiện tại vẫn đổi được nếu localStorage bị chặn.
  }
  window.dispatchEvent(new CustomEvent<StageLayout>(STAGE_LAYOUT_EVENT, { detail: layout }));
}
