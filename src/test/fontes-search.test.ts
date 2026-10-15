import { describe, expect, it } from "vitest";

import { buildSearchUrl } from "@/routes/fontes";

describe("buildSearchUrl", () => {
  it("monta busca com site: da rede e o termo entre aspas", () => {
    const u = buildSearchUrl("instagram", "advogado previdenciário");
    expect(u).toContain("google.com/search?q=");
    expect(decodeURIComponent(u)).toContain('site:instagram.com "advogado previdenciário"');
  });

  it("remove # de hashtags", () => {
    expect(decodeURIComponent(buildSearchUrl("tiktok", "#advogada"))).toContain(
      'site:tiktok.com "advogada"',
    );
  });

  it("mapeia x para site:x.com", () => {
    expect(decodeURIComponent(buildSearchUrl("x", "OAB/SP"))).toContain('site:x.com "OAB/SP"');
  });
});
