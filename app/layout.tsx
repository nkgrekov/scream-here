import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scream-here.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Хочу кричать? Кричи здесь | Scream Here",
    template: "%s | Scream Here"
  },
  description:
    "Место, где можно прокричаться в браузер: сайт расшифрует крик и ответит. Хочешь кричать? Кричи здесь.",
  keywords: [
    "хочу кричать",
    "хочешь кричать",
    "кричи здесь",
    "прокричаться",
    "орать онлайн",
    "scream here",
    "want to scream",
    "scream into microphone"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Хочешь кричать? Кричи здесь",
    description: "Открой сайт, зажми микрофон и ори. Scream Here расшифрует крик и ответит.",
    url: "/",
    siteName: "Scream Here",
    locale: "ru_RU",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Scream Here",
    description: "Hold to scream. Get a transcript. Get roasted."
  }
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
