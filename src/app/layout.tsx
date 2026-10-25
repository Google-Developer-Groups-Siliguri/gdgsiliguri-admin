import type { Metadata, Viewport } from "next";
import { Manrope, Urbanist } from "next/font/google";
import localFont from "next/font/local";

import { Providers } from "@/components/Providers";
import { THEME_BOOTSTRAP_SCRIPT } from "@/components/theme/theme";

import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const materialSymbols = localFont({
  src: "../../node_modules/material-symbols/material-symbols-rounded.woff2",
  variable: "--font-material-symbols",
  weight: "100 700",
  display: "block",
  preload: true,
});

export const metadata: Metadata = {
  title: { default: "GDG Siliguri Admin", template: "%s · GDG Siliguri Admin" },
  description: "Content management for gdgsiliguri.com",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6FBF6" },
    { media: "(prefers-color-scheme: dark)", color: "#111411" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${urbanist.variable} ${manrope.variable} ${materialSymbols.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
