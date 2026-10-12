import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Leaf & Loam",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
            <Link href="/" className="font-semibold">
              Leaf &amp; Loam
            </Link>
            <div className="flex gap-4">
              <Link href="/admin">Admin</Link>
              <Link href="/cart">Cart</Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}
