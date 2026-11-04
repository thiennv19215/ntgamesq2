import { motion } from 'motion/react';

/**
 * Bộ asset vector SVG chất lượng cao cho GameStage:
 * - Tem / Huy hiệu Đúng (Đúng + Sao vàng) & Sai (Sai + Giọt mồ hôi hoạt hình)
 * - Bó hoa tươi tặng cô giáo & Hoa cắm bình (Hoa sen, Hướng dương, Hoa hồng, Cúc hoạ mi)
 * - Huy chương Vàng / Bạc / Đồng
 * - Hiệu ứng hạt pháo hoa giấy Confetti nổ tung ăn mừng
 */

/** Huy hiệu Đúng / Sai nổi 3D phong cách chibi tem bé ngoan */
export function AnswerBadge({ type }: { type: 'right' | 'wrong' }) {
  if (type === 'right') {
    return (
      <svg viewBox="0 0 44 44" className="h-full w-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]">
        {/* Vòng nền ngoài */}
        <circle cx="22" cy="22" r="21" fill="#15803d" stroke="#fef08a" strokeWidth="2.5" />
        <circle cx="22" cy="22" r="17" fill="#22c55e" />
        {/* Nét bóng sáng */}
        <path d="M9 16 A16 16 0 0 1 35 16 A16 12 0 0 0 9 16 Z" fill="rgba(255,255,255,0.35)" />
        {/* Dấu tích v */}
        <path
          d="M13 22 L19 28 L31 15"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Ngôi sao nhỏ lấp lánh */}
        <polygon points="34,8 35.5,12 39.5,13.5 35.5,15 34,19 32.5,15 28.5,13.5 32.5,12" fill="#fde047" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 44 44" className="h-full w-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]">
      {/* Vòng nền ngoài đỏ */}
      <circle cx="22" cy="22" r="21" fill="#991b1b" stroke="#fecaca" strokeWidth="2.5" />
      <circle cx="22" cy="22" r="17" fill="#ef4444" />
      {/* Nét bóng sáng */}
      <path d="M9 16 A16 16 0 0 1 35 16 A16 12 0 0 0 9 16 Z" fill="rgba(255,255,255,0.3)" />
      {/* Dấu X */}
      <path
        d="M15 15 L29 29 M29 15 L15 29"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Bó hoa tươi tặng cô giáo 2D rực rỡ */
export function BouquetIcon({ className = 'h-16 w-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className}>
      {/* Giấy gói hoa màu hồng cam xếp nếp */}
      <polygon points="32,60 16,36 48,36" fill="#f472b6" stroke="#db2777" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="32,60 22,36 42,36" fill="#fb7185" />
      {/* Nơ buộc màu vàng */}
      <ellipse cx="32" cy="46" rx="4" ry="3" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
      <path d="M28 47 Q24 54 20 57 M36 47 Q40 54 44 57" stroke="#ca8a04" strokeWidth="2" fill="none" />
      
      {/* Lá xanh viền hoa */}
      <ellipse cx="18" cy="26" rx="8" ry="5" fill="#22c55e" transform="rotate(-30 18 26)" />
      <ellipse cx="46" cy="26" rx="8" ry="5" fill="#22c55e" transform="rotate(30 46 26)" />
      
      {/* Các bông hoa rực rỡ */}
      {/* Bông hồng giữa */}
      <circle cx="32" cy="24" r="11" fill="#e11d48" stroke="#be123c" strokeWidth="1.5" />
      <circle cx="32" cy="24" r="6" fill="#f43f5e" />
      <circle cx="32" cy="24" r="2.5" fill="#ffe4e6" />
      
      {/* Bông hướng dương trái */}
      <circle cx="21" cy="32" r="8" fill="#f59e0b" />
      <circle cx="21" cy="32" r="4" fill="#78350f" />
      
      {/* Bông hoa sen hồng phải */}
      <circle cx="43" cy="32" r="8" fill="#ec4899" />
      <circle cx="43" cy="32" r="4" fill="#fdf2f8" />
      
      {/* Bông cúc trắng trên đỉnh */}
      <circle cx="32" cy="12" r="7" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <circle cx="32" cy="12" r="3" fill="#eab308" />
    </svg>
  );
}

/** Từng bông hoa cắm vào bình trên bàn cô giáo (4 loại hoa luân phiên) */
export function VaseFlower({ index }: { index: number }) {
  const type = index % 4;
  
  if (type === 0) {
    // Hoa sen hồng duyên dáng
    return (
      <svg viewBox="0 0 36 36" className="h-9 w-9 drop-shadow-[0_3px_3px_rgba(0,0,0,0.3)]">
        <path d="M18 4 C12 14 8 24 18 32 C28 24 24 14 18 4 Z" fill="#f472b6" stroke="#db2777" strokeWidth="1.2" />
        <path d="M18 8 C14 16 11 23 18 29 C25 23 22 16 18 8 Z" fill="#fbcfe8" />
        <ellipse cx="18" cy="24" rx="4" ry="2.5" fill="#fef08a" />
      </svg>
    );
  }
  
  if (type === 1) {
    // Hoa hướng dương rực rỡ
    return (
      <svg viewBox="0 0 36 36" className="h-9 w-9 drop-shadow-[0_3px_3px_rgba(0,0,0,0.3)]">
        {Array.from({ length: 8 }, (_, i) => {
          const deg = i * 45;
          return (
            <ellipse
              key={i}
              cx="18"
              cy="7"
              rx="3.5"
              ry="7"
              fill="#facc15"
              stroke="#ca8a04"
              strokeWidth="0.8"
              transform={`rotate(${deg} 18 18)`}
            />
          );
        })}
        <circle cx="18" cy="18" r="6" fill="#713f12" stroke="#451a03" strokeWidth="1" />
        <circle cx="18" cy="18" r="3.5" fill="#854d0e" />
      </svg>
    );
  }
  
  if (type === 2) {
    // Hoa hồng nhung đỏ
    return (
      <svg viewBox="0 0 36 36" className="h-9 w-9 drop-shadow-[0_3px_3px_rgba(0,0,0,0.3)]">
        <circle cx="18" cy="18" r="14" fill="#e11d48" stroke="#9f1239" strokeWidth="1.2" />
        <path d="M10 18 Q18 8 26 18 Q18 28 10 18 Z" fill="#f43f5e" />
        <circle cx="18" cy="18" r="5" fill="#fda4af" />
        <circle cx="18" cy="18" r="2" fill="#fff1f2" />
      </svg>
    );
  }

  // Hoa cúc trắng nhuỵ vàng
  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 drop-shadow-[0_3px_3px_rgba(0,0,0,0.3)]">
      {Array.from({ length: 10 }, (_, i) => {
        const deg = i * 36;
        return (
          <ellipse
            key={i}
            cx="18"
            cy="7"
            rx="3"
            ry="7"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="0.8"
            transform={`rotate(${deg} 18 18)`}
          />
        );
      })}
      <circle cx="18" cy="18" r="5.5" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
    </svg>
  );
}

/** Hiệu ứng pháo giấy Confetti bay tung toé khi có người đoán đúng */
const CONFETTI_PIECES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: 80 + (i * 29) % 920,
  targetY: 1050 + ((i * 37) % 500),
  color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ffd700'][i % 7],
  size: 10 + (i % 8),
  rot: ((i * 73) % 720) - 360,
  dur: 2.2 + (i % 4) * 0.25,
  delay: (i % 6) * 0.05,
}));

export function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {CONFETTI_PIECES.map((p) => (
        <motion.div
          key={p.id}
          initial={{ left: p.x, top: 480, opacity: 1, scale: 0, rotate: 0 }}
          animate={{
            left: p.x + ((p.id % 2 === 0 ? 1 : -1) * 80),
            top: p.targetY,
            opacity: [1, 1, 0],
            scale: [0, 1.3, 0.8],
            rotate: p.rot,
          }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
          className="absolute rounded-sm shadow-sm"
          style={{ width: p.size, height: p.size * 0.65, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}
