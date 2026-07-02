export function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-foreground/50">
        Zamance runs on Ethereum Sepolia with encrypted amounts via Zama FHEVM. Custody sits in a
        Gnosis Safe multisig - Zamance can propose a payout but never move funds alone.
      </div>
    </footer>
  );
}
