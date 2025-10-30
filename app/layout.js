import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "HireAI - AI-Powered Recruitment Platform",
    template: "%s | HireAI"
  },
  description: "Revolutionary AI-powered recruitment platform connecting top talent with companies. Features VR interviews, intelligent job matching, and automated screening.",
  keywords: ["AI recruitment", "job matching", "VR interviews", "career development", "HR technology"],
  authors: [{ name: "HireAI" }],
  openGraph: {
    title: "HireAI - AI-Powered Recruitment Platform",
    description: "Revolutionary AI-powered recruitment platform with VR interviews and intelligent job matching.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HireAI - AI-Powered Recruitment Platform",
    description: "Revolutionary AI-powered recruitment platform with VR interviews and intelligent job matching.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}