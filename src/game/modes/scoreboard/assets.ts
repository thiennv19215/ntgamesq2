/** Asset riêng của game Bảng thi đấu; state/game logic không phụ thuộc vào manifest này. */
export const SCOREBOARD_BACKGROUND = '/assets/generated/scoreboard-classroom-v2.png';
export const SCOREBOARD_TEACHER = '/assets/nv/scoreboard/teacher-v2.png';

export const SCOREBOARD_STUDENTS = {
  seated: [
    '/assets/nv/scoreboard/students/seated-girl-01-v2.png',
    '/assets/nv/scoreboard/students/seated-girl-02-v2.png',
    '/assets/nv/scoreboard/students/seated-boy-01-v2.png',
  ],
  standing: [
    '/assets/nv/scoreboard/students/standing-girl-01-v2.png',
    '/assets/nv/scoreboard/students/standing-boy-01-v2.png',
    '/assets/nv/scoreboard/students/standing-boy-02-v2.png',
  ],
} as const;
