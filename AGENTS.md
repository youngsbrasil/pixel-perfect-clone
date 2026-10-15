<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Radar Ético backend ligado (2026-10-14): Supabase com 14 tabelas + RLS por seccional (migrations em supabase/migrations/), 5 edge functions em supabase/functions/ (discover-profiles, classify-lawyer, analyze-content com Lovable AI, enrich-lawyer, run-scan), login real via Supabase Auth (/login). O front usa src/lib/remote.ts + store.ts em modo duplo: tenta o Supabase e cai para demonstração local (seed) se indisponível. Social collection goes only through the SocialProvider interface (src/lib/provider.ts) so real providers plug in without touching the rest.
