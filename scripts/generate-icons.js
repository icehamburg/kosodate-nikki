const sharp = require('sharp');
const path = require('path');

const sizes = [192, 512];

// 赤ちゃんの顔のアイコンを生成
async function generateIcons() {
  for (const size of sizes) {
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#D97757"/>
        <!-- 赤ちゃんの顔 -->
        <circle cx="${size / 2}" cy="${size * 0.52}" r="${size * 0.32}" fill="#FFEAA7"/>
        <!-- 髪の毛 -->
        <ellipse cx="${size / 2}" cy="${size * 0.28}" rx="${size * 0.18}" ry="${size * 0.1}" fill="#5D4E37"/>
        <!-- 左目 -->
        <circle cx="${size * 0.38}" cy="${size * 0.48}" r="${size * 0.04}" fill="#333"/>
        <!-- 右目 -->
        <circle cx="${size * 0.62}" cy="${size * 0.48}" r="${size * 0.04}" fill="#333"/>
        <!-- ほっぺ左 -->
        <circle cx="${size * 0.32}" cy="${size * 0.58}" r="${size * 0.05}" fill="#FFB6B6" opacity="0.6"/>
        <!-- ほっぺ右 -->
        <circle cx="${size * 0.68}" cy="${size * 0.58}" r="${size * 0.05}" fill="#FFB6B6" opacity="0.6"/>
        <!-- 口（笑顔） -->
        <path d="M ${size * 0.42} ${size * 0.62} Q ${size / 2} ${size * 0.7} ${size * 0.58} ${size * 0.62}" stroke="#333" stroke-width="${size * 0.015}" fill="none" stroke-linecap="round"/>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(__dirname, `../public/icons/icon-${size}.png`));

    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons().catch(console.error);
