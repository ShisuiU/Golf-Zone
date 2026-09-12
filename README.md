# Zone Golf

Site communautaire pour les propriétaires de Volkswagen Golf : chaque voiture a
son dossier photo, et à terme des **manches 1v1** où la communauté vote pour
départager deux Golf.

Projet de fans, **non affilié à Volkswagen AG** — aucun logo ni marque officielle
n'est utilisé.

## État actuel

- **Landing page** implémentée, responsive (web + mobile).
- **Comptes** : inscription, connexion, déconnexion, session persistante et
  espace membre `/garage` protégé.
- Pas encore d'upload de photos ni de votes : le feed de la landing et le
  garage affichent des contenus d'exemple ou un état vide assumé.

Par honnêteté vis-à-vis des visiteurs, aucun chiffre n'est inventé : le relevé
de votes affiche `— · —` et « vote fermé », le classement montre trois places
« à prendre » avec `— pts`, et la seule barre de votes remplie est étiquetée
« exemple de relevé — illustration ».

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
```

Autres commandes : `npm run build`, `npm run start`, `npm run lint`.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — les tokens du design sont déclarés dans `app/globals.css`
- Polices auto-hébergées via `next/font` (Russo One, Barlow Condensed, Barlow, Space Mono)

## Structure

```
app/
  globals.css      tokens de design + utilitaires (grille, livrée, biseaux)
  layout.tsx       polices, métadonnées
  page.tsx         composition de la landing
components/
  SiteHeader.tsx   nav + bandeau HUD (menu mobile en <details>, sans JS)
  auth/            formulaires d'inscription et de connexion
  Hero.tsx         accroche + panneau de relevé du duel
  Roster.tsx       « derniers engagés » (aperçu du feed)
  Manche.tsx       protocole 1v1 en 3 temps + exemple de relevé
  Classement.tsx   podium de saison (vide) + règlement
  SiteFooter.tsx   appel à l'action final + mentions
  ui/Button.tsx
lib/
  content.ts       textes et données d'exemple — futur contrat de données
  db.ts            accès SQLite (users, sessions) — seul module lié au moteur
  password.ts      hachage scrypt des mots de passe
  session.ts       création / lecture / destruction de session
  dal.ts           getCurrentUser() et requireUser() pour les pages et actions
app/actions/
  auth.ts          Server Actions signup / login / logout
proxy.ts           pré-filtrage des routes membres
```

## Comptes et sessions

Implémenté sans dépendance externe, en suivant le guide d'authentification
livré avec Next 16 (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) :

- **Mots de passe** hachés avec `scrypt` (`node:crypto`), sel aléatoire par
  compte, vérification à temps constant. Rien n'est stocké en clair.
- **Sessions côté serveur** : le cookie `zg_session` (httpOnly, SameSite=Lax,
  Secure en production) ne contient qu'un jeton aléatoire de 256 bits, et seule
  son empreinte SHA-256 est en base. Une session est donc révocable et une
  fuite de la base ne permet pas de la rejouer.
- **Contrôle d'accès** : `requireUser()` dans le DAL fait foi côté page et
  action ; `proxy.ts` ne fait qu'un pré-filtrage sur la présence du cookie,
  sans requête base, car il s'exécute sur chaque requête (préchargements
  compris).
- La connexion renvoie le même message pour un e-mail inconnu et un mot de
  passe faux, afin de ne pas transformer la page en annuaire des inscrits.

Stockage : **SQLite via le module `node:sqlite` intégré à Node** (aucune
dépendance à compiler). Deux réserves assumées, à lever avant une mise en
ligne : `node:sqlite` est marqué expérimental par Node, et un fichier SQLite
local ne survit pas à un hébergement au système de fichiers éphémère
(Vercel & co). Tout le SQL est confiné à `lib/db.ts` pour que le passage à une
base gérée ne touche que ce module.

Base locale dans `.data/` (ignorée par git), chemin configurable via
`ZONE_GOLF_DB`.

## Direction visuelle — « Le Banc »

Fusion d'un univers de garage technique et d'un univers de compétition
sport/gaming : base graphite avec grille technique, **orange sécurité** comme
couleur de marque *et* comme camp A d'un duel, **bleu acier** comme camp B, et
le vert réservé à un duel réellement en cours (inutilisé pour l'instant).
Titres en Russo One, libellés en Barlow Condensed, relevés en Space Mono.

Deux règles apprises en maquettant, à respecter si on étend le style :

- Le biseau (`.bevel`) ne va que sur des éléments à **fond plein** : un
  `clip-path` ne redessine pas la bordure sur la diagonale, un cadre bordé
  apparaîtrait donc ouvert. Les panneaux bordés utilisent `.panel` (bordure
  complète + filet haut orange), et `.bevel-sm` existe pour les petits badges.
- Les variables de police de `next/font` sont posées sur `<body>` : elles
  doivent être exposées via `@theme inline`, sinon la déclaration devient
  invalide et tout retombe sur la pile système.

Les maquettes d'origine (cette direction plus les trois explorations initiales,
en desktop et mobile) ont été produites en amont sur un canvas séparé.

## Prochaines étapes

1. ~~Comptes et authentification.~~
2. Upload de photos et dossiers voiture (le feed vient alors de la base).
3. Manches 1v1 : appariement, vote (1 membre = 1 voix), verdict, points.
4. Classement de saison alimenté par les résultats.

À prévoir côté comptes quand le site s'ouvrira : confirmation d'e-mail,
réinitialisation de mot de passe, limitation du nombre de tentatives de
connexion, et migration vers une base gérée.

Points encore ouverts : la durée d'une manche, le barème de points et la
nature des récompenses (volontairement laissés de côté pour l'instant).
