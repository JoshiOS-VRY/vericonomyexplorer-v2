export type SidebarItem = {
  href: string;
  label: string;
  icon: "overview" | "explorer" | "richlist" | "leaderboard" | "blocks" | "tools" | "api";
  exact?: boolean;
  prefix?: boolean;
  section?: "explorer" | "data";
};

export const sidebarNav: SidebarItem[] = [
  { href: "/", label: "Overview", icon: "overview", exact: true, section: "explorer" },
  { href: "/vrm", label: "Verium", icon: "explorer", prefix: true, section: "explorer" },
  { href: "/vrm/richlist", label: "Richlist", icon: "richlist", section: "explorer" },
  { href: "/vrm/leaderboard", label: "Leaderboard", icon: "leaderboard", section: "explorer" },
  { href: "/blocks", label: "Block list", icon: "blocks", prefix: true, section: "data" },
  { href: "/tools", label: "Tools", icon: "tools", section: "data" },
  { href: "/api/docs", label: "API", icon: "api", section: "data" },
];
