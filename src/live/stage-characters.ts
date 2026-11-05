export const STAGE_CHARACTERS_STORAGE_KEY = 'stage-characters';
export const STAGE_CHARACTERS_EVENT = 'stage-characters-change';

export const STAGE_STUDENT_SETS = [
  {
    id: 'classic',
    title: 'Học sinh hiện tại',
    description: 'Bộ nhân vật đang dùng',
    thumbnail: '/assets/nv/nu/01-dung.webp',
  },
  {
    id: 'spring',
    title: 'Học sinh áo khăn quàng',
    description: 'Tư thế ngồi và đi lên bảng',
    thumbnail: '/assets/nv/hoc-sinh-moi/nu/01-dung.webp',
  },
] as const;

export const STAGE_TEACHER_SETS = [
  {
    id: 'classic',
    title: 'Cô giáo hiện tại',
    description: 'Bộ nhân vật đang dùng',
    thumbnail: '/assets/nv/co-giao/01-dung.webp',
  },
  {
    id: 'spring',
    title: 'Cô giáo áo dài xanh',
    description: 'Cầm thước khi chỉ bảng',
    thumbnail: '/assets/nv/co-giao-moi/04-chi-phai.webp?v=2',
  },
  {
    id: 'chibi',
    title: 'Cô giáo chibi áo dài xanh',
    description: 'Tóc búi hoa, nét mặt đáng yêu',
    thumbnail: '/assets/nv/co-giao-chibi/01-dung.webp',
  },
] as const;

export type StageStudentSetId = (typeof STAGE_STUDENT_SETS)[number]['id'];
export type StageTeacherSetId = (typeof STAGE_TEACHER_SETS)[number]['id'];
export type StageCharacterSelection = { student: StageStudentSetId; teacher: StageTeacherSetId };

export const DEFAULT_STAGE_CHARACTERS: StageCharacterSelection = { student: 'classic', teacher: 'classic' };

export function normalizeStageCharacters(value: unknown): StageCharacterSelection {
  if (!value || typeof value !== 'object') return DEFAULT_STAGE_CHARACTERS;
  const selection = value as Record<string, unknown>;
  return {
    student: STAGE_STUDENT_SETS.find((set) => set.id === selection.student)?.id ?? 'classic',
    teacher: STAGE_TEACHER_SETS.find((set) => set.id === selection.teacher)?.id ?? 'classic',
  };
}

export function readStageCharacters(): StageCharacterSelection {
  try {
    return normalizeStageCharacters(JSON.parse(localStorage.getItem(STAGE_CHARACTERS_STORAGE_KEY) ?? 'null'));
  } catch {
    return DEFAULT_STAGE_CHARACTERS;
  }
}

export function saveStageCharacters(selection: StageCharacterSelection) {
  try {
    localStorage.setItem(STAGE_CHARACTERS_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // The in-memory event still updates the dashboard preview when storage is unavailable.
  }
  window.dispatchEvent(new Event(STAGE_CHARACTERS_EVENT));
}
