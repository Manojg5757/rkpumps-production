import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Motor POS System",
  description: "Point-of-Sale and Inventory Management",
  icons: {
    icon: "https://firebasestorage.googleapis.com/v0/b/rkpumps-79028.firebasestorage.app/o/ChatGPT%20Image%20May%2016%2C%202026%2C%2005_57_40%20PM.png?alt=media&token=19221627-85b2-4de3-80a6-c7af262a8cb2",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PageWrapper>
          {children}
        </PageWrapper>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
