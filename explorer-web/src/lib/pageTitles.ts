export function getPageTitle(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/';

  if (path === '/') return 'Vericonomy Explorer';
  if (path === '/vrm') return 'Verium Explorer';
  if (path.startsWith('/vrm/richlist')) return 'Richlist';
  if (path.startsWith('/vrm/miners')) return 'Top Miners';
  if (path.startsWith('/vrm/leaderboard')) return 'Leaderboard';
  if (path.startsWith('/vrm/peers') || path.startsWith('/vrc/peers')) return 'Peers';
  if (path.startsWith('/vrm/block/') || path.startsWith('/vrc/block/')) return 'Block Detail';
  if (path.startsWith('/vrm/tx/') || path.startsWith('/vrc/tx/')) return 'Transaction';
  if (path.startsWith('/vrm/address/') || path.startsWith('/vrc/address/')) return 'Address';
  if (path === '/vrc') return 'VeriCoin Explorer';
  if (path.startsWith('/insights')) return 'Insights';
  if (path.startsWith('/blocks')) return 'Blocks';
  if (path.startsWith('/api/docs')) return 'API';
  if (path.startsWith('/search')) return 'Search';
  if (path.startsWith('/admin')) return 'Admin';
  return 'Vericonomy Explorer';
}
