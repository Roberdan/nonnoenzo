import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NonnoEnzo — Il tuo compagno di storie",
  description: "Un amico digitale con cui parlare, raccontare e ricordare.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 3,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen flex flex-col items-center justify-center p-6">
        {children}
      </body>
    </html>
  );
}
