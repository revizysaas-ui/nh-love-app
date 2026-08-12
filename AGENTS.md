# AGENTS.md — N&H (nh-love-app)

## Projet
- App famille React (Vite) + Supabase (Postgres + Storage) + déployée sur Vercel.
- `npm run build` = `vite build` (doit tourner dans ce dossier, sinon « Missing script »).
- `npm run lint` = `oxlint` (0 erreur attendu, ~47 warnings pré-existants dans Widgets/Games).

## Déploiement
- Vercel déploie depuis GitHub `master` (auto-deploy). **Un commit non poussé = fix non en ligne.**
- Après un fix : `git push origin master`, vérifier `https://nh-love-app.vercel.app` (le hash du bundle JS doit changer).
- Site : https://nh-love-app.vercel.app — repo : https://github.com/revizysaas-ui/nh-love-app.git

## Player / mini-player YouTube (correctif important, validé)
Symptômes résolus : mini-player ne marchait que sur « Suivant », pas d'auto-enchaînement,
retour à zéro + bouton rouge en revenant sur /playlist.

Règles à NE PAS violer :
1. **Ne jamais reparent/détacher l'iframe YouTube** (ni un ancêtre). Une iframe cross-process
   Chromium se réinitialise à tout déplacement (même in-document). C'est pour ça que le « harbor »
   ne marchait pas.
2. **Ne jamais mettre l'iframe en `display:none`** : YouTube ignore `loadVideoById` quand l'iframe
   a une taille 0 → l'auto-enchaînement casse. Masquer **hors écran** à la place
   (`position:fixed;left:-9999px;width:640px;height:360px;display:block`).
3. Le lecteur vit dans un conteneur persistant enfant direct de `body` (jamais déplacé) :
   `getScreen()`/`getScreenEl()` dans `PlayerContext.jsx`. Sur /playlist, `positionScreen(anchor)`
   l'aligne en `position:fixed` sur l'ancre `#yt-host` (rect rogné au viewport, z-index 45).
   Ailleurs (mini-player) : `hideScreen()` = hors écran.

Où : `src/context/PlayerContext.jsx` (refs `screenRef`, `screenAnchorRef`, `screenVisibleRef`,
fonctions `getScreen`, `getScreenEl`, `positionScreen`, `hideScreen`, `destroyScreen`),
`src/components/Playlist.jsx` (useLayoutEffect ensurePlayer/releasePlayer).

## Tests de régression (env local)
- Serveur preview : `npm run preview -- --port 5199 --strictPort` (PID 15543).
- Playwright-core réinstallé dans /tmp/opencode/pwtest (import 'playwright-core').
- Chrome headless : `$HOME/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome`.
- Tests validés : navigation sans arrêt, contrôles mini-player (Pause/Lecture/Arrêter),
  retour /playlist sans reset (le temps continue), auto-enchaînement (seek fin → chanson suivante).
- Sélecteurs utiles : popup « La musique continue 🎵 » = `.modal-card .btn-primary` (D'accord) ;
  labels des tabs du bas visibles seulement quand sélectionnés (cliquer par `nth(index)`,
  ordre : Accueil, Msg, Galerie, Carte, Dessin, Jeux) ; retour playlist via
  `.quick-card:has-text("Playlist")` ; `.ctrl-main` n'existe que sur /playlist ;
  `.mini-player-btn[title="Suivant"]`.
