import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { generateThemeScript } from "@thesandybridge/themes";
import { ThemeProvider } from "@/components/theme-provider";
import { Favicon } from "@/components/favicon";
import "./globals.css";

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
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
        <script dangerouslySetInnerHTML={{ __html: generateThemeScript() }} />
        {umamiUrl && umamiId && (
          <Script
            async
            src={umamiUrl}
            data-website-id={umamiId}
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <Favicon />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
