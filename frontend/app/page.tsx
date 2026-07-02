import { Navbar } from "@/components/landing/Navbar";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { Hero } from "@/components/landing/Hero";

const FEATURES = [
  {
    title: "Encrypted amounts, on-chain",
    body: "Payout amounts are encrypted end to end with Zama's FHEVM (ERC-7984). Balances and transfer amounts stay confidential - only the recipient can decrypt their own balance.",
  },
  {
    title: "Slack-native, private by default",
    body: "Every response is ephemeral or DM-only. Amounts and recipients never get posted to a public channel - not even by accident.",
  },
  {
    title: "Single or batch payouts",
    body: "Run a one-off /payout, or bundle a whole payroll run into one atomic Safe MultiSend transaction with /payroll.",
  },
];

const STEPS = [
  { title: "Add Zamance to Slack", body: "Install via OAuth - each workspace gets its own isolated installation." },
  {
    title: "Deploy your treasury",
    body: "Deploy a ConfidentialPayoutToken and create a Safe, add Zamance as a co-signing owner, then run /setup-treasury.",
  },
  { title: "Pay your team", body: "Use /payout or /payroll from Slack. A second Safe owner signs, Zamance executes and DMs both sides." },
];

export default function Home() {
  return (
    <main className="flex-1" style={{ background: "#FFFFFF", color: "var(--color-text)" }}>
      <div className="relative overflow-hidden">
        <HeroBackground />
        <Navbar />
        <Hero />
      </div>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
          Features
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-6"
              style={{ border: "1px solid rgba(25,40,55,0.1)", background: "var(--color-login-bg)" }}
            >
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm opacity-70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "var(--color-login-bg)" }}>
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white p-6" style={{ border: "1px solid rgba(25,40,55,0.1)" }}>
                <span className="text-sm font-mono" style={{ color: "#7342E2" }}>
                  0{i + 1}
                </span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm opacity-70">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
          No single point of failure
        </h2>
        <p className="mt-4 max-w-2xl text-sm opacity-70">
          Zamance is one signer on your team&apos;s Gnosis Safe. It can propose a payout and
          co-sign, but a human owner must always add the second signature before anything
          executes - the bot alone can never move funds.
        </p>
        <a href="/security" className="mt-4 inline-block text-sm underline" style={{ color: "#7342E2" }}>
          Full security model &rarr;
        </a>
      </section>

      <footer className="px-6 py-8 text-sm opacity-50" style={{ borderTop: "1px solid rgba(25,40,55,0.1)" }}>
        <div className="mx-auto max-w-5xl">
          Zamance runs on Ethereum Sepolia with encrypted amounts via Zama FHEVM. Custody sits in
          a Gnosis Safe multisig - Zamance can propose a payout but never move funds alone.
        </div>
      </footer>
    </main>
  );
}
