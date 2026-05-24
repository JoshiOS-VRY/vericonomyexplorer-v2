export function getPageTitle(pathname: string): string {
  const path = pathname.replace(/\/$/, "") || "/";

  if (path === "/") return "VeriConomy Explorer";
  if (path === "/vrm") return "Verium Explorer";
  if (path.startsWith("/vrm/richlist")) return "Richlist";
  if (path.startsWith("/vrm/leaderboard")) return "Leaderboard";
  if (path.startsWith("/vrm/block/")) return "Block Detail";
  if (path.startsWith("/vrm/tx/")) return "Transaction";
  if (path.startsWith("/vrm/address/")) return "Address";
  if (path.startsWith("/blocks")) return "Blocks";
  if (path.startsWith("/tools")) return "Tools";
  if (path.startsWith("/api/docs")) return "API";
  if (path.startsWith("/search")) return "Search";
  if (path.startsWith("/admin")) return "Admin";
  return "VeriConomy Explorer";
}
