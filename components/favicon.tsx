'use client';

import { DynamicFavicon, type FaviconDrawFn } from '@thesandybridge/ui/components';

const drawLayersIcon: FaviconDrawFn = (ctx, size, accent) => {
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = size / 24;
  // Bottom layer
  ctx.beginPath();
  ctx.moveTo(2 * s, 17.65 * s);
  ctx.lineTo(11.17 * s, 21.81 * s);
  ctx.lineTo(12.83 * s, 21.81 * s);
  ctx.lineTo(22 * s, 17.65 * s);
  ctx.stroke();
  // Middle layer
  ctx.beginPath();
  ctx.moveTo(2 * s, 12.65 * s);
  ctx.lineTo(11.17 * s, 16.81 * s);
  ctx.lineTo(12.83 * s, 16.81 * s);
  ctx.lineTo(22 * s, 12.65 * s);
  ctx.stroke();
  // Top layer
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.moveTo(12.83 * s, 2.18 * s);
  ctx.lineTo(2.6 * s, 6.08 * s);
  ctx.lineTo(2.6 * s, 7.91 * s);
  ctx.lineTo(11.18 * s, 11.82 * s);
  ctx.lineTo(12.83 * s, 11.82 * s);
  ctx.lineTo(21.4 * s, 7.91 * s);
  ctx.lineTo(21.4 * s, 6.08 * s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(12.83 * s, 2.18 * s);
  ctx.lineTo(2.6 * s, 6.08 * s);
  ctx.lineTo(2.6 * s, 7.91 * s);
  ctx.lineTo(11.18 * s, 11.82 * s);
  ctx.lineTo(12.83 * s, 11.82 * s);
  ctx.lineTo(21.4 * s, 7.91 * s);
  ctx.lineTo(21.4 * s, 6.08 * s);
  ctx.closePath();
  ctx.stroke();
};

export function Favicon() {
  return <DynamicFavicon draw={drawLayersIcon} />;
}
