import { GAME } from '../config';

/** Bố cục phòng học dọc 1080x1920. Tọa độ tính theo canvas sân khấu. */
export const CLASSROOM_LAYOUT = {
  width: 1080,
  height: 1920,
  seatScale: 1.16,
  studentWalkScale: 0.92,
  studentBodyScale: 0.78,
  walkerHeight: 200,
  studentSpriteHeight: 250,
  rows: [
    { y: 1060, x1: 60, x2: 1020, n: GAME.rowSeats[0], s: 1.16 },
    { y: 1205, x1: 60, x2: 1020, n: GAME.rowSeats[1], s: 1.16 },
    { y: 1350, x1: 60, x2: 1020, n: GAME.rowSeats[2], s: 1.16 },
    { y: 1495, x1: 60, x2: 1020, n: GAME.rowSeats[3], s: 1.16 },
    { y: 1640, x1: 60, x2: 1020, n: GAME.rowSeats[4], s: 1.16 },
  ],
  teamColors: ['#ef4444', '#3b82f6', '#16a34a', '#f59e0b'],
  teamIcons: ['🔴', '🔵', '🟢', '🟡'],
} as const;

// Alias giúp những phần sân khấu chưa chuyển sang cấu hình đối tượng dùng chung.
export const ROWS = CLASSROOM_LAYOUT.rows;
export const SEAT_SCALE = CLASSROOM_LAYOUT.seatScale;
export const STUDENT_WALK_SCALE = CLASSROOM_LAYOUT.studentWalkScale;
export const STUDENT_BODY_SCALE = CLASSROOM_LAYOUT.studentBodyScale;
export const WALKER_H = CLASSROOM_LAYOUT.walkerHeight;
export const SPRITE_H = CLASSROOM_LAYOUT.studentSpriteHeight;
export const TEAM_COLOR = CLASSROOM_LAYOUT.teamColors;
export const TEAM_ICON = CLASSROOM_LAYOUT.teamIcons;
