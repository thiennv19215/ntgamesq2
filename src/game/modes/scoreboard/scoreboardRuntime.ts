export type ScoreboardPhase = 'intro' | 'question' | 'results';

export const SCOREBOARD_TEAM_IDS = [1, 2, 3] as const;
export type ScoreboardTeamId = (typeof SCOREBOARD_TEAM_IDS)[number];
export const SCOREBOARD_TEAM_CAPACITY = 10;
export const SCOREBOARD_MAX_PLAYERS = SCOREBOARD_TEAM_IDS.length * SCOREBOARD_TEAM_CAPACITY;

export interface ScoreboardPlayer {
  username: string;
  nickname: string;
  avatar: string;
  points: number;
  team: ScoreboardTeamId;
}

export interface ScoreboardPlayerInput {
  username: string;
  nickname: string;
  avatar: string;
}

export interface ScoreboardTeamView {
  id: ScoreboardTeamId;
  name: string;
  count: number;
  points: number;
  capacity: number;
  isFull: boolean;
}

export interface ScoreboardRegistrationResult {
  accepted: boolean;
  status: 'registered' | 'already-registered' | 'moved' | 'full';
  team?: ScoreboardTeamId;
  message: string;
}

export interface ScoreboardView {
  gameId: 'scoreboard';
  channelName: string;
  round: number;
  qNo: number;
  total: number;
  phase: ScoreboardPhase;
  category: string;
  prompt: string;
  answer: string;
  letters: string[];
  hint: string;
  phaseEndsAt: number;
  players: ScoreboardPlayer[];
  teams: ScoreboardTeamView[];
  participantCount: number;
  participantCapacity: number;
  registrationMessage: string;
  correctCount: number;
  message: string;
}

interface ScoreboardQuestion {
  category: string;
  prompt: string;
  answer: string;
  hint: string;
}

const QUESTIONS: ScoreboardQuestion[] = [
  { category: 'TỪ VỰNG', prompt: 'gõ cửa', answer: 'knock', hint: 'Bình luận từ tiếng Anh đầy đủ!' },
  { category: 'ĐỐ VUI', prompt: 'Con gì luôn đi sau bạn?', answer: 'cái bóng', hint: 'Có nắng mới thấy.' },
  { category: 'ĐỜI SỐNG', prompt: 'Thứ gì càng rửa càng bẩn?', answer: 'nước', hint: 'Dùng để rửa mọi thứ.' },
  { category: 'TIẾNG VIỆT', prompt: 'Mẹ của mẹ gọi là gì?', answer: 'bà ngoại', hint: 'Một cách gọi rất thân thương.' },
];

const INTRO_MS = 2_500;
const QUESTION_MS = 18_000;
const RESULTS_MS = 2_500;
const TEAM_COMMAND_RE = /^(?:bên|ben|đội|doi|tổ|to|team)\s*([123])$/u;

const normalize = (value: string) => value.trim().toLocaleLowerCase('vi').replace(/[!?.,:]/g, '').replace(/\s+/g, ' ');

/** Nhận comment "bên 1", "bên 2" hoặc "bên 3" (có thể gõ không dấu). */
export function scoreboardTeamFromComment(comment: string): ScoreboardTeamId | null {
  const match = TEAM_COMMAND_RE.exec(normalize(comment));
  if (!match) return null;
  return Number(match[1]) as ScoreboardTeamId;
}

/** Runtime độc lập của game scoreboard; không dùng Classroom/quiz.ts. */
export class ScoreboardRuntime {
  private readonly playersById = new Map<string, ScoreboardPlayer>();
  private readonly answered = new Set<string>();
  private channelName: string;
  private questionIndex = 0;
  private phase: ScoreboardPhase = 'intro';
  private phaseEndsAt: number;
  private correctCount = 0;
  private message = 'Chuẩn bị vào vòng thi!';
  private registrationNotice = 'Chưa có người chơi. Tự động chia đều vào 3 bên.';

