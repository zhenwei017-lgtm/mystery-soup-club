import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "谜雾汤馆｜朋友聚会海龟汤",
  description: "挑选谜题、向 AI 裁判提问，或把你的灵感熬成一碗全新的海龟汤。",
  openGraph: {
    title: "谜雾汤馆｜朋友聚会海龟汤",
    description: "每一个问题，都离真相更近一点。",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "谜雾汤馆案卷封面" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "谜雾汤馆｜朋友聚会海龟汤",
    description: "每一个问题，都离真相更近一点。",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
