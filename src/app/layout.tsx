import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { PwaRegister } from "@/components/pwa-register";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "GATE CS 2027",
  description: "Office-week study log for GATE CS 2027",
  applicationName: "GATE CS 2027",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GATE 2027",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3efe6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} min-h-dvh antialiased`}>
        <PwaRegister />
        <Nav />
        <main className="mx-auto max-w-5xl px-3 py-4 pb-[calc(8.25rem+env(safe-area-inset-bottom))] sm:px-4 md:py-8 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
