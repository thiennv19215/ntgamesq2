"""Tạo bộ 8 file âm thanh SFX chất lượng cao cho game Lớp Học Chữ:
ting.mp3, drum.mp3, go.mp3, tick.mp3, bell.mp3, pop.mp3, clap.mp3, fanfare.mp3
Sử dụng numpy tổng hợp sóng âm phong phú, harmonics, envelope rồi xuất mp3 qua ffmpeg.
"""
from pathlib import Path
import numpy as np
import subprocess
import tempfile
import scipy.io.wavfile as wav

OUT_DIR = Path(__file__).resolve().parent.parent / 'public' / 'assets' / 'sfx'
OUT_DIR.mkdir(parents=True, exist_ok=True)
SR = 44100

def save_mp3(samples: np.ndarray, filename: str):
    # Chuẩn hóa âm lượng tránh clipping (-1.0 to 1.0)
    samples = np.clip(samples, -1.0, 1.0)
    int16_samples = (samples * 32767).astype(np.int16)
    
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_wav = tmp.name
    
    try:
        wav.write(tmp_wav, SR, int16_samples)
        out_mp3 = OUT_DIR / filename
        cmd = [
            'ffmpeg', '-y', '-i', tmp_wav,
            '-b:a', '192k',
            str(out_mp3)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        print(f"-> Đã tạo: {out_mp3.name} ({out_mp3.stat().st_size} bytes)")
    finally:
        Path(tmp_wav).unlink(missing_ok=True)

# 1. TING: Tiếng chuông glockenspiel trong trẻo, 2 nốt hòa âm nảy tươi sáng (E6 -> A6)
def gen_ting():
    dur = 1.2
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Nốt 1: E6 (1318.5 Hz) nảy ngắn
    env1 = np.exp(-12 * t)
    s1 = 0.6 * np.sin(2 * np.pi * 1318.5 * t) * env1
    
    # Nốt 2: A6 (1760 Hz) xuất hiện sau 0.08s ngân dài ấm áp
    delay = 0.08
    t2 = np.maximum(0, t - delay)
    env2 = np.where(t >= delay, np.exp(-4.5 * t2), 0)
    # Nhiều harmonics kim loại cho tiếng chuông lung linh
    s2 = (0.7 * np.sin(2 * np.pi * 1760 * t2) +
          0.3 * np.sin(2 * np.pi * 3520 * t2) +
          0.15 * np.sin(2 * np.pi * 5280 * t2)) * env2
    
    return (s1 + s2) * 0.9

# 2. DRUM: Tiếng trống trường Việt Nam trầm hùng (Cắc... Tùng tùng tùng!)
def gen_drum():
    dur = 2.4
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros_like(t)
    
    def hit_tung(start_t, amp=0.85):
        dt = t - start_t
        mask = dt >= 0
        cur_t = np.maximum(0, dt)
        # Tần số trống da trượt từ 145Hz xuống 75Hz
        freq = 75 + 70 * np.exp(-25 * cur_t)
        phase = 2 * np.pi * np.cumsum(freq) / SR
        body = np.sin(phase) * np.exp(-5.5 * cur_t)
        # Tiếng dùi gõ vào mặt da
        click = np.random.uniform(-1, 1, len(cur_t)) * np.exp(-70 * cur_t) * 0.2
        hit = (body + click) * mask * amp
        return hit

    # Tiếng "Tùng... Tùng... Tùng!"
    out += hit_tung(0.0, 0.75)
    out += hit_tung(0.65, 0.8)
    out += hit_tung(1.3, 0.95)
    return out

# 3. GO: Tiếng kèn/chuông xoay vui nhộn báo bắt đầu
def gen_go():
    dur = 1.0
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros_like(t)
    
    # Chuỗi 3 nốt vui tươi: C5 (523), E5 (659), G5 (784)
    notes = [(0.0, 523.25, 0.18), (0.14, 659.25, 0.18), (0.28, 783.99, 0.6)]
    for start_t, freq, note_dur in notes:
        dt = np.maximum(0, t - start_t)
        mask = (t >= start_t) & (t < start_t + note_dur + 0.3)
        env = np.exp(-6.0 * dt) * mask
        # Âm sắc mộc ấm vui tươi
        snd = (np.sin(2 * np.pi * freq * dt) + 
               0.4 * np.sin(2 * np.pi * freq * 2 * dt) + 
               0.2 * np.sin(2 * np.pi * freq * 3 * dt)) * env
        out += snd * 0.4
    return out

# 4. TICK: Tiếng tích tắc đồng hồ cơ trầm, ngắn và dịu
def gen_tick():
    dur = 0.12
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    env = np.exp(-85 * t)
    # Âm gỗ trầm thay cho tiếng vuông cao, chỉ thêm một transient rất nhẹ.
    body = (np.sin(2 * np.pi * 760 * t) + 0.2 * np.sin(2 * np.pi * 1080 * t)) * env
    click = np.random.uniform(-1, 1, len(t)) * np.exp(-220 * t) * 0.08
    return (body * 0.42 + click) * 0.65

# 5. BELL: Chuông điện báo hết giờ tan học
def gen_bell():
    dur = 1.8
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Xung chuông reng 18Hz điều biên âm sắc kim loại 1200Hz
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 22 * t)
    env = np.exp(-2.2 * t)
    f1 = 1180
    f2 = 1450
    f3 = 1920
    sound = (np.sin(2 * np.pi * f1 * t) + 
             0.8 * np.sin(2 * np.pi * f2 * t) + 
             0.5 * np.sin(2 * np.pi * f3 * t)) * mod * env
    return sound * 0.6

