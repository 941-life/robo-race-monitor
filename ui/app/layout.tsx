import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GADIS Monitor",
  description: "ROS Robot Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${inter.variable} h-full`}>
      <body className="h-full bg-[#1a2129] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
