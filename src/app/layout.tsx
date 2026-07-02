import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Anton, Space_Mono, Anton_SC } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/shared/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: ["400"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"]
});

const antonSC = Anton_SC({
  variable: "--font-anton-sc",
  subsets: ["latin"],
  weight: ["400"]
});

export const metadata: Metadata = {
  title: "InternHQ - Career Command Center",
  description: "Manage every stage of your internship journey from discovery to offer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const grainUri = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${anton.variable} ${spaceMono.variable} ${antonSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white selection:bg-white/30 selection:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="relative min-h-screen flex flex-col overflow-hidden">
            {/* Global Grain overlay */}
            <div
              style={{
                backgroundImage: grainUri,
                backgroundSize: '200px 200px',
                backgroundRepeat: 'repeat',
                opacity: 0.4,
              }}
              className="absolute inset-0 pointer-events-none z-50"
            />
            <main className="flex-1 flex flex-col relative z-10">{children}</main>
            <CommandPalette />
            <Toaster richColors position="top-right" closeButton />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

