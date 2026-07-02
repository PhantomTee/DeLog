"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const TAGLINES = [
  "Pay Your Team, Privately",
  "Encrypted On-Chain",
  "Slack-Native Payouts",
  "Multisig-Secured, Always",
];

const ROTATE_MS = 3500;

export function RotatingHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % TAGLINES.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      className="relative flex items-center justify-center text-center"
      style={{ minHeight: "2.2em" }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={TAGLINES[index]}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {TAGLINES[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
