import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/seo/site";

export function HomeJsonLd() {
  const url = absoluteUrl("/");

  return (
    <JsonLd
      data={[
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url,
          description: SITE_DESCRIPTION,
          inLanguage: "en-US",
          publisher: {
            "@type": "Organization",
            name: "VeriConomy",
            url: "https://vericonomy.com",
          },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${url}search`,
            },
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE_NAME,
          url,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Any",
          description: SITE_DESCRIPTION,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        },
      ]}
    />
  );
}
