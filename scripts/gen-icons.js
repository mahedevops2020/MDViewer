const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/icons');
fs.mkdirSync(dir, { recursive: true });

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0e1117';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.18);
  ctx.fill();

  // Accent diamond
  ctx.fillStyle = '#4fa3e0';
  const cx = size / 2, cy = size * 0.42, r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.7, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.7, cy);
  ctx.closePath();
  ctx.fill();

  // Text "MD"
  ctx.fillStyle = '#cdd9e5';
  ctx.font = `bold ${size * 0.18}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('MD', cx, cy * 1.72);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), buffer);
  console.log(`Generated icon-${size}.png`);
}

generateIcon(192);
generateIcon(512);
