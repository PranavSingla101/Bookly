/**
 * This root layout configures global app scaffolding: fonts, base metadata,
 * theme provider, and Clerk provider wrapping all pages. It defines shared
 * html/body classes used across the entire UI.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PwaRegister } from "@/components/providers/pwa-register";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookly",
  description: "Upload, manage, and read your EPUB library from any device.",
  icons: {
    icon: "/bookly logo no bg.png",
    apple: "/bookly logo no bg.png",
  },
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Bookly",
    "theme-color": "#09090b",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        figtree.variable,
        "dark"
      )}
    >
      <body className="min-h-full bg-background text-foreground">
        <ClerkProvider>
          <ThemeProvider>{children}</ThemeProvider>
          <PwaRegister />
        </ClerkProvider>
      </body>
    </html>
  );
}
