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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tapticket.es";

// Spanish copy on purpose: the i18n provider defaults to "es", so this is the
// language crawlers see in the prerendered HTML (<html lang="es">).
const title = "TapTicket - Escanea un ticket, divide la cuenta";
const description =
  "Haz una foto, comparte un enlace y tus amigos eligen lo suyo. Las cuentas se hacen solas.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · TapTicket",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "TapTicket",
    title,
    description,
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
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