# 6. POP: Bong bóng nảy / quà bay xuống bàn
def gen_pop():
    dur = 0.28
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    # Trượt tần số nhanh từ 900Hz xuống 180Hz tạo hiệu ứng pop mút
    freq = 180 + 720 * np.exp(-22 * t)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    env = np.exp(-14 * t)
    snd = np.sin(phase) * env
    return snd * 0.85

# 7. CLAP: Cả lớp đồng thanh vỗ tay rào rào
def gen_clap():
    dur = 2.5
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros_like(t)
    
    # Mô phỏng hàng chục bàn tay vỗ tay với nhịp điệu tự nhiên
    np.random.seed(42)
    # Đợt vỗ tay nhịp nhàng 3-4 nhịp chính
    clap_beats = [0.05, 0.45, 0.85, 1.25, 1.65, 2.05]
    for beat in clap_beats:
        # Mỗi nhịp gồm 25-30 học sinh vỗ hơi lệch nhau một chút
        for _ in range(25):
            offset = beat + np.random.normal(0, 0.04)
            if offset < 0 or offset >= dur - 0.1:
                continue
            idx = int(offset * SR)
            clap_len = int(0.08 * SR)
            sub_t = np.linspace(0, 0.08, clap_len, endpoint=False)
            env = np.exp(-45 * sub_t)
            noise = np.random.uniform(-1, 1, clap_len) * env
            # Lọc dải trung âm của tiếng vỗ tay
            end_idx = min(len(out), idx + clap_len)
            out[idx:end_idx] += noise[:end_idx - idx] * np.random.uniform(0.12, 0.25)
            
    # Chuẩn hóa âm lượng
    mx = np.max(np.abs(out))
    if mx > 0:
        out = (out / mx) * 0.85
    return out

# 8. FANFARE: Kèn khải hoàn ngắn mừng thắng cuộc / học sinh giỏi
def gen_fanfare():
    dur = 2.0
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros_like(t)
    
    # Chuỗi nốt kèn đồng (C5, G5, C6) ngân vang
    notes = [
        (0.0, 523.25, 0.22, 0.7),
        (0.2, 523.25, 0.22, 0.7),
        (0.4, 523.25, 0.22, 0.7),
        (0.6, 659.25, 0.35, 0.8),
        (0.95, 783.99, 0.35, 0.85),
        (1.3, 1046.5, 0.7, 0.95)
    ]
    for start_t, freq, note_dur, amp in notes:
        dt = np.maximum(0, t - start_t)
        mask = (t >= start_t) & (t < start_t + note_dur + 0.2)
        env = np.minimum(1.0, dt / 0.02) * np.exp(-3.5 * dt) * mask
        # Âm sắc kèn đồng: harmonics 1, 2, 3, 4
        snd = (np.sin(2 * np.pi * freq * dt) +
               0.6 * np.sin(2 * np.pi * freq * 2 * dt) +
               0.4 * np.sin(2 * np.pi * freq * 3 * dt) +
               0.2 * np.sin(2 * np.pi * freq * 4 * dt)) * env * amp
        out += snd * 0.3
    return out

import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

def main():
    print("Tao bo am thanh SFX...")
    save_mp3(gen_ting(), 'ting.mp3')
    save_mp3(gen_drum(), 'drum.mp3')
    save_mp3(gen_go(), 'go.mp3')
    save_mp3(gen_tick(), 'tick.mp3')
    save_mp3(gen_bell(), 'bell.mp3')
    save_mp3(gen_pop(), 'pop.mp3')
    save_mp3(gen_clap(), 'clap.mp3')
    save_mp3(gen_fanfare(), 'fanfare.mp3')
    print("Hoan tat 8 file SFX!")

if __name__ == '__main__':
    main()
