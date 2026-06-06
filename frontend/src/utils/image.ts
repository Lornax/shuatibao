/**
 * 压缩图片到指定最长边, 输出 jpeg dataUrl. 控制 payload 大小.
 * 用法: 陪学发图 (1600/0.85)、反馈截图 (1200/0.8) 等.
 */
export async function compressImage(file: File, maxEdge: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d 不可用');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
