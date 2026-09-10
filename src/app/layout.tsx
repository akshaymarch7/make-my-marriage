import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({
  src: [
    { path: "../../public/fonts/manrope-400-normal.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/manrope-600-normal.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/manrope-700-normal.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-manrope",
  display: "swap",
});
const playfair = localFont({
  src: [
    { path: "../../public/fonts/playfair-500-normal.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/playfair-500-italic.ttf", weight: "500", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Make My Marriage",
    template: "%s | Make My Marriage",
  },
  description: "A shared workspace for planning every part of your wedding.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