  constructor(now: number, channelName = 'LỚP HỌC CHỮ') {
    this.channelName = channelName;
    this.phaseEndsAt = now + INTRO_MS;
  }

  setChannelName(name: string): void {
    this.channelName = name;
  }

  /** Người mới được tự xếp vào bên đang ít người nhất, tối đa 10 người/bên. */
  enter(player: ScoreboardPlayerInput): ScoreboardRegistrationResult {
    return this.register(player);
  }

  /** Comment chọn bên có thể đăng ký người mới hoặc chuyển bên nếu bên đích còn chỗ. */
  chooseTeam(player: ScoreboardPlayerInput, team: ScoreboardTeamId): ScoreboardRegistrationResult {
    const username = player.username.trim();
    const existing = this.playersById.get(username);
    if (existing) {
      existing.nickname = player.nickname || existing.nickname;
      existing.avatar = player.avatar || existing.avatar;
      if (existing.team === team) {
        const message = `${existing.nickname} đã ở Bên ${team}.`;
        this.registrationNotice = message;
        return { accepted: true, status: 'already-registered', team, message };
      }
      if (this.teamCount(team) >= SCOREBOARD_TEAM_CAPACITY) {
        const message = `Bên ${team} đã đủ ${SCOREBOARD_TEAM_CAPACITY} người, chưa thể chuyển bên.`;
        this.registrationNotice = message;
        return { accepted: false, status: 'full', team, message };
      }
      existing.team = team;
      const message = `${existing.nickname} đã chuyển sang Bên ${team}.`;
      this.registrationNotice = message;
      return { accepted: true, status: 'moved', team, message };
    }
    return this.register(player, team);
  }

  answer(username: string, comment: string, now: number): void {
    if (this.phase !== 'question' || this.answered.has(username)) return;
    const player = this.playersById.get(username);
    if (!player || normalize(comment) !== normalize(QUESTIONS[this.questionIndex].answer)) return;
    this.answered.add(username);
    const points = Math.max(3, 10 - this.correctCount * 2);
    player.points += points;
    this.correctCount++;
    this.message = `${player.nickname} · Bên ${player.team} trả lời đúng! +${points} điểm`;
    if (this.correctCount >= 5) {
      this.phase = 'results';
      this.phaseEndsAt = now + RESULTS_MS;
    }
  }

  reset(now: number): void {
    this.questionIndex = 0;
    this.phase = 'intro';
    this.phaseEndsAt = now + INTRO_MS;
    this.answered.clear();
    this.correctCount = 0;
    this.message = 'Chuẩn bị vào vòng thi!';
    this.registrationNotice = `${this.playersById.size}/${SCOREBOARD_MAX_PLAYERS} người giữ nguyên bên đã chọn.`;
    for (const player of this.playersById.values()) player.points = 0;
  }

  tick(now: number): void {
    if (now < this.phaseEndsAt) return;
    if (this.phase === 'intro') {
      this.phase = 'question';
      this.phaseEndsAt = now + QUESTION_MS;
      this.answered.clear();
      this.correctCount = 0;
      this.message = 'Gõ đáp án vào bình luận · nhanh nhất được nhiều điểm hơn';
      return;
    }
    if (this.phase === 'question') {
      this.phase = 'results';
      this.phaseEndsAt = now + RESULTS_MS;
      this.message = this.correctCount ? 'Hết giờ! Xem bảng xếp hạng.' : 'Chưa có đáp án đúng, thử lại ở câu sau nhé.';
      return;
    }
    this.questionIndex = (this.questionIndex + 1) % QUESTIONS.length;
    this.phase = 'question';
    this.phaseEndsAt = now + QUESTION_MS;
    this.answered.clear();
    this.correctCount = 0;
    this.message = 'Gõ đáp án vào bình luận · nhanh nhất được nhiều điểm hơn';
  }

