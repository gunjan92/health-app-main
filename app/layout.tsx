import "./globals.css";

export const metadata = {
  title: "Reset (Beta) — Mind·Body·Mood",
  description: "Tiny daily system for mind, body, and mood.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="bg-primary text-white shadow-md">
          <div className="max-w-5xl mx-auto px-4 py-4 font-semibold">Reset (Beta)</div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6 md:py-10">{children}</main>
      </body>
    </html>
  );
}
