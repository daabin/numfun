#!/usr/bin/env node
// 生成水果版角色数据：把原来 vellum.ai 的小精灵身体形状替换为 10 种圆润水果
// （苹果、草莓、桃子、番茄、橙子、梨、西瓜、葡萄、蓝莓、樱桃），
// 表情（eyeStyles）保持不变。输出 assets/characters.json，并生成 preview-fruits.html 供检查。
// 用法：node generate-fruits.js
const fs = require('fs');
const path = require('path');

const root = __dirname;

/* ---------- 工具：catmull-rom 样条 → 平滑闭合 SVG 路径 ---------- */
function catmullRomPath(pts) {
  const n = pts.length;
  const at = (i) => pts[((i % n) + n) % n];
  const r = (v) => Math.round(v * 10) / 10;
  let d = `M${r((at(0).x + at(1).x) / 2)} ${r((at(0).y + at(1).y) / 2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  return d + 'Z';
}

/* ---------- 10 种水果定义 ----------
   outline 为轮廓控制点（catmull-rom 平滑），坐标任意，最后统一归一化到 viewBox；
   faceCenter 是眼睛中心落点（形状中心略偏上，水果脸更可爱）；
   colors 是每种水果自己的颜色变体（颜色跟随水果，不再全随机）。 */
const FRUITS = [
  {
    id: 'apple', faceCenter: { x: 290, y: 300 },
    colors: [
      { id: 'red', hex: '#E8544F' },
      { id: 'green', hex: '#A8C256' },
      { id: 'gold', hex: '#F0C24B' }
    ],
    outline: [
      [290, 150], [335, 105], [390, 78], [455, 88], [505, 120],
      [534, 178], [540, 248], [528, 322], [495, 388], [438, 448],
      [368, 505], [300, 535], [232, 505], [142, 448], [85, 388],
      [52, 322], [40, 248], [46, 178], [75, 120], [125, 88], [190, 78], [245, 105]
    ]
  },
  {
    id: 'strawberry', faceCenter: { x: 350, y: 300 },
    colors: [
      { id: 'red', hex: '#E8555E' },
      { id: 'rose', hex: '#EF7180' }
    ],
    outline: [
      [350, 90], [420, 66], [492, 72], [562, 98], [618, 142],
      [650, 200], [654, 268], [638, 352], [596, 432], [522, 512],
      [442, 562], [350, 600], [258, 562], [178, 512], [104, 432],
      [62, 352], [46, 268], [50, 200], [82, 142], [138, 98], [208, 72], [280, 66]
    ]
  },
  {
    id: 'peach', faceCenter: { x: 300, y: 310 },
    colors: [
      { id: 'peach', hex: '#FFB59E' },
      { id: 'pink', hex: '#FF9C82' }
    ],
    outline: [
      [300, 62], [368, 82], [428, 112], [478, 168], [502, 238],
      [506, 322], [490, 402], [448, 478], [378, 522], [300, 542],
      [222, 522], [152, 478], [110, 402], [94, 322], [98, 238],
      [122, 168], [172, 112], [232, 82]
    ]
  },
  {
    id: 'tomato', faceCenter: { x: 342, y: 360 },
    colors: [
      { id: 'tomato', hex: '#FF5A4E' },
      { id: 'gold', hex: '#FFB84D' }
    ],
    outline: [
      [342, 152], [400, 132], [460, 136], [528, 168], [580, 232],
      [614, 316], [620, 400], [598, 484], [548, 552], [470, 600],
      [390, 620], [342, 626], [294, 620], [214, 600], [136, 552],
      [86, 484], [64, 400], [70, 316], [104, 232], [156, 168], [224, 136], [284, 132]
    ]
  },
  {
    id: 'orange', faceCenter: { x: 297, y: 272 },
    colors: [
      { id: 'orange', hex: '#FFA545' },
      { id: 'deep', hex: '#F88F2E' }
    ],
    outline: [
      [297, 28], [378, 36], [448, 74], [508, 138], [538, 218],
      [546, 297], [538, 378], [508, 458], [448, 522], [378, 560],
      [297, 568], [216, 560], [146, 522], [86, 458], [56, 378],
      [48, 297], [56, 218], [86, 138], [146, 74], [216, 36]
    ]
  },
  {
    id: 'pear', faceCenter: { x: 397, y: 350 },
    colors: [
      { id: 'green', hex: '#C9D970' },
      { id: 'gold', hex: '#EDC95A' }
    ],
    outline: [
      [397, 60], [432, 68], [458, 92], [480, 132], [492, 178],
      [508, 240], [544, 306], [592, 386], [620, 470], [624, 558],
      [592, 628], [520, 678], [450, 694], [397, 700], [344, 694],
      [274, 678], [202, 628], [170, 558], [174, 470], [202, 386],
      [250, 306], [286, 240], [302, 178], [314, 132], [336, 92], [362, 68]
    ]
  },
  {
    id: 'watermelon', faceCenter: { x: 316, y: 305 },
    colors: [
      { id: 'green', hex: '#6FBE6B' }
    ],
    outline: [
      [316, 64], [398, 76], [472, 114], [536, 180], [574, 262],
      [584, 340], [574, 418], [536, 500], [472, 566], [398, 604],
      [316, 616], [234, 604], [160, 566], [96, 500], [58, 418],
      [48, 340], [58, 262], [96, 180], [160, 114], [234, 76]
    ]
  },
  {
    id: 'grape', faceCenter: { x: 362, y: 350 },
    colors: [
      { id: 'purple', hex: '#9C6BE0' },
      { id: 'green', hex: '#7FC484' }
    ],
    outline: [
      [362, 86], [452, 100], [526, 138], [588, 206], [624, 294],
      [636, 388], [624, 482], [588, 570], [526, 632], [452, 670],
      [362, 684], [272, 670], [198, 632], [136, 570], [100, 482],
      [88, 388], [100, 294], [136, 206], [198, 138], [272, 100]
    ]
  },
  {
    id: 'blueberry', faceCenter: { x: 367, y: 320 },
    colors: [
      { id: 'blue', hex: '#5F6FC8' },
      { id: 'violet', hex: '#6C62B8' }
    ],
    outline: [
      [367, 76], [452, 88], [524, 124], [586, 188], [622, 266],
      [632, 350], [622, 434], [586, 512], [524, 576], [452, 612],
      [367, 624], [282, 612], [210, 576], [148, 512], [112, 434],
      [102, 350], [112, 266], [148, 188], [210, 124], [282, 88]
    ]
  },
  {
    id: 'cherry', faceCenter: { x: 395, y: 360 },
    colors: [
      { id: 'red', hex: '#DE4A54' },
      { id: 'pink', hex: '#EE6A78' }
    ],
    outline: [
      [395, 125], [480, 137], [552, 173], [612, 233], [648, 312],
      [658, 400], [648, 488], [612, 567], [552, 627], [480, 663],
      [395, 675], [310, 663], [238, 627], [178, 567], [142, 488],
      [132, 400], [142, 312], [178, 233], [238, 173], [310, 137]
    ]
  }
];

/* ---------- 归一化：把形状平移到以 (0,0) 为原点的紧凑 viewBox，
   让水果占满画布、表情眼睛相对变小，形状辨识度更高 ---------- */
function normalize(fruit) {
  const xs = fruit.outline.map((p) => p[0]);
  const ys = fruit.outline.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
  const pad = Math.max(10, Math.round(Math.min(w, h) * 0.06));
  const vb = { width: w + pad * 2, height: h + pad * 2 };
  const shift = ([x, y]) => [Math.round(x - minX + pad), Math.round(y - minY + pad)];
  return {
    id: fruit.id,
    viewBox: vb,
    faceCenter: {
      x: fruit.faceCenter.x - minX + pad,
      y: fruit.faceCenter.y - minY + pad
    },
    colors: fruit.colors,
    outline: fruit.outline.map(shift)
  };
}

/* ---------- 组装并写出 characters.json ---------- */
const existing = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'characters.json'), 'utf8'));

const bodyShapes = FRUITS.map((f) => {
  const n = normalize(f);
  return {
    id: n.id,
    viewBox: n.viewBox,
    faceCenter: n.faceCenter,
    svgPath: catmullRomPath(n.outline.map(([x, y]) => ({ x, y }))),
    colors: n.colors
  };
});

const out = {
  bodyShapes,
  eyeStyles: existing.eyeStyles,
  colors: [
    { id: 'red', hex: '#E8544F' },
    { id: 'orange', hex: '#FFA545' },
    { id: 'peach', hex: '#FFB59E' },
    { id: 'green', hex: '#A8C256' },
    { id: 'purple', hex: '#9C6BE0' },
    { id: 'blue', hex: '#5F6FC8' }
  ],
  faceCenterOverrides: []
};

fs.writeFileSync(path.join(root, 'assets', 'characters.json'), JSON.stringify(out));
console.log('已生成水果角色数据:', bodyShapes.length, '种水果 ×', out.eyeStyles.length, '种表情');

/* ---------- 生成预览页（含所有水果 × 颜色、以及全部表情组合） ---------- */
function svgFor(body, eye, colorHex, w = 220) {
  const vb = body.viewBox;
  const h = Math.round(w * vb.height / vb.width);
  const face = body.faceCenter;
  const evb = eye.sourceViewBox;
  const sc = Math.min(vb.width / evb.width, vb.height / evb.height);
  const fx = face.x - eye.eyeCenter.x * sc, fy = face.y - eye.eyeCenter.y * sc;
  const eyeGroup = eye.paths.map((p) => {
    const e = `<path d="${p.svgPath}" fill="${p.color}" transform="translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${sc.toFixed(3)})"/>`;
    return e;
  }).join('');
  return `<svg viewBox="0 0 ${vb.width} ${vb.height}" width="${w}" height="${h}">
<path d="${body.svgPath}" fill="${colorHex}"/>
${eyeGroup}
</svg>`;
}

const parts = [];
FRUITS.forEach((f) => {
  const body = bodyShapes.find((b) => b.id === f.id);
  const eye = existing.eyeStyles[4]; // surprised 大眼睛
  const cards = f.colors.map((c) => {
    const svg = svgFor(body, eye, c.hex);
    return `<div class="card"><div class="cap">${f.id} · ${c.id}</div>${svg}</div>`;
  }).join('');
  parts.push(`<h2>${f.id}</h2><div class="row">${cards}</div>`);
});
const body = bodyShapes[0]; // apple
parts.push('<h2>apple × 全部表情</h2><div class="row">' +
  existing.eyeStyles.map((e) => {
    const svg = svgFor(body, e, '#E8544F');
    return `<div class="card"><div class="cap">${e.id}</div>${svg}</div>`;
  }).join('') + '</div>');

const html = `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"><title>水果预览</title>
<style>
body{font-family:system-ui;margin:24px;background:#faf7f0}
h2{margin:28px 0 8px;font-size:16px}
.row{display:flex;flex-wrap:wrap;gap:12px}
.card{background:#fff;border-radius:12px;padding:10px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.cap{font-size:11px;color:#888;margin-bottom:6px;text-align:center}
</style></head>
<body><h1>水果形状预览</h1>${parts.join('')}</body></html>`;

fs.writeFileSync(path.join(root, 'preview-fruits.html'), html);
console.log('已生成预览页: preview-fruits.html');
