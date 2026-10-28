<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
 Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Branding
- The app is branded Playnivo. Internal identifiers (component folder `src/components/cricmaster/`, localStorage keys `cricmaster:*`, window events, `com.abdullah.cricmaster` appId) intentionally keep the old name — renaming them would break saved user data; never rename. Visible UI text, titles and URLs must say Playnivo.
