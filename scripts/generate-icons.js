const sharp = require('sharp');
const path = require('path');

const sizes = [192, 512];

// シンプルな緑背景のアイコンを生成
async function generateIcons() {
  for (const size of sizes) {
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#4ade80"/>
        <text
          x="${size / 2}"
          y="${size * 0.68}"
          font-size="${size * 0.5}"
          text-anchor="middle"
          fill="white"
        >&#x1F476;</text>
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(__dirname, `../public/icons/icon-${size}.png`));

    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons().catch(console.error);
