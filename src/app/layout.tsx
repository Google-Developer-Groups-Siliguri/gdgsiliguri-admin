import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GDG Siliguri Admin",
  description: "Content management for gdgsiliguri.com",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
