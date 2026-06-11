import {
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  getSiteUrl,
} from '@/lib/seo/site';

export function organizationJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vericonomy',
    url: 'https://www.vericonomy.com',
    logo: `${siteUrl}/img/vericonomy/verium-logo.svg`,
    description: SITE_DESCRIPTION,
    knowsAbout: [
      'Vericonomy',
      'Binary Chain',
      'Verium',
      'VRM',
      'VeriCoin',
      'VRC',
      'blockchain explorer',
      'cryptocurrency',
    ],
    sameAs: [
      'https://twitter.com/vericonomy',
      'https://discord.gg/jF4aQJtfru',
      'https://github.com/Vericonomy',
    ],
  };
}

export function websiteJsonLd() {
  const url = absoluteUrl('/');

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-US',
    publisher: organizationJsonLd(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
