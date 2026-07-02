import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

/**
 * Wraps the dark-themed app pages (dashboard, add-to-slack) with the shared
 * Nav/Footer. The marketing landing page (app/page.tsx) has its own
 * light-themed Navbar per the design spec and is NOT wrapped in this.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Nav />
      {children}
      <Footer />
    </div>
  );
}
