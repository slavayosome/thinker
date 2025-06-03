import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientWrapper } from "@/components/ClientWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thinker - AI-Powered Content Creator",
  description: "Transform articles into engaging social media content with AI. Analyze any article and generate optimized hooks, quotes, insights, and more.",
  keywords: ["AI", "content creation", "social media", "article analysis", "content marketing"],
  authors: [{ name: "Slava Nikitin" }],
  openGraph: {
    title: "Thinker - AI-Powered Content Creator",
    description: "Transform articles into engaging social media content with AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Thinker - AI-Powered Content Creator",
    description: "Transform articles into engaging social media content with AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
