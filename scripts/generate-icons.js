const sharp = require('sharp');
const path = require('path');

const sizes = [192, 512];

// シンプルな緑背景のアイコンを生成（絵文字なしバージョン）
async function generateIcons() {
  for (const size of sizes) {
    // 絵文字はSVGでレンダリングできないため、シンプルな赤ちゃんの顔のシルエットを使用
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#D97757"/>
        <!-- 赤ちゃんの顔のシルエット -->
        <circle cx="${size / 2}" cy="${size * 0.45}" r="${size * 0.28}" fill="white"/>
        <!-- 体 -->
        <ellipse cx="${size / 2}" cy="${size * 0.85}" rx="${size * 0.25}" ry="${size * 0.18}" fill="white"/>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(__dirname, `../public/icons/icon-${size}.png`));

    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons().catch(console.error);
