/** Ảnh nền phòng học tải lên; luôn nằm dưới các lớp bảng, bàn ghế và nhân vật. */
export function UploadedRoomBackground({ image }: { image: string }) {
  if (!image) return null;
  return <img alt="" src={`/room-bg/${encodeURIComponent(image)}`} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />;
}
