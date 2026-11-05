export const STAGE_BACKGROUND_STORAGE_KEY = 'stage-background';
export const STAGE_BACKGROUND_EVENT = 'stage-background-change';

export const STAGE_BACKGROUNDS = [
  {
    id: 'classic',
    title: 'Lớp hiện tại',
    description: 'Ánh nắng ấm',
    src: '/assets/bg/lop-hien-tai.webp',
    thumbnail: '/assets/bg/thumbs/lop-hien-tai.webp',
  },
  {
    id: 'morning',
    title: 'Nắng sớm',
    description: 'Vườn xanh ngoài cửa',
    src: '/assets/bg/lop-nang-som.webp',
    thumbnail: '/assets/bg/thumbs/lop-nang-som.webp',
  },
  {
    id: 'rainy',
    title: 'Mưa chiều',
    description: 'Lớp học ngày mưa',
    src: '/assets/bg/lop-mua-chieu.webp',
    thumbnail: '/assets/bg/thumbs/lop-mua-chieu.webp',
  },
  {
    id: 'spring',
    title: 'Nắng xuân',
    description: 'Lớp học mùa xuân',
    src: '/assets/bg/lop-mua-xuan.webp',
    thumbnail: '/assets/bg/thumbs/lop-mua-xuan.webp',
  },
  {
    id: 'chibi',
    title: 'Lớp học chibi',
    description: 'Nắng ấm, bàn ghế gỗ',
    src: '/assets/bg/lop-chibi.webp',
    thumbnail: '/assets/bg/thumbs/lop-chibi.webp',
  },
] as const;

export type StageBackgroundId = (typeof STAGE_BACKGROUNDS)[number]['id'];

export function readStageBackgroundId(): StageBackgroundId {
  try {
    const saved = localStorage.getItem(STAGE_BACKGROUND_STORAGE_KEY);
    const match = STAGE_BACKGROUNDS.find((background) => background.id === saved);
    if (match) return match.id;
  } catch {
    // Keep the default when browser storage is unavailable.
  }
  return 'classic';
}

export function getStageBackground(id: string | null | undefined) {
  return STAGE_BACKGROUNDS.find((background) => background.id === id) ?? STAGE_BACKGROUNDS[0];
}
