/* Subject-aware crop window.
   sharp's position:'attention' picks the highest-entropy region, which on the
   outdoor shots is the treeline, not the car (RS Q3 came out as sky). The car
   is instead the dominant mass that DIFFERS from the backdrop, so: sample the
   image small, estimate the backdrop from the border pixels, weight every row
   and column by how far it departs from that backdrop, and centre the crop on
   the weighted centroid. Falls back to centre when nothing stands out. */
const sharp = require('./sharp-resolve');

async function subjectWindow(src, targetRatio) {
  const S = 160;
  const { data, info } = await sharp(src).rotate()
    .resize(S, S, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const px = i => [data[i * C], data[i * C + 1], data[i * C + 2]];

  // Backdrop = mean of a 3px border ring.
  let br = 0, bg = 0, bb = 0, bn = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x > 2 && x < W - 3 && y > 2 && y < H - 3) continue;
    const [r, g, b] = px(y * W + x); br += r; bg += g; bb += b; bn++;
  }
  br /= bn; bg /= bn; bb /= bn;

  const rowW = new Float64Array(H), colW = new Float64Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, g, b] = px(y * W + x);
    const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const w = d > 40 ? d : 0;                       // ignore near-backdrop noise
    rowW[y] += w; colW[x] += w;
  }
  const centroid = (arr) => {
    let s = 0, m = 0;
    for (let i = 0; i < arr.length; i++) { s += arr[i]; m += arr[i] * i; }
    return s > 0 ? m / s / arr.length : 0.5;        // normalised 0..1
  };
  return { cx: centroid(colW), cy: centroid(rowW) };
}

/* Returns {left, top, width, height} for a targetRatio crop of a WxH image. */
async function cropRect(src, srcW, srcH, targetRatio) {
  const { cx, cy } = await subjectWindow(src, targetRatio);
  let w, h;
  if (srcW / srcH > targetRatio) { h = srcH; w = Math.round(h * targetRatio); }
  else { w = srcW; h = Math.round(w / targetRatio); }
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(v)));
  return {
    left: clamp(cx * srcW - w / 2, srcW - w),
    top: clamp(cy * srcH - h / 2, srcH - h),
    width: w, height: h,
  };
}

module.exports = { cropRect, subjectWindow };
