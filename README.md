# Golf Zone — « Mein Golf »

Site communautaire pour les propriétaires de Volkswagen Golf : chaque voiture a
son dossier photo, et à terme des **manches 1v1** où la communauté vote pour
départager deux Golf.

Projet de fans, **non affilié à Volkswagen AG** — aucun logo ni marque officielle
n'est utilisé.

## État actuel

La **landing page** est implémentée, responsive (web + mobile). Rien n'est
encore dynamique : pas de comptes, pas d'upload, pas de votes. Les contenus
d'exemple vivent dans `lib/content.ts`.

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
  Hero.tsx         accroche + panneau de relevé du duel
  Roster.tsx       « derniers engagés » (aperçu du feed)
  Manche.tsx       protocole 1v1 en 3 temps + exemple de relevé
  Classement.tsx   podium de saison (vide) + règlement
  SiteFooter.tsx   appel à l'action final + mentions
  ui/Button.tsx
lib/
  content.ts       textes et données d'exemple — futur contrat de données
```

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

1. Comptes et authentification.
2. Upload de photos et dossiers voiture (le feed vient alors de la base).
3. Manches 1v1 : appariement, vote (1 membre = 1 voix), verdict, points.
4. Classement de saison alimenté par les résultats.

Points encore ouverts : le nom public (`SITE_NAME` dans `lib/content.ts` —
« Mein Golf » vient des maquettes, à confirmer face à « Golf Zone »), la durée
d'une manche, le barème de points et la nature des récompenses. Les appels à
l'action pointent vers `SIGNUP_HREF`, à rediriger vers la vraie inscription
quand elle existera.
