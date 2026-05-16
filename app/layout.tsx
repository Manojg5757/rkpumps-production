import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Motor POS System",
  description: "Point-of-Sale and Inventory Management",
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
