import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "FMEA Workbench",
  description:
    "Structure QA workbench for FMEA Agent responses (Requirements, DFMEA, PFMEA).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
