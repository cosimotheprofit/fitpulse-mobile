import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-font-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "FitPulse Gym Log",
  description: "Minimalist offline-capable phone logger for gym workouts",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitPulse Gym",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full bg-zinc-950 text-zinc-100">
      <body className={`${geistSans.variable} font-sans antialiased h-full select-none overscroll-none`}>
        {children}
      </body>
    </html>
  );
}
