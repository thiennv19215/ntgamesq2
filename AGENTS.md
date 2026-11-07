# Quy tắc dự án cho agent

## Bản đồ mã nguồn

- `src/game/quiz.ts`: trạng thái và luật game; không đặt JSX hoặc CSS ở đây.
- `src/game/GameStage.tsx`: hiện là bộ ghép sân khấu và vẫn chứa nhiều thành phần render cũ.
- `src/game/stage/classroomLayout.ts`: cấu hình kích thước, tọa độ hàng ghế, tỷ lệ nhân vật và màu tổ. Sửa ở đây khi đổi bố trí phòng học hiện tại.
- `src/game/stage/characterAssets.ts`: ánh xạ sprite/pose học sinh, cô giáo và pose riêng của game show. Sửa ở đây khi thêm hoặc đổi ảnh/pose.
- `src/game/stage/UploadedRoomBackground.tsx`: lớp ảnh nền người dùng tải lên, render phía sau toàn bộ nội dung sân khấu.
- `src/live/classroomBackgrounds.ts`: danh sách nền preset dùng bởi khung sân khấu và dashboard.
- `src/live/stageLayouts.ts`: kiểu bố cục sân khấu tùy chọn; Dashboard đổi lựa chọn, GameStage lắng nghe và áp dụng lớp bố cục tương ứng.
- `src/game/config.ts` (`RoomCfg.bg`) và `src/game/GameControls.tsx`: ảnh nền do người dùng tải lên; endpoint lưu ảnh nằm trong `server.ts`.
- `src/game/stage.css`: kiểu dáng lớp học. Giữ quy tắc màu/kích thước gắn với bố cục tại đây hoặc chuyển thành token có tên rõ ràng.
- `public/assets/nv/`: ảnh nhân vật; giữ nguyên tên file đang được các ánh xạ pose tham chiếu.

## Quy tắc khi sửa bối cảnh/nhân vật

1. Nền là một lớp độc lập phía sau nội dung sân khấu. Không ghép nhân vật, chữ, bảng hoặc UI vào ảnh nền.
2. Tọa độ hiện tại theo canvas dọc 1080×1920. Khi thêm bố cục khác, đăng ký `id` trong `stageLayouts.ts`, thêm lựa chọn ở Dashboard và CSS có scope theo `data-stage-layout`; không sửa ngầm tọa độ mặc định vì đường đi học sinh và các lớp UI phụ thuộc vào chúng.
3. Đổi ảnh/pose thì cập nhật `characterAssets.ts`; không rải đường dẫn sprite mới khắp `GameStage.tsx`.
4. Không đổi tên hoặc xóa asset đang dùng nếu chưa cập nhật toàn bộ tham chiếu. Tối ưu ảnh nền riêng với sprite nhân vật.
5. Bảo toàn vị trí lớp z-index, khu vực an toàn livestream và hành vi responsive của `StageFrame`.

## Quy tắc khi thêm game

1. Game thật là một gói độc lập trong `src/game/modes/<game-id>/`: metadata, state + luật, giao diện điều khiển nếu có, và scene riêng. Chỉ đổi CSS/layout không được gọi là thêm game.
2. `GameStage.tsx`/stage host chỉ định tuyến theo `gameId` tới game đã chọn; không nhét luật game mới vào `quiz.ts` hoặc render bằng chuỗi nhánh dài.
3. Mỗi game sở hữu state runtime riêng. Không dùng chung mutable `Classroom` instance giữa hai game; state game này không được làm bẩn game kia.
4. Tạo `src/game/shared/` cho phần tái sử dụng có chủ đích như kho câu hỏi, chuẩn hóa đáp án, tính điểm thuần hoặc asset. Mỗi game tự chọn import phần cần dùng; shared không phụ thuộc ngược vào game cụ thể.
5. Đăng ký game qua registry có kiểu rõ ràng (id, tên, khởi tạo state, scene, tùy chọn). Game selector chọn game; `stageLayouts.ts` chỉ chọn bố cục trình bày bên trong một game.
6. Scene và art direction riêng nằm trong gói game đó. Có thể dùng chung nhân vật/nền/layout qua props/config; game có phong cách khác phải sở hữu scene/assets riêng.
7. Thêm game mới theo từng bước: tạo gói riêng → đăng ký → nối bộ chọn game → trích xuất phần chia sẻ thật sự cần. Không đại tu game cũ cùng lúc nếu không cần.

## Quy trình thay đổi

- Trước khi sửa, kiểm tra `git status` và giữ nguyên mọi thay đổi có sẵn của người dùng.
- Chỉ chạy build/lint/kiểm tra khi người dùng yêu cầu xác minh hoặc khi task cần xác minh rõ ràng; báo trung thực những gì đã chạy.
- Không commit/push trừ khi người dùng yêu cầu trực tiếp.
- Ghi quyết định sản phẩm đặc thù của Lớp Học Chữ vào `CLAUDE.md`; quy tắc kiến trúc chung cập nhật tại file này.
