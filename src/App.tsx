import { IS_STAGE } from './live/page';
import { StageFrame } from './live/StageFrame';
import { Dashboard } from './live/Dashboard';
import { useGame } from './game/useGame';
import { GameHost } from './game/GameHost';
import { GameControls } from './game/GameControls';
import { ScoreboardPreview } from './game/modes/scoreboard/ScoreboardPreview';
import { ScoreboardControls } from './game/modes/scoreboard/ScoreboardControls';
import { useScoreboardGame } from './game/modes/scoreboard/useScoreboardGame';
import { useGameSelection } from './game/useGameSelection';

export default function App() {
  if (window.location.pathname === '/scoreboard-preview') {
    return <div className="flex h-screen w-screen items-center justify-center bg-slate-950"><StageFrame><ScoreboardPreview /></StageFrame></div>;
  }
  return <RunningApp />;
}

function RunningApp() {
  const [gameId] = useGameSelection();
  const classroom = useGame(gameId === 'classroom');
  const scoreboard = useScoreboardGame(gameId === 'scoreboard');
  const runtime = { classroom, scoreboard };
  const active = gameId === 'scoreboard' ? scoreboard : classroom;

  // Trang cho TikTok LIVE Studio: chỉ có màn hình game
  if (IS_STAGE) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <StageFrame>
          <GameHost gameId={gameId} runtime={runtime} />
        </StageFrame>
      </div>
    );
  }

  // Trang điều khiển: xem trước = ảnh chụp từ trang stage, im lặng
  return (
    <Dashboard
      status={active.status}
      channelName={active.channelName}
      preview={
        <StageFrame maxHeight={window.innerHeight - 40}>
          <GameHost gameId={gameId} runtime={runtime} />
        </StageFrame>
      }
      extra={gameId === 'scoreboard'
        ? <ScoreboardControls view={scoreboard.view} />
        : <GameControls view={classroom.view} stageCount={classroom.stageCount} />}
    />
  );
}
