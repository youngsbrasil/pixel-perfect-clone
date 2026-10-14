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

- Radar Ético phase 1 keeps all data in an in-memory store (src/lib/store.ts) seeded from src/lib/seed.ts; why: frontend-first demo before the backend is enabled. Social collection goes only through the SocialProvider interface (src/lib/provider.ts) so real providers plug in without touching the rest.
