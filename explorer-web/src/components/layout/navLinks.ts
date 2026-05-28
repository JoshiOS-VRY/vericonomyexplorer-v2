export type SidebarItem = {
  href: string;
  label: string;
  icon: "overview" | "explorer" | "richlist" | "leaderboard" | "blocks" | "api";
  exact?: boolean;
  prefix?: boolean;
  section?: "explorer" | "data";
};

export type HeaderNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  prefix?: boolean;
};

export const headerNav: HeaderNavItem[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/vrm", label: "Verium", prefix: true },
  { href: "/vrc", label: "Vericoin", prefix: true },
  { href: "/vrm/richlist", label: "Richlist" },
  { href: "/vrm/leaderboard", label: "Leaderboard", prefix: true },
  { href: "/api/docs", label: "API", prefix: true },
];

export const sidebarNav: SidebarItem[] = [
  { href: "/", label: "Home", icon: "overview", exact: true, section: "explorer" },
  { href: "/vrm", label: "Verium", icon: "explorer", prefix: true, section: "explorer" },
  { href: "/vrc", label: "Vericoin", icon: "explorer", prefix: true, section: "explorer" },
  { href: "/vrm/richlist", label: "Richlist", icon: "richlist", section: "explorer" },
  { href: "/vrm/leaderboard", label: "Leaderboard", icon: "leaderboard", section: "explorer" },
  { href: "/blocks", label: "Block list", icon: "blocks", prefix: true, section: "data" },
  { href: "/api/docs", label: "API", icon: "api", section: "data" },
];
