import type { ReactNode } from 'react';
import type { ScoreboardTeamView } from './scoreboardRuntime';
import './scoreboard-stage.css';

export function ScoreboardHeader({ title, round, clock, icon = '🌼' }: { title: string; round?: string; clock?: string; icon?: string }) {
  return <div className="scoreboard-ui-header">
    <span className="scoreboard-ui-header__icon" aria-hidden="true">{icon}</span>
    <span className="scoreboard-ui-header__title">{title}</span>
    {round && <span className="scoreboard-ui-header__round">{round}</span>}
    {clock && <span className="scoreboard-ui-header__clock">⏱ {clock}</span>}
  </div>;
}

export function ScoreboardQuestion({ category, prompt, letters, hint, children }: {
  category?: string; prompt: string; letters?: string[]; hint?: string; children?: ReactNode;
}) {
  return <section className="scoreboard-ui-question" aria-label="Câu hỏi hiện tại">
    {category && <span className="scoreboard-ui-question__category">{category}</span>}
    <div className="scoreboard-ui-question__prompt">{prompt}</div>
    {letters?.length ? <div className="scoreboard-ui-question__letters" aria-label="Các chữ cái">
      {letters.map((letter, index) => <span className="scoreboard-ui-question__letter" key={`${index}-${letter}`}>{letter}</span>)}
    </div> : null}
    {hint && <div className="scoreboard-ui-question__hint">💬 {hint}</div>}
    {children}
  </section>;
}

export function ScoreboardLeaderboard({ title = '🏆 Trả lời nhanh', rows }: {
  title?: string; rows: { name: string; points: number; avatar?: string }[];
}) {
  return <section className="scoreboard-ui-ranking" aria-label={title}>
    <h2 className="scoreboard-ui-ranking__title">{title}</h2>
    <ol className="scoreboard-ui-ranking__list">
      {rows.slice(0, 5).map((row, index) => <li className="scoreboard-ui-ranking__row" key={`${row.name}-${index}`}>
        <span className={`scoreboard-ui-ranking__medal scoreboard-ui-ranking__medal--${index + 1}`}>{index + 1}</span>
        {row.avatar ? <img className="scoreboard-ui-ranking__avatar" src={row.avatar} alt="" /> : <span className="scoreboard-ui-ranking__avatar scoreboard-ui-ranking__avatar--fallback" aria-hidden="true">🌟</span>}
        <span className="scoreboard-ui-ranking__name" title={row.name}>{row.name}</span>
        <b className="scoreboard-ui-ranking__points">+{row.points}</b>
      </li>)}
      {!rows.length && <li className="scoreboard-ui-ranking__empty">Đang chờ bạn đầu tiên ghi điểm ✨</li>}
    </ol>
  </section>;
}

export function ScoreboardTeamSummary({ teams, participantCount, participantCapacity }: {
  teams: ScoreboardTeamView[];
  participantCount: number;
  participantCapacity: number;
}) {
  return <div className="scoreboard-ui-teams" aria-label={`Ba bên, ${participantCount} trên ${participantCapacity} người đã đăng ký`}>
    <span className="scoreboard-ui-teams__total">3 BÊN · {participantCount}/{participantCapacity}</span>
    {teams.map((team) => <span className={`scoreboard-ui-teams__team${team.isFull ? ' scoreboard-ui-teams__team--full' : ''}`} key={team.id}>
      {team.name} {team.count}/{team.capacity} · {team.points}đ
    </span>)}
  </div>;
}
