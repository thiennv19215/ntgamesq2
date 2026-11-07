# Scoreboard game stage

`ScoreboardStageFrame` is the presentation shell for the standalone `scoreboard` game mode. The game is registered in `src/game/gameRegistry.ts`; its runtime and scene stay inside this folder.

## Layout and slots

The frame uses a 1080×1920 (9:16) coordinate design and scales to its host width. It follows the reference's proportions: a wide board at the top ending near y=706, a slim pale-green wall and wood teaching wall, a small teacher desk at lower left, globe/plant at lower right, and five split desk rows with a clear center aisle beginning near y=978. The generated backdrop is scenery only; React slots remain independent:

Generated art lives separately from the frame: `public/assets/generated/scoreboard-classroom-v2.png` is the 1080×1920 background; `public/assets/nv/scoreboard/teacher-v2.png` and `public/assets/nv/scoreboard/students/*-v2.png` hold transparent character sprites in the upgraded kawaii style. `assets.ts` is the path manifest. Seated sprites are intended for desk rows; standing sprites can be used for entrance/answer animations.

`ScoreboardUi.tsx` provides matching reusable title, question/letter tile and leaderboard panels. They are visual components only and accept game data via props; they do not own quiz state or scoring rules.

- `boardHeader`: game title, round, or timer.
- `question`: prompt and answer/letter tiles in the center-left of the board.
- `leaderboard`: top-player list in the right board column.
- `status`: compact feedback or round state under the question.
- `teacher`: teacher sprite near the podium.
- `classroom`: student sprites and labels above the desk rows.
- `bottomHud`: optional game-owned controls or summary.

Example:

```tsx
<ScoreboardStageFrame
  boardHeader={<GameHeader />}
  question={<QuestionPanel />}
  leaderboard={<ScoreList />}
  teacher={<img src="/assets/nv/co-ngan/01-dung.webp" alt="" />}
  classroom={<StudentSeats />}
/>
```

Import from `ScoreboardStageFrame.tsx` (default or named export). `scoreboardRuntime.ts` owns the game state and registration rules: exactly three sides (`Bên 1`, `Bên 2`, `Bên 3`), up to 10 people per side, and 30 people total. A new participant is balanced into the least-populated side. A viewer can choose a side by commenting `bên 1`, `bên 2`, or `bên 3` (unaccented forms and `đội`/`tổ` aliases are also accepted); a full side or full game rejects the registration and keeps the state unchanged.

Do not put game rules into this frame. The backdrop is scenery only; no text, UI, characters, or livestream/social overlays are baked into it.
