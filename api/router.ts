import { createRouter, publicQuery } from "./middleware";
import { searchRouter } from "./search";
import { genSearchRouter } from "./gen-search";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  search: searchRouter,
  genSearch: genSearchRouter,
});

export type AppRouter = typeof appRouter;
