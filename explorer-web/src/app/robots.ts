import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/connect',
          '/disconnect',
          '/user-settings',
          '/rpc-terminal',
          '/rpc-browser',
          '/terminal',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'OAI-SearchBot',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
        ],
        allow: ['/', '/vrm/', '/vrc/', '/search', '/about', '/insights', '/api/docs'],
        disallow: ['/admin/', '/api/', '/rpc-terminal', '/rpc-browser', '/terminal'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
