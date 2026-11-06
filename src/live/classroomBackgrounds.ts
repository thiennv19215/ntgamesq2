import type { CSSProperties } from 'react';

export const CLASSROOM_BACKGROUND_KEY = 'classroom.background';
export const CLASSROOM_BACKGROUND_EVENT = 'classroom-background-change';

export type ClassroomBackground = {
  id: string;
  label: string;
  color: string;
  image?: string;
  overlay?: string;
};

const CLASSROOM_IMAGE = '/assets/generated/classroom-blossom-clean-v5.png';

/**
 * Các preset chỉ thay lớp nền/bối cảnh. Toàn bộ bảng, ghế, nhân vật và logic
 * game nằm ở các lớp con nên không bị ảnh hưởng khi đổi preset.
 */
export const CLASSROOM_BACKGROUNDS: ClassroomBackground[] = [
  { id: 'spring', label: 'Hoa xuân', color: '#c8642a', image: CLASSROOM_IMAGE },
  { id: 'sunny', label: 'Nắng vàng', color: '#d97706', image: CLASSROOM_IMAGE, overlay: 'rgba(255, 204, 112, .24)' },
  { id: 'calm', label: 'Xanh dịu', color: '#2d6474', image: CLASSROOM_IMAGE, overlay: 'rgba(72, 157, 180, .28)' },
  { id: 'plain', label: 'Nền trơn ấm', color: '#c8793d' },
  { id: 'modern', label: 'Phòng sáng', color: '#e7cda8', image: '/assets/generated/classroom-modern-v1.png' },
  { id: 'wood', label: 'Phòng gỗ', color: '#a85724', image: '/assets/generated/classroom-wood-v1.png' },
  { id: 'evening', label: 'Phòng buổi tối', color: '#23344f', image: '/assets/generated/classroom-evening-v1.png' },
  { id: 'tet', label: 'Mùa xuân Tết Việt', color: '#c85b25', image: '/assets/generated/classroom-tet-v1.png' },
];

export function getClassroomBackground(id: string | null | undefined): ClassroomBackground {
  return CLASSROOM_BACKGROUNDS.find((background) => background.id === id) ?? CLASSROOM_BACKGROUNDS[0];
}

export function readClassroomBackgroundId(): string {
  try {
    return getClassroomBackground(localStorage.getItem(CLASSROOM_BACKGROUND_KEY)).id;
  } catch {
    return CLASSROOM_BACKGROUNDS[0].id;
  }
}

export function classroomBackgroundStyle(id: string, size: CSSProperties['backgroundSize'] = '1080px auto'): CSSProperties {
  const background = getClassroomBackground(id);
  const image = background.image
    ? background.overlay
      ? `linear-gradient(${background.overlay}, ${background.overlay}), url("${background.image}")`
      : `url("${background.image}")`
    : undefined;
  return {
    backgroundColor: background.color,
    backgroundImage: image,
    backgroundPosition: 'top center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: size,
    backgroundBlendMode: background.overlay ? 'multiply' : undefined,
  };
}

export function saveClassroomBackground(id: string) {
  const selected = getClassroomBackground(id).id;
  try {
    localStorage.setItem(CLASSROOM_BACKGROUND_KEY, selected);
  } catch {
    // localStorage có thể bị chặn ở chế độ riêng tư; màn hiện tại vẫn đổi được.
  }
  window.dispatchEvent(new CustomEvent(CLASSROOM_BACKGROUND_EVENT, { detail: selected }));
}
