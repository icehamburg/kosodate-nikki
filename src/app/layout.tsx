import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "子育て日記",
  description: "毎日の成長を記録しよう",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "子育て日記",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased">
        <header
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#EFEDE1', // ベージュ系
            borderBottom: '2px solid #6B8E23', // オリーブグリーン
            borderRadius: '0 0 24px 24px', // 下側角丸
            fontFamily: 'Arial Rounded MT Bold, LINE Seed JP_TTF, sans-serif',
            fontWeight: 700,
            fontSize: 22,
            color: '#6B8E23', // オリーブグリーン
            letterSpacing: 1,
            boxShadow: '0 2px 8px rgba(107,142,35,0.08)',
          }}
        >
          子育て日記
        </header>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                })
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
