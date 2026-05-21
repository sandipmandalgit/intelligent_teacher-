import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

// Inter — English UI text
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Noto Sans Bengali — Bengali script text
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShikshakSathi — AI grading assistant for teachers",
  description:
    "Scan a handwritten answer sheet and get instant AI-powered grading, with feedback in English and Bengali plus audio playback. Built for India's teachers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${notoSansBengali.variable}`}
    >
      <body className="font-sans antialiased">
        {/* reducedMotion="user" makes every framer-motion animation respect
            the OS "reduce motion" accessibility setting. */}
        <MotionConfig reducedMotion="user">
          <Navbar />
          {children}
        </MotionConfig>
        <Toaster />
      </body>
    </html>
  );
}
