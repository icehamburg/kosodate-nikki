import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import AppProvider from "@/components/AppProvider";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7EBDB" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1614" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=LINE+Seed+JP:wght@400;700&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('theme-preference');
                  var isDark = mode === 'dark' || (mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (mode === 'dark') document.documentElement.classList.add('dark');
                  else if (mode === 'light') document.documentElement.classList.add('light');
                  var bg = isDark ? '#1A1614' : '#F7EBDB';
                  document.documentElement.style.backgroundColor = bg;
                  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased" style={{ background: 'var(--background)' }}>
        <ThemeProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </ThemeProvider>
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
