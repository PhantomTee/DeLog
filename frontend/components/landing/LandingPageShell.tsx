import { Navbar } from "./Navbar";
import { Footer } from "@/components/Footer";

/**
 * Shell for marketing/info pages (docs, security, privacy, support) - same
 * Navbar/Footer as the rest of the site, content sits on the shared
 * SiteBackground rather than a page-local solid color.
 */
export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">{children}</main>
      <Footer />
    </div>
  );
}
