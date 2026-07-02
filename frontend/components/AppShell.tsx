import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/Footer";

/**
 * Wraps the dashboard/add-to-slack pages with the same Navbar/Footer as
 * every other page, so the whole site shares one visual language instead
 * of the app pages breaking into a separate theme.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
