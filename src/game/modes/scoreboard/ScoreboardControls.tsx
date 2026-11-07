import { sendControl } from '../../../live/page';
import type { ScoreboardView } from './scoreboardRuntime';

export function ScoreboardControls({ view }: { view: ScoreboardView | null }) {
  return <div className="rounded-2xl bg-slate-900 p-3 text-sm ring-1 ring-slate-800">
    <div className="mb-2 font-semibold">📊 Điều khiển Bảng thi đấu</div>
    <div className="text-slate-300">
      {view ? <>
        <div>Câu {view.qNo}/{view.total} · {view.phase} · {view.participantCount}/{view.participantCapacity} người</div>
        <div className="mt-1 text-xs text-slate-400">{view.teams.map((team) => `${team.name}: ${team.count}/${team.capacity}`).join(' · ')}</div>
        <div className="mt-1 text-xs text-amber-300">Người xem gõ “bên 1”, “bên 2” hoặc “bên 3”; nếu không chọn, hệ thống tự xếp vào bên còn ít người nhất.</div>
        {view.participantCount >= view.participantCapacity && <div className="mt-1 font-semibold text-rose-300">Đã đủ 30 người, từ chối người tham gia mới.</div>}
      </> : 'Mở màn LIVE để khởi tạo ván thi đấu.'}
    </div>
    <button type="button" className="mt-2 rounded-lg bg-slate-700 px-3 py-2 text-white hover:bg-slate-600" onClick={() => void sendControl('custom', 'newRound')}>
      🔄 Ván mới
    </button>
  </div>;
}
