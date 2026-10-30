import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "BriefPay AI — From vague to paid",
    template: "%s · BriefPay AI",
  },
  description:
    "Turn vague client requests into structured proposals and verified PayPal payments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.variable} ${fraunces.variable} ${plexMono.variable} flex min-h-full flex-col font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
