import type { Metadata } from "next";
import { Syne, Outfit, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-syne",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "RaktaSetu NOOR",
  description: "Clinical AI platform for Thalassemia blood management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable} ${jetbrainsMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#050508] text-slate-100 font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
