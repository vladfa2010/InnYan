import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";

function decodeXmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec));
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function parseYandexResults(xml: string) {
  const results: Array<{
    title: string;
    url: string;
    domain: string;
    snippet: string;
  }> = [];

  const docRegex = /<doc[^>]*>[\s\S]*?<\/doc>/g;
  const docs = xml.match(docRegex) || [];

  for (const doc of docs) {
    const urlMatch = doc.match(/<url>(.*?)<\/url>/);
    const titleMatch = doc.match(/<title>(.*?)<\/title>/);
    const passageMatches = doc.match(/<passage>(.*?)<\/passage>/gs);

    if (urlMatch && titleMatch) {
      const url = decodeXmlEntities(urlMatch[1]);
      let title = decodeXmlEntities(titleMatch[1]);
      title = title.replace(/<\/?hlword>/g, "");

      let snippet = "";
      if (passageMatches && passageMatches.length > 0) {
        snippet = passageMatches
          .map((p) => {
            let text = p.replace(/<passage>|<\/passage>/g, "");
            text = text.replace(/<\/?hlword>/g, "");
            return decodeXmlEntities(text);
          })
          .join(" ");
      }

      results.push({ title, url, domain: extractDomain(url), snippet });
    }
  }

  return results;
}

export const searchRouter = createRouter({
  yandex: publicQuery
    .input(
      z.object({
        queryText: z.string().min(1).max(400),
        searchType: z.enum([
          "SEARCH_TYPE_RU",
          "SEARCH_TYPE_COM",
          "SEARCH_TYPE_TR",
          "SEARCH_TYPE_KK",
          "SEARCH_TYPE_BE",
          "SEARCH_TYPE_UZ",
        ]).default("SEARCH_TYPE_RU"),
        page: z.number().min(0).default(0),
      })
    )
    .mutation(async ({ input }) => {
      const body = {
        query: {
          searchType: input.searchType,
          queryText: input.queryText.trim(),
        },
        responseFormat: "FORMAT_XML" as const,
        page: input.page,
      };

      const response = await fetch(
        "https://searchapi.api.cloud.yandex.net/v2/web/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Api-Key ${env.yandexApiKey}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Yandex API ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { rawData: string };

      let xml = "";
      try {
        xml = Buffer.from(data.rawData, "base64").toString("utf-8");
      } catch {
        xml = data.rawData || "";
      }

      const results = parseYandexResults(xml);

      return {
        query: input.queryText,
        searchType: input.searchType,
        results,
      };
    }),
});
