const TARGET_W = 576;
const TARGET_H = 1024;
const TARGET_RATIO = 9 / 16;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid image'));
    };
    img.src = url;
  });
}

/** Center-crop to 9:16 and resize to 576×1024 for backend validation. Web only. */
export async function normalizeFigureImage(file: Blob): Promise<{ file: Blob; filename: string }> {
  const img = await loadImage(file);
  const srcRatio = img.width / img.height;

  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (srcRatio > TARGET_RATIO) {
    sw = img.height * TARGET_RATIO;
    sx = (img.width - sw) / 2;
  } else if (srcRatio < TARGET_RATIO) {
    sh = img.width / TARGET_RATIO;
    sy = (img.height - sh) / 2;
  }

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_W;
  canvas.height = TARGET_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encode failed'))),
      'image/jpeg',
      0.92,
    );
  });

  return { file: blob, filename: 'figure.jpg' };
}
