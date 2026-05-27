import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web Template",
  description: "Client-side Next.js monorepo template",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
