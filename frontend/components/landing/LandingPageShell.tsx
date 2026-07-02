import { Navbar } from "./Navbar";

/**
 * Light-themed shell for marketing/info pages (docs, security, privacy,
 * support) - same visual language as the homepage, distinct from the dark
 * AppShell used for the dashboard/add-to-slack functional pages.
 */
export function LandingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1" style={{ background: "#FFFFFF", color: "var(--color-text)" }}>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-16">{children}</div>
      <footer className="px-6 py-8 text-sm opacity-50" style={{ borderTop: "1px solid rgba(25,40,55,0.1)" }}>
        <div className="mx-auto max-w-5xl">
          Zamance runs on Ethereum Sepolia with encrypted amounts via Zama FHEVM. Custody sits in
          a Gnosis Safe multisig - Zamance can propose a payout but never move funds alone.
        </div>
      </footer>
    </main>
  );
}
