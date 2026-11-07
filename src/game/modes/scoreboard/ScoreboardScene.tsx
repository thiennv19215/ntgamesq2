import { ScoreboardStageFrame } from './ScoreboardStageFrame';
import { ScoreboardHeader, ScoreboardLeaderboard, ScoreboardQuestion, ScoreboardTeamSummary } from './ScoreboardUi';
import { SCOREBOARD_STUDENTS, SCOREBOARD_TEACHER } from './assets';
import { ScoreboardPreview } from './ScoreboardPreview';
import type { ScoreboardGameState } from './useScoreboardGame';
import type { ScoreboardPlayer } from './scoreboardRuntime';

// The seated sprites are taller than the desk lip in the background. Keep their
// bottoms on the same desk lines while giving the upper body enough room to read
// on a 1080x1920 stage.
const rowTops = [2, 19, 36, 53, 70];
const xPositions = [9, 31, 67, 89];

function ScoreboardStudents({ players }: { players: ScoreboardPlayer[] }) {
  return <div className="scoreboard-live__seats">
    {rowTops.flatMap((top, row) => xPositions.map((left, col) => {
      const index = row * xPositions.length + col;
      const player = players[index];
      const asset = SCOREBOARD_STUDENTS.seated[index % SCOREBOARD_STUDENTS.seated.length];
      return <div className="scoreboard-live__student" key={`${row}-${col}`} style={{ left: `${left}%`, top: `${top}%` }}>
        <img src={asset} alt="" />
        {player && <span title={`${player.nickname} · Bên ${player.team}`}>B{player.team} · {player.nickname}</span>}
      </div>;
    }))}
  </div>;
}

export function ScoreboardScene({ game }: { game: ScoreboardGameState }) {
  const view = game.view;
  if (!view) return <ScoreboardPreview />;
  return <ScoreboardStageFrame
    className="scoreboard-live"
    boardHeader={<ScoreboardHeader title={view.channelName} round={`Câu ${view.qNo}/${view.total}`} clock={`${Math.max(0, Math.ceil((view.phaseEndsAt - Date.now()) / 1000))}`} icon="📊" />}
    question={<ScoreboardQuestion category={view.category} prompt={view.prompt} letters={view.letters} hint={view.hint} />}
    leaderboard={<ScoreboardLeaderboard rows={view.players.map((player) => ({ name: player.nickname, points: player.points, avatar: player.avatar }))} />}
    status={<div className="scoreboard-live__status-stack">
      <span className="scoreboard-live__status">{view.message}</span>
      <ScoreboardTeamSummary teams={view.teams} participantCount={view.participantCount} participantCapacity={view.participantCapacity} />
    </div>}
    teacher={<img src={SCOREBOARD_TEACHER} alt="Cô giáo" />}
    classroom={<ScoreboardStudents players={view.players} />}
    bottomHud={<div className="scoreboard-live__hud-row">
      <span className="scoreboard-live__hud">✨ Trả lời đúng để ghi điểm và leo bảng xếp hạng! · {view.registrationMessage}</span>
    </div>}
  />;
}
