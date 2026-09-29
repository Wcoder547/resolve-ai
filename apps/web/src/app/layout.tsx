import type { Metadata } from "next";
import { Manrope, JetBrains_Mono, Sora } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ResolveAI",
    template: "%s · ResolveAI",
  },
  description:
    "Grounded AI support for your company knowledge — with citations, human approval, and full agent traces.",
  icons: {
    icon: [
      { url: "/brand/resolveai-mark.svg", type: "image/svg+xml" },
      { url: "/brand/resolveai-mark.png", type: "image/png", sizes: "128x128" },
    ],
    apple: [{ url: "/brand/resolveai-mark.png", sizes: "128x128" }],
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
      suppressHydrationWarning
      className={`${manrope.variable} ${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
