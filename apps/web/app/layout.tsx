import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "OpenTools — A Web Standard for LLM Tool Discovery",
  description:
    "An open standard for LLMs to auto-discover and interact with web app APIs using OpenAPI extensions. No plugins, no setup, just a URL.",
};

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