  view(now: number): ScoreboardView {
    const question = QUESTIONS[this.questionIndex];
    const players = [...this.playersById.values()].sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname, 'vi'));
    const teams = SCOREBOARD_TEAM_IDS.map((id) => {
      const members = players.filter((player) => player.team === id);
      return {
        id,
        name: `Bên ${id}`,
        count: members.length,
        points: members.reduce((sum, player) => sum + player.points, 0),
        capacity: SCOREBOARD_TEAM_CAPACITY,
        isFull: members.length >= SCOREBOARD_TEAM_CAPACITY,
      };
    });
    const full = players.length >= SCOREBOARD_MAX_PLAYERS;
    const registrationHint = full
      ? `Đã đủ ${SCOREBOARD_MAX_PLAYERS} người.`
      : 'Gõ “bên 1”, “bên 2” hoặc “bên 3” để chọn bên.';
    return {
      gameId: 'scoreboard',
      channelName: this.channelName,
      round: 1,
      qNo: this.questionIndex + 1,
      total: QUESTIONS.length,
      phase: this.phase,
      category: question.category,
      prompt: this.phase === 'intro' ? 'Sẵn sàng thi đấu!' : question.prompt,
      answer: question.answer,
      letters: [...question.answer].map((letter, index) => this.phase === 'intro' ? '?' : index % 3 === 0 ? letter.toUpperCase() : '•'),
      hint: this.phase === 'intro' ? 'Câu hỏi sẽ hiện sau ít giây.' : question.hint,
      phaseEndsAt: this.phaseEndsAt,
      players: players.slice(0, SCOREBOARD_MAX_PLAYERS),
      teams,
      participantCount: players.length,
      participantCapacity: SCOREBOARD_MAX_PLAYERS,
      registrationMessage: `${this.registrationNotice} · ${players.length}/${SCOREBOARD_MAX_PLAYERS} người · ${registrationHint}`,
      correctCount: this.correctCount,
      message: `${this.message} · ${Math.max(0, Math.ceil((this.phaseEndsAt - now) / 1000))}s`,
    };
  }

  private register(player: ScoreboardPlayerInput, preferredTeam?: ScoreboardTeamId): ScoreboardRegistrationResult {
    const username = player.username.trim();
    if (!username) return { accepted: false, status: 'full', message: 'Thiếu tài khoản người chơi.' };
    const existing = this.playersById.get(username);
    if (existing) {
      existing.nickname = player.nickname || existing.nickname;
      existing.avatar = player.avatar || existing.avatar;
      return { accepted: true, status: 'already-registered', team: existing.team, message: `${existing.nickname} đã có trong ván.` };
    }

    const team = preferredTeam ?? this.leastPopulatedTeam();
    if (!team) {
      const message = `Đã đủ ${SCOREBOARD_MAX_PLAYERS} người tham gia. Ván này không nhận thêm người.`;
      this.registrationNotice = message;
      return { accepted: false, status: 'full', message };
    }
    if (preferredTeam && this.teamCount(preferredTeam) >= SCOREBOARD_TEAM_CAPACITY) {
      const message = `Bên ${preferredTeam} đã đủ ${SCOREBOARD_TEAM_CAPACITY} người.`;
      this.registrationNotice = message;
      return { accepted: false, status: 'full', team: preferredTeam, message };
    }
    const registered = { ...player, username, points: 0, team } satisfies ScoreboardPlayer;
    this.playersById.set(username, registered);
    const message = `${registered.nickname || username} vào Bên ${team} (${this.teamCount(team)}/${SCOREBOARD_TEAM_CAPACITY}).`;
    this.registrationNotice = message;
    return { accepted: true, status: 'registered', team, message };
  }

  private teamCount(team: ScoreboardTeamId): number {
    let count = 0;
    for (const player of this.playersById.values()) if (player.team === team) count++;
    return count;
  }

  private leastPopulatedTeam(): ScoreboardTeamId | null {
    const team = SCOREBOARD_TEAM_IDS
      .map((id) => ({ id, count: this.teamCount(id) }))
      .filter((entry) => entry.count < SCOREBOARD_TEAM_CAPACITY)
      .sort((a, b) => a.count - b.count || a.id - b.id)[0];
    return team?.id ?? null;
  }
}
