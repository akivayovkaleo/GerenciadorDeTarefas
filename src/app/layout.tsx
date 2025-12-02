import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gerenciador de Mercearia",
  description: "Um aplicativo para gerenciar as finanças da sua mercearia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex bg-gray-100`}>
        <Sidebar />
        <main className="flex-grow">
          <div className="p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
