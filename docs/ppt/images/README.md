# 截图槽位说明

把你截的图按下列文件名放进这个目录，HTML 会自动加载（没传也行，会显示占位）。

| 文件名 | 截哪个页面 / 怎么来 |
|---|---|
| `01-cover.png` | AI 生图（image-prompts.md · 01） |
| `02-painpoint.png` | AI 生图 |
| `08-login.png` | 截 http://82.156.139.33:3001/login |
| `15-hero.png` | AI 生图 |
| `18-add-menu.png` | 档案详情 → 加题菜单 |
| `19-ocr-1.png` | 拍照页（按相机按钮前） |
| `19-ocr-2.png` | AI 识别中 / 完成的中间页 |
| `19-ocr-3.png` | 编辑确认页 |
| `20-pdf.png` | PDF 异步导入进度页 |
| `21-library.png` | 题库管理页 |
| `22-coach.png` | AI 陪学对话页 |
| `23-rag.png` | 题目页问 AI · 出现章节引用的回答 |
| `24-qrcode.png` | URL 二维码，可用 https://cli.im/url 生成 |

## 截图技巧

- mac 系统：`Cmd+Shift+4` 拉框截图，自动落到桌面
- 截手机端：Chrome 开 DevTools (`Cmd+Option+I`) → 切到手机模拟 (`Cmd+Shift+M`) → 选 iPhone 14 → 截图
- 二维码：`brew install qrencode` 然后 `qrencode -o 24-qrcode.png -s 12 'http://82.156.139.33:3001'`
