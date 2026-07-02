import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zamance - Private team payouts for Slack",
  description:
    "Zamance processes team payments on Slack with encrypted amounts (Zama FHEVM) and Gnosis Safe multisig custody on Ethereum Sepolia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Helvetica Now Display Bold - heading font, loaded per design spec */}
        <link
          href="https://db.onlinewebfonts.com/c/04e6981992c0e2e7642af2074ebe3901?family=Helvetica+Now+Display+Bold"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
