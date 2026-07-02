import type { Metadata } from "next";
import { LandingPageShell } from "@/components/landing/LandingPageShell";

export const metadata: Metadata = { title: "Docs - Zamance" };

const COMMANDS = [
  { cmd: "/register-wallet <address>", body: "Registers your Sepolia payout address. Everyone who sends or receives a payout runs this once, including Safe owners." },
  { cmd: "/setup-treasury <safeAddress> <tokenAddress>", body: "Workspace admin only. Connects your team's already-deployed Safe and ConfidentialPayoutToken." },
  { cmd: "/payout", body: "Opens a modal to propose a single private payout." },
  { cmd: "/payroll", body: "Opens a modal for a batch payroll run, bundled into one atomic Safe transaction." },
  { cmd: "/fund-treasury <amount>", body: "Safe owners only. Mints encrypted supply into the treasury." },
  { cmd: "/payout-status <id>", body: "Ephemeral status lookup for a payout or payroll run." },
];

const STEPS = [
  { title: "Add Zamance to Slack", body: "Real OAuth install - each workspace gets its own isolated data." },
  { title: "Deploy your own token", body: "Deploy ConfidentialPayoutToken (contracts/) to Sepolia with your own funded deployer key." },
  { title: "Create a Safe", body: "At app.safe.global - add Zamance's bot signer address as an owner, threshold >= 2-of-N." },
  { title: "Connect it", body: "Run /setup-treasury <safeAddress> <tokenAddress> in Slack." },
  { title: "Fund and pay", body: "/fund-treasury to mint supply, then /payout or /payroll to send it." },
];

export default function DocsPage() {
  return (
    <LandingPageShell>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
        Docs
      </h1>
      <p className="mt-4 opacity-70">
        Zamance is self-hosted per workspace right now - there's no shared multi-team backend to
        sign up for beyond installing the Slack app. The full setup guide (running the bot
        backend, the Slack app manifest, Hardhat deployment) lives in the repo README; this page
        covers the parts relevant once it's already running.
      </p>

      <h2 className="mt-12 text-xl font-semibold">Onboarding a workspace</h2>
      <ol className="mt-4 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="font-mono text-sm" style={{ color: "#7342E2" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-sm opacity-70">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-xl font-semibold">Slash commands</h2>
      <div className="mt-4 space-y-4">
        {COMMANDS.map((c) => (
          <div key={c.cmd} className="rounded-xl p-4" style={{ border: "1px solid rgba(25,40,55,0.1)" }}>
            <code className="text-sm font-semibold" style={{ color: "#7342E2" }}>
              {c.cmd}
            </code>
            <p className="mt-1 text-sm opacity-70">{c.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-sm opacity-50">
        Full source, contract details, and deploy scripts:{" "}
        <a href="https://github.com/PhantomTee/Zamance" className="underline">
          github.com/PhantomTee/Zamance
        </a>
        .
      </p>
    </LandingPageShell>
  );
}
