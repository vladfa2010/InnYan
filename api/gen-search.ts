import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";

export const genSearchRouter = createRouter({
  yandex: publicQuery
    .input(
      z.object({
        queryText: z.string().min(1).max(16384),
        searchType: z.enum([
          "SEARCH_TYPE_RU",
          "SEARCH_TYPE_COM",
          "SEARCH_TYPE_TR",
          "SEARCH_TYPE_KK",
          "SEARCH_TYPE_BE",
          "SEARCH_TYPE_UZ",
        ]).default("SEARCH_TYPE_RU"),
        site: z.array(z.string()).max(5).optional(),
        fixMisspell: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const body: Record<string, any> = {
        messages: [
          {
            content: input.queryText.trim(),
            role: "ROLE_USER",
          },
        ],
        folderId: env.yandexFolderId,
        searchType: input.searchType,
        getPartialResults: false,
        fixMisspell: input.fixMisspell,
      };

      if (input.site && input.site.length > 0) {
        body.site = { site: input.site };
      }

      const response = await fetch(
        "https://searchapi.api.cloud.yandex.net/v2/gen/search",
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
        throw new Error(`Yandex GenSearch API ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as {
        message?: { content: string; role: string };
        sources?: Array<{ url: string; title: string; used: boolean }>;
        searchQueries?: Array<{ text: string; reqId: string }>;
        fixedMisspellQuery?: string;
        isAnswerRejected?: boolean;
        isBulletAnswer?: boolean;
        hints?: string[];
        problematicAnswer?: boolean;
      };

      return {
        query: input.queryText,
        searchType: input.searchType,
        answer: data.message?.content || "",
        sources: data.sources || [],
        searchQueries: data.searchQueries || [],
        fixedMisspellQuery: data.fixedMisspellQuery || null,
        isAnswerRejected: data.isAnswerRejected || false,
        isBulletAnswer: data.isBulletAnswer || false,
        problematicAnswer: data.problematicAnswer || false,
        hints: data.hints || [],
      };
    }),
});
