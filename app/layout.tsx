import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PostHogProvider } from "@/components/posthog-provider";
import { ConsentBanner } from "@/components/consent-banner";
import { SkipLink } from "@/components/skip-link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TapTicket",
  description: "Scan a ticket and split it easily",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TapTicket",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf3f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <SkipLink />
          <PostHogProvider>
            <div id="main" className="flex min-h-full flex-1 flex-col">
              {children}
            </div>
          </PostHogProvider>
          <Toaster />
          <ConsentBanner />
        </I18nProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
