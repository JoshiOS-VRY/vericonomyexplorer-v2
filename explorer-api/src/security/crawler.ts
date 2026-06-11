const crawlerBotUserAgentStrings: Record<string, RegExp> = {
  google: /adsbot-google|Googlebot|mediapartners-google/i,
  microsoft: /Bingbot|bingpreview|msnbot/i,
  yahoo: /Slurp/i,
  duckduckgo: /DuckDuckBot/i,
  baidu: /Baidu/i,
  yandex: /YandexBot/i,
  teoma: /teoma/i,
  sogou: /Sogou/i,
  exabot: /Exabot/i,
  facebook: /facebot/i,
  alexa: /ia_archiver/i,
  aol: /aolbuild/i,
  moz: /dotbot/i,
  semrush: /SemrushBot/i,
  majestic: /MJ12bot/i,
  'python-requests': /python-requests/i,
  openai: /OAI-SearchBot|GPTBot|ChatGPT-User/i,
  unidentifiedCrawler: /Test Certificate Info/i,
  amazon: /amazonbot/i,
  bytedance: /bytespider/i,
  scrapy: /Scrapy/i,
  anthropic: /anthropic-ai/i,
  commoncrawl: /CCBot/i,
};

export function getCrawlerFromUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent) {
    return null;
  }

  for (const [name, regex] of Object.entries(crawlerBotUserAgentStrings)) {
    if (regex.test(userAgent)) {
      return name;
    }
  }

  return null;
}
