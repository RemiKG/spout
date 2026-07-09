import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import SvgDefs from "@/components/SvgDefs";
import Topbar from "@/components/Topbar";
import ConnectModal from "@/components/ConnectModal";
import Toasts from "@/components/Toasts";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://spout.local"),
  title: "Spout — watch the leaks close",
  description:
    "Drop in a bank or card statement. A little plumber decodes the cryptic recurring charges, finds the silent ones, and shuts the ones you okay — then argues with the 'please don't go' screens for you. You just nod.",
  applicationName: "Spout",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Spout — a subscription is a faucet you forgot to close",
    description: "Drop your statement. Watch the leaks close. Your money, your call.",
    images: ["/art/thumbnail.png"],
  },
  icons: { icon: "/icon.svg", apple: "/art/wordmark-mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#F4F1EA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <SvgDefs />
          <div className="app">
            <Topbar />
            {children}
          </div>
          <ConnectModal />
          <Toasts />
        </StoreProvider>
      </body>
    </html>
  );
}
