import type { Metadata } from "next";
import { Titillium_Web, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const titillium = Titillium_Web({
  weight: ['400', '600', '700', '900'],
  subsets: ["latin"],
  variable: "--font-titillium",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "F1 Tipping Competition",
  description: "A tipping competition for Formula 1 fans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${titillium.className} ${geistMono.variable} bg-background text-foreground antialiased min-h-screen`}
      >
        <div className="border-t-4 border-t-f1-red"></div>
        <Navigation />
        <main className="flex flex-col items-center pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
