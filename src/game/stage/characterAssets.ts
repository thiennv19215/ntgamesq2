/** Khai báo sprite/pose tập trung; file ảnh thực tế nằm dưới public/assets/nv/. */
export const STUDENT_HEAD_FRAME = {
  nam: { x: 0.136, y: 0, w: 0.682, h: 0.284 },
  nu: { x: 0.174, y: 0, w: 0.668, h: 0.248 },
} as const;

export const STUDENT_POSES = {
  nam: { dung: '01-dung', tay: '02-giong-tay', nghi: '03-suy-nghi', vui: '05-vui-mung', buon: '06-buon', ngac: '07-ngac-nhien', chao: '08-vay-chao' },
  nu: { dung: '01-dung', tay: '02-giong-tay', nghi: '03-suy-nghi', vui: '05-vui-mung', buon: '06-buon', ngac: '07-ngac-nhien', chao: '08-vay-chao' },
} as const;

export type StudentPoseKey = keyof typeof STUDENT_POSES.nam;

export const TEACHER_OUTFIT_POSES: Record<string, string> = {
  '01-dung': '01-dung', '02-gioi-thieu': '02-giang-bai', '03-chi-bang': '04-chi-phai',
  '04-vay-chao': '13-vay-chao', '05-dang-tay': '15-chao-don', '06-cuoi': '06-cuoi-che-mieng',
  '07-tay-nguc': '05-cuoi-tuoi', '08-ngon-cai': '08-like', '09-mung': '14-co-vu',
  '10-vo-tay': '07-vo-tay', '11-nhun-vai': '12-nhun-vai', '12-gai-dau': '11-suy-nghi',
  '13-ngac-nhien': '10-bat-ngo', '14-ngon-tro': '09-nghiem-nhe', '15-chong-hong': '16-tu-tin',
  '16-chi-trai': '03-chi-trai',
};

export const SHOW_TEACHER_POSES = {
  everest: [
    '01-dung-san-sang', '02-chi-len-dinh', '03-chi-lo-trinh', '04-chao-doan-leo', '05-doc-ban-do', '06-suy-nghi', '07-like', '08-co-vu',
    '09-bat-ngo', '10-cuoi-vui', '11-nhac-nho-an-toan', '12-vay-chao', '13-cam-co-dinh', '14-dong-vien', '15-vo-tay', '16-tu-tin',
  ],
  chuong: [
    '01-cam-chuong-san-sang', '02-rung-chuong-ben', '03-rung-chuong-cao', '04-rung-chuong-hai-tay', '05-rung-chuong-nghieng-nguoi',
    '06-rung-chuong-cuoi-tuoi', '07-rung-chuong-hao-hung', '08-rung-chuong-nghiem-tuc', '09-bao-hieu-bat-dau', '10-mung-chien-thang',
    '11-bat-ngo-nghe-chuong', '12-moi-thi-sinh', '13-vay-chao-cam-chuong', '14-tu-hao-gio-chuong', '15-chuan-bi-rung', '16-nghi-thang-tran',
  ],
} as const;

// Alias để GameStage dùng trong phần render cũ, tránh thay đổi hành vi khi tách cấu hình.
export const HEAD = STUDENT_HEAD_FRAME;
export const POSE = STUDENT_POSES;
export const OUTFIT_POSE = TEACHER_OUTFIT_POSES;
export const EVEREST_POSES = SHOW_TEACHER_POSES.everest;
export const CHUONG_POSES = SHOW_TEACHER_POSES.chuong;
