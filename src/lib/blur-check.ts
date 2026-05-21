/**
 * Quick client-side blur detection using Laplacian variance.
 * Returns a sharpness score (higher = sharper). Below 100 = likely blurry.
 */
export async function detectBlur(file: File): Promise<{
  filename: string;
  sharpness: number;
  isBlurry: boolean;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Downscale to max 600px for fast computation
      const maxDim = 600;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.floor(img.width * scale);
      const h = Math.floor(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ filename: file.name, sharpness: 999, isBlurry: false });
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Convert to grayscale
      const gray = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      }

      // Apply Laplacian kernel and compute variance
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const laplacian =
            -4 * gray[i] +
            gray[i - 1] +
            gray[i + 1] +
            gray[i - w] +
            gray[i + w];
          sum += laplacian;
          sumSq += laplacian * laplacian;
          count++;
        }
      }

      const mean = sum / count;
      const variance = sumSq / count - mean * mean;

      // Threshold: below 100 is likely blurry
      resolve({
        filename: file.name,
        sharpness: Math.round(variance),
        isBlurry: variance < 100,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // If we can't load the image, just let it pass
      resolve({ filename: file.name, sharpness: 999, isBlurry: false });
    };

    img.src = url;
  });
}

/**
 * Check multiple image files in parallel. Returns only the blurry ones.
 */
export async function findBlurryImages(files: File[]) {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  const results = await Promise.all(imageFiles.map(detectBlur));
  return results.filter((r) => r.isBlurry);
}
