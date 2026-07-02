import Link from "next/link";

const FEATURES = [
  {
    title: "Encrypted amounts, on-chain",
    body: "Payout amounts are encrypted end to end with Zama's FHEVM (ERC-7984). Balances and transfer amounts stay confidential - only the recipient can decrypt their own balance.",
  },
  {
    title: "No single point of failure",
    body: "Zamance is one signer on your team's Gnosis Safe. It can propose a payout and co-sign, but a human owner must always add the second signature before anything executes.",
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
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <p className="mx-auto mb-6 inline-block rounded-full border border-border px-4 py-1 text-xs uppercase tracking-widest text-accent-soft">
          Ethereum Sepolia &middot; Zama FHEVM &middot; Gnosis Safe
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Private team payouts,
          <br />
          run from Slack.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/70">
          Zamance is a payout bot for Slack teams. Amounts stay encrypted on-chain, custody stays
          in a multisig your team controls - the bot alone can never move funds.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/add-to-slack"
            className="rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-soft"
          >
            Add to Slack
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-border px-6 py-3 font-medium hover:border-accent-soft"
          >
            View dashboard
          </Link>
        </div>
      </section>

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-background/60 p-6">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-foreground/70">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border p-6">
              <span className="text-sm font-mono text-accent-soft">0{i + 1}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-foreground/70">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
