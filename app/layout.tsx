import type { Metadata } from "next";
import localFont from "next/font/local";
import { generateThemeScript } from "@thesandybridge/themes";
import { ThemeProvider } from "@/components/theme-provider";
import { DynamicFavicon, type FaviconDrawFn } from "@thesandybridge/ui/components";
import "./globals.css";

const drawLayersIcon: FaviconDrawFn = (ctx, size, accent) => {
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Scale from 24-unit viewBox to 32px canvas
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
  // Top layer (filled)
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

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "dnd-block-tree | Drag-and-Drop Block Trees",
  description: "A headless React library for building hierarchical drag-and-drop interfaces",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
        <script dangerouslySetInnerHTML={{ __html: generateThemeScript() }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <DynamicFavicon draw={drawLayersIcon} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
