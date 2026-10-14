import type { Rede, DiscoverySource } from "./types";

export interface ProviderProfile {
  rede: Rede; username: string; url: string; nome_exibido: string; bio: string;
  seguidores: number; categoria_perfil: string; links_externos: string[];
}
export interface ProviderPost { tipo: "post" | "reels" | "story"; url: string; texto: string; hashtags: string[]; publicado_em: string }

/** Interface de coleta. Implementações reais (Apify, APIs oficiais) devem seguir este contrato. */
export interface SocialProvider {
  discoverProfiles(sources: DiscoverySource[]): Promise<ProviderProfile[]>;
  fetchProfile(rede: Rede, username: string): Promise<ProviderProfile | null>;
  fetchPosts(rede: Rede, username: string): Promise<ProviderPost[]>;
}

const MOCK_TEXTS = [
  "Aposentadoria negada? Chama no direct que eu te explico! #direitoprevidenciario",
  "Hoje explico a diferença entre auxílio-doença e aposentadoria por invalidez. #advocacia",
  "Comente QUERO e eu te envio o passo a passo da revisão da vida toda.",
  "Primeira consulta gratuita para quem chegar esta semana!",
];
let counter = 0;

export const mockProvider: SocialProvider = {
  async discoverProfiles(sources) {
    const n = Math.max(1, Math.min(3, sources.filter((s) => s.ativo).length));
    return Array.from({ length: n }, () => {
      counter++;
      const u = `adv.ficticio.novo${counter}`;
      return {
        rede: "instagram" as Rede, username: u, url: `https://instagram.com/${u}`,
        nome_exibido: `Dr(a). Perfil Fictício ${counter}`,
        bio: `Advogado(a) | OAB/SP ${100000 + counter * 37} | Direito Previdenciário`,
        seguidores: 1000 + counter * 311, categoria_perfil: "Advogado(a)", links_externos: [`https://wa.me/551190000${1000 + counter}`],
      };
    });
  },
  async fetchProfile() { return null; },
  async fetchPosts(rede, username) {
    void rede;
    return MOCK_TEXTS.slice(0, 2 + (username.length % 3)).map((t, i) => ({
      tipo: "post" as const, url: `https://instagram.com/p/${username}-${i}`, texto: t,
      hashtags: t.match(/#\w+/g) ?? [], publicado_em: new Date().toISOString(),
    }));
  },
};
