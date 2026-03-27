import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hostlyx1.netlify.app"),
  title: "Hostlyx | Short-Term Rental Accounting Dashboard",
  description:
    "Upload short-term rental booking and expense workbooks, normalize the data, and explore revenue, payout, and profitability in one clean dashboard.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Hostlyx | Short-Term Rental Accounting Dashboard",
    description:
      "Upload short-term rental booking and expense workbooks, normalize the data, and explore revenue, payout, and profitability in one clean dashboard.",
    url: "https://hostlyx1.netlify.app",
    siteName: "Hostlyx",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hostlyx | Short-Term Rental Accounting Dashboard",
    description:
      "Upload short-term rental booking and expense workbooks, normalize the data, and explore revenue, payout, and profitability in one clean dashboard.",
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
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
