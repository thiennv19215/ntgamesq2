import { ScoreboardStageFrame } from './ScoreboardStageFrame';
import { ScoreboardHeader, ScoreboardLeaderboard, ScoreboardQuestion } from './ScoreboardUi';
import { SCOREBOARD_STUDENTS, SCOREBOARD_TEACHER } from './assets';

const names = ['Thảo Nhi', 'Minh Khang', 'Bảo An', 'Mít Ướt', 'Gia Hân', 'Tí Đô'];
const rowTops = [0, 148, 296, 444, 592];
const xPositions = [9, 31, 67, 89];

function StudentSample({ index, x, y }: { index: number; x: number; y: number }) {
  const src = SCOREBOARD_STUDENTS.seated[index % SCOREBOARD_STUDENTS.seated.length];
  return <div className="scoreboard-preview__student" style={{ left: `${x}%`, top: y }}>
    <img src={src} alt="" />
    <span>{names[(index + y) % names.length]}</span>
  </div>;
}

export function ScoreboardPreview() {
  const students = rowTops.flatMap((y, row) => xPositions.map((x, col) => ({ y, x, index: row * xPositions.length + col })));
  return <ScoreboardStageFrame
    className="scoreboard-preview"
    boardHeader={<ScoreboardHeader title="TIẾT TIẾNG ANH" round="Câu 3" clock="03:37" icon="🔤" />}
    question={<ScoreboardQuestion category="TỪ VỰNG" prompt="gõ cửa" letters={['K', 'N', 'O', 'C', 'K']} hint="Bình luận từ tiếng Anh đầy đủ!" />}
    leaderboard={<ScoreboardLeaderboard rows={[
      { name: 'Nguyễn Thùy Linh', points: 10 }, { name: 'Súp Cua', points: 9 }, { name: 'Klinh', points: 8 },
      { name: 'Tôi bị ngu', points: 7 }, { name: 'shroom', points: 6 },
    ]} />}
    teacher={<img src={SCOREBOARD_TEACHER} alt="Cô giáo" />}
    classroom={<div className="scoreboard-preview__seats">{students.map((student) => <StudentSample key={`${student.y}-${student.x}`} {...student} />)}</div>}
    bottomHud={<span className="scoreboard-preview__hud">✨ Cùng học vui, trả lời đúng để ghi điểm nhé! ✨</span>}
  />;
}
