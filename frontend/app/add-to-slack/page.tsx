import { AppShell } from "@/components/AppShell";
import { SlackButton } from "@/components/SlackButton";
import { SLACK_INSTALL_URL } from "@/lib/config";

const REQUIREMENTS = [
  "A workspace admin to approve the install (Zamance requests commands, chat:write, im:write, users:read).",
  "A Sepolia-funded deployer key to deploy your own ConfidentialPayoutToken contract.",
  "A Gnosis Safe (2-of-N or higher) with Zamance added as one co-signing owner.",
];

export default function AddToSlackPage() {
  return (
    <AppShell>
    <main className="mx-auto max-w-2xl flex-1 px-6 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Add Zamance to your Slack</h1>
      <p className="mt-4 text-foreground/70">
        Installing gives your workspace its own isolated Zamance install - a separate database
        row, a separate treasury, no data shared with any other team.
      </p>

      <div className="mt-10 flex justify-center">
        <SlackButton href={SLACK_INSTALL_URL} />
      </div>

      <div className="mt-16 rounded-2xl border border-border p-6 text-left">
        <h2 className="font-semibold">Before you install, you&apos;ll need:</h2>
        <ul className="mt-4 space-y-3 text-sm text-foreground/70">
          {REQUIREMENTS.map((r) => (
            <li key={r} className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-foreground/50">
          Zamance never deploys a Safe or a token on your behalf - your team keeps full control
          over its own on-chain treasury. Once installed, run <code>/setup-treasury</code> in
          Slack to connect it.
        </p>
      </div>
    </main>
    </AppShell>
  );
}
