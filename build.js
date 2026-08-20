#!/usr/bin/env node
// 把从 vellum.ai 提取的角色数据（10 种身体 × 9 种表情 × 6 种颜色，含 SVG 路径）
// 注入到 index.html 的占位符中。用法：node build.js
const fs = require('fs');
const path = require('path');

const root = __dirname;
const characters = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'characters.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const marker = '/*__CHARACTERS_JSON__*/';
if (!html.includes(marker)) {
  console.error('占位符未找到:', marker);
  process.exit(1);
}

const json = JSON.stringify(characters).replace(/</g, '\\u003c'); // 防 XSS/解析问题
const out = html.replace(marker, json);
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log('已注入角色数据:', characters.bodyShapes.length, '种身体,',
  characters.eyeStyles.length, '种表情,', characters.colors.length, '种颜色');
