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
    icon: "https://firebasestorage.googleapis.com/v0/b/rkpumps-79028.firebasestorage.app/o/rkpumpslogo.webp?alt=media&token=fd05d40d-4c59-401b-ba6b-3918230bbf59",
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
