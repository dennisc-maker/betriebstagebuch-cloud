import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Betriebstagebuch · NVB Birkenfeld",
  description: "Nahverkehrsbetriebe Birkenfeld GmbH - Betriebstagebuch der disporelevanten Aktionen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" data-theme="light" data-density="regular">
      <body>{children}</body>
    </html>
  );
}
