import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opptra — Brand Health Agent",
  description: "AI category-management workflow for detecting emerging product issues from marketplace reviews",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
