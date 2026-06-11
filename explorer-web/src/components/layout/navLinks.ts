export type SidebarItem = {
  href: string;
  label: string;
  icon: 'overview' | 'explorer' | 'richlist' | 'leaderboard' | 'blocks' | 'api' | 'insights';
  exact?: boolean;
  prefix?: boolean;
  section?: 'explorer' | 'data';
};

export type HeaderNavLinkItem = {
  type: 'link';
  href: string;
  label: string;
  exact?: boolean;
  prefix?: boolean;
};

export type HeaderNavDropdownItem = {
  type: 'dropdown';
  label: string;
  prefix?: boolean;
  items: { href: string; label: string }[];
};

export type HeaderNavItem = HeaderNavLinkItem | HeaderNavDropdownItem;

export const headerNav: HeaderNavItem[] = [
  { type: 'link', href: '/', label: 'Home', exact: true },
  {
    type: 'dropdown',
    label: 'Verium',
    prefix: true,
    items: [
      { href: '/vrm', label: 'Explore' },
      { href: '/vrm/richlist', label: 'Richlist' },
      { href: '/vrm/miners', label: 'Miners' },
      { href: '/vrm/leaderboard', label: 'Leaderboard' },
      { href: '/vrm/peers', label: 'Peers' },
    ],
  },
  {
    type: 'dropdown',
    label: 'Vericoin',
    prefix: true,
    items: [
      { href: '/vrc', label: 'Explore' },
      { href: '/vrc/richlist', label: 'Richlist' },
      { href: '/vrc/peers', label: 'Peers' },
    ],
  },
  { type: 'link', href: '/insights', label: 'Insights', prefix: true },
];

export const sidebarNav: SidebarItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: 'overview',
    exact: true,
    section: 'explorer',
  },
  {
    href: '/vrm',
    label: 'Verium',
    icon: 'explorer',
    prefix: true,
    section: 'explorer',
  },
  {
    href: '/vrc',
    label: 'Vericoin',
    icon: 'explorer',
    prefix: true,
    section: 'explorer',
  },
  {
    href: '/insights',
    label: 'Insights',
    icon: 'insights',
    prefix: true,
    section: 'explorer',
  },
  {
    href: '/vrm/richlist',
    label: 'Richlist',
    icon: 'richlist',
    section: 'explorer',
  },
  {
    href: '/vrm/miners',
    label: 'Miners',
    icon: 'leaderboard',
    section: 'explorer',
  },
  {
    href: '/vrm/leaderboard',
    label: 'Leaderboard',
    icon: 'leaderboard',
    section: 'explorer',
  },
  {
    href: '/blocks',
    label: 'Block list',
    icon: 'blocks',
    prefix: true,
    section: 'data',
  },
  { href: '/api/docs', label: 'API', icon: 'api', section: 'data' },
];
