import type { CSSProperties, ReactNode } from 'react';
import './scoreboard-stage.css';

export interface ScoreboardStageFrameProps {
  /** Optional class for sizing or host-specific presentation. */
  className?: string;
  /** Game-owned content rendered in the upper chalkboard header. */
  boardHeader?: ReactNode;
  /** Game-owned question, answer tiles, or prompt content. */
  question?: ReactNode;
  /** Independent leaderboard / score summary slot. */
  leaderboard?: ReactNode;
  /** Student sprites and desk-level labels, layered over the desks. */
  classroom?: ReactNode;
  /** Teacher sprite, positioned beside the podium. */
  teacher?: ReactNode;
  /** Optional compact game status or round indicator. */
  status?: ReactNode;
  /** Optional host controls or compact HUD at the bottom edge. */
  bottomHud?: ReactNode;
  /** Override the generated background URL if the host serves assets elsewhere. */
  backgroundUrl?: string;
  /** Accessible description for the decorative classroom backdrop. */
  backgroundDescription?: string;
}

/**
 * Independent 9:16 presentation frame for the scoreboard game mode.
 * It owns only scenery and slot placement; game state, scoring, and interactions
 * remain with the caller. The frame scales from its 1080x1920 design canvas.
 */
export function ScoreboardStageFrame({
  className,
  boardHeader,
  question,
  leaderboard,
  classroom,
  teacher,
  status,
  bottomHud,
  backgroundUrl = '/assets/generated/scoreboard-classroom-v2.png',
  backgroundDescription = 'Lớp học minh họa với bảng xanh, bục giáo viên và các dãy bàn trống',
}: ScoreboardStageFrameProps) {
  const style = { '--scoreboard-background': `url("${backgroundUrl}")` } as CSSProperties;
  const classes = ['scoreboard-stage-frame', className].filter(Boolean).join(' ');

  return (
    <main className={classes} style={style} aria-label="Sân khấu game bảng điểm">
      <span className="scoreboard-stage-frame__description" role="img" aria-label={backgroundDescription} />
      <section className="scoreboard-stage-frame__board" aria-label="Khu vực bảng game">
        {boardHeader && <header className="scoreboard-stage-frame__board-header">{boardHeader}</header>}
        {question && <div className="scoreboard-stage-frame__question">{question}</div>}
        {leaderboard && <aside className="scoreboard-stage-frame__leaderboard" aria-label="Bảng điểm">{leaderboard}</aside>}
        {status && <div className="scoreboard-stage-frame__status">{status}</div>}
      </section>
      {teacher && <div className="scoreboard-stage-frame__teacher">{teacher}</div>}
      {classroom && <section className="scoreboard-stage-frame__classroom" aria-label="Học sinh trong lớp">{classroom}</section>}
      {bottomHud && <div className="scoreboard-stage-frame__bottom-hud">{bottomHud}</div>}
    </main>
  );
}

export default ScoreboardStageFrame;
