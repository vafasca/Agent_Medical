import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "SalesBot AI - Ventas de Cursos Médicos",
  description: "Sistema de automatización de ventas con IA para cursos médicos. Chatbot inteligente con CRM integrado.",
  keywords: ["cursos médicos", "chatbot", "CRM", "automatización", "IA", "ventas"],
  authors: [{ name: "SalesBot AI" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
