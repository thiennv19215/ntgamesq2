import { useEffect, useState, type ReactNode } from 'react';
import { STAGE_H, STAGE_W } from './page';
import { CLASSROOM_BACKGROUND_EVENT, classroomBackgroundStyle, readClassroomBackgroundId } from './classroomBackgrounds';

/** Khung 1080x1920 tự co giãn vừa cửa sổ. Bên trong cứ vẽ theo pixel 1080x1920. */
export function StageFrame({ children, maxHeight }: { children: ReactNode; maxHeight?: number }) {
  const [scale, setScale] = useState(1);
  const [backgroundId, setBackgroundId] = useState(readClassroomBackgroundId);
  useEffect(() => {
    const fit = () => {
      const h = Math.min(window.innerHeight, maxHeight ?? Infinity);
      // Vừa đúng vùng hiển thị; phóng cô/bảng riêng để không cắt mép sân khấu.
      setScale(Math.min(window.innerWidth / STAGE_W, h / STAGE_H));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [maxHeight]);

  useEffect(() => {
    const update = (event: Event) => {
      const custom = event as CustomEvent<string>;
      setBackgroundId(custom.detail || readClassroomBackgroundId());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'classroom.background') setBackgroundId(readClassroomBackgroundId());
    };
    window.addEventListener(CLASSROOM_BACKGROUND_EVENT, update);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CLASSROOM_BACKGROUND_EVENT, update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <div style={{ width: STAGE_W * scale, height: STAGE_H * scale }} className="relative overflow-hidden">
      <div
        className="stage-bg absolute left-0 top-0"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left', ...classroomBackgroundStyle(backgroundId) }}
      >
        {children}
      </div>
    </div>
  );
}
