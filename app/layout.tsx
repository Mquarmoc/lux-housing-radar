import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luxembourg Housing Radar",
  description: "Real-time apartment scanner for Luxembourg relocation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
