import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { PageWrapper } from "../components/layout/PageWrapper";
import { AuthProvider } from "../lib/authContext";
import { Toaster } from "react-hot-toast";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});


export const metadata: Metadata = {
  title: "R.K Pumps & Motors — Billing",
  description: "GST billing, quotations and stock for R.K Pumps & Motors",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "RK Billing", statusBarStyle: "default" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0E5A7A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable} suppressHydrationWarning>
      <body className="font-sans">
        <AuthProvider>
          <PageWrapper>{children}</PageWrapper>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2500,
              style: { fontSize: 14, borderRadius: 10, background: "#14232B", color: "#fff" },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
