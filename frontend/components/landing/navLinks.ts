export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Docs", href: "https://github.com/PhantomTee/Zamance" },
];
