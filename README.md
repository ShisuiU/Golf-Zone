# Zone Golf

Site communautaire pour les propriétaires de Volkswagen Golf : chaque voiture a
son dossier photo, et à terme des **manches 1v1** où la communauté vote pour
départager deux Golf.

Projet de fans, **non affilié à Volkswagen AG** — aucun logo ni marque officielle
n'est utilisé.

## État actuel

- **Fil social** en page d'accueil : publications, likes, commentaires. Un
  membre poste une photo *ou* une simple question — beaucoup d'échanges
  n'auront pas d'image.
- **Comptes** : inscription, connexion, déconnexion, session persistante,
  profil `/profil`.
- **Duels** sur leur propre page `/duels`, annoncés comme non ouverts. Le site
  est d'abord un espace de partage ; la compétition vient en plus.

Tout cela s'active avec `DATABASE_URL`. Sans base configurée, le site tourne
en **mode vitrine** : la landing s'affiche avec des dossiers d'exemple, et rien
n'invite à créer un compte qui ne pourrait pas être conservé.

Par honnêteté vis-à-vis des visiteurs, aucun chiffre n'est inventé : le relevé
de votes affiche `— · —` et « vote fermé », le classement montre trois places
« à prendre » avec `— pts`, et la seule barre de votes remplie est étiquetée
« exemple de relevé — illustration ».

## Démarrer

```bash
npm install
cp .env.example .env.local   # renseigner DATABASE_URL pour activer les comptes
npm run dev                  # http://localhost:3000
```

Autres commandes : `npm run build`, `npm run start`, `npm run lint`.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — les tokens du design sont déclarés dans `app/globals.css`
- **PostgreSQL** via `pg` — comptes, dossiers et photos
- Polices auto-hébergées via `next/font` (Russo One, Barlow Condensed, Barlow, Space Mono)

## Structure

```
app/
  globals.css      tokens de design + utilitaires (grille, livrée, biseaux)
  page.tsx         le fil (page d'accueil)
  duels/           présentation des duels, page dédiée
  garage/          espace membre : dépôt et liste des dossiers
  photos/[id]/     sert une photo stockée en base
  actions/         Server Actions (auth.ts, dossier.ts)
components/
  SiteHeader.tsx   nav + bandeau HUD (menu mobile en <details>, sans JS)
  Roster.tsx       « derniers engagés » : dossiers réels, ou exemples si vide
  auth/            formulaires d'inscription et de connexion
  garage/          formulaire de dépôt + champ photo avec compression client
lib/
  db.ts            tout le SQL (users, sessions, dossiers, photos)
  flags.ts         mode vitrine ou communauté, selon DATABASE_URL
  password.ts      hachage scrypt des mots de passe
  session.ts       création / lecture / destruction de session
  dal.ts           getCurrentUser() et requireUser()
  photo.ts         validation des images déposées
  dossier.ts       règles partagées formulaire / serveur
  content.ts       textes et dossiers d'exemple
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

Stockage : **PostgreSQL**, même moteur en développement et en production —
faire tourner deux moteurs différents revient à ne tester qu'à moitié. Tout le
SQL est confiné à `lib/db.ts`.

### Mode vitrine

Sans `DATABASE_URL`, `/inscription`, `/connexion` et `/garage` répondent 404,
les Server Actions refusent les appels directs, les appels à l'action pointent
vers la section « manche » au lieu d'une route inexistante, aucune connexion
n'est ouverte, et la landing est prérendue statiquement. `ZONE_GOLF_ACCOUNTS=off`
force ce mode même avec une base (maintenance).

Ces valeurs sont lues à la construction pour les pages prérendues : après les
avoir changées, il faut **reconstruire / redéployer**.

## Le fil

Une seule requête ramène les publications, leurs compteurs de likes et leurs
commentaires (`listFeed`). La base est à Francfort et le serveur à Paris :
chaque aller-retour supplémentaire se paierait à chaque affichage.

Le bouton « j'aime » met à jour le compteur **avant** la réponse du serveur
(`useOptimistic`) — un like qui attend un aller-retour ne donne pas
l'impression d'un réseau social. Un membre ne peut aimer qu'une fois : c'est
la clé primaire `(dossier_id, user_id)` qui l'impose, pas le code.

Un visiteur non connecté voit tout le fil ; ses clics sur « j'aime » ou
« commenter » l'amènent à l'inscription.

## Photos

Les images sont stockées **dans Postgres** (`bytea`) et servies par
`/photos/[id]` avec un cache immuable d'un an — un identifiant ne change jamais
de contenu. Un seul service à administrer pour démarrer ; si le volume grossit,
seul ce point de stockage est à déplacer vers un stockage objet.

Trois garde-fous, dans cet ordre :

1. **Compression dans le navigateur** (`PhotoField`) : redimensionnement à
   1600 px et réencodage JPEG avant l'envoi. Mesuré : une photo de 10,4 Mo part
   à 188 Ko. Évite d'installer une bibliothèque de traitement d'image serveur.
2. **Validation serveur** (`lib/photo.ts`) : 2 Mo maximum, et le type est
   déduit de la **signature du fichier**, pas du `Content-Type` annoncé par le
   client — un `.jpg` qui n'est pas une image est refusé.
3. **`serverActions.bodySizeLimit`** à 2,5 Mo dans `next.config.ts` : au-dessus
   de la limite applicative, car le plafond de Next porte sur le corps HTTP
   brut (surcoût multipart compris). Sans cette marge, une photo de presque
   2 Mo se heurterait à un 413 brut avant d'atteindre le message d'erreur.

## Déploiement (Vercel)

Le dépôt se connecte sur [vercel.com/new](https://vercel.com/new) : Next.js
est détecté automatiquement, aucune commande ni aucun fichier `vercel.json`
n'est nécessaire, et chaque push sur la branche de production redéploie.

À vérifier dans les réglages du projet :

- **Node.js Version : 22.x ou plus** — la version sur laquelle le projet est
  développé et testé, déclarée dans `engines.node`.
- **Aucune variable d'environnement n'est requise** pour la landing seule.
- Pour ouvrir la communauté : créer une base Postgres gérée, coller son URL
  dans `DATABASE_URL` côté Vercel, redéployer. Le schéma se crée tout seul au
  premier accès.

### Choix de l'hébergeur de base

**Neon** (directement, ou via le Marketplace Vercel). « Vercel Postgres »
n'existe plus comme produit distinct : c'était déjà Neon, et les bases ont été
migrées vers l'intégration Neon fin 2024.

Le critère décisif n'est pas le quota mais la **politique d'inactivité**, pour
un site dont le trafic sera longtemps irrégulier :

- Neon met le calcul en veille après ~5 minutes d'inactivité et le **réveille
  tout seul** à la requête suivante — seule la première requête est lente.
- Supabase **met le projet en pause après 7 jours** sans activité, et il faut
  le réveiller à la main depuis le tableau de bord. Une semaine creuse
  rendrait le site inaccessible.

Réserve à surveiller : le plan gratuit de Neon donne 0,5 Go par projet, et les
photos vivent dans la base — soit de l'ordre de 2 500 photos à 190 Ko. Quand
on s'en approchera, il faudra sortir les images vers un stockage objet
(Vercel Blob, Cloudflare R2, ou le Storage de Supabase) ; seul `lib/db.ts` et
la route `/photos/[id]` sont concernés.

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
2. ~~Upload de photos et dossiers voiture.~~
3. Manches 1v1 : appariement, vote (1 membre = 1 voix), verdict, points.
4. Classement de saison alimenté par les résultats.

Côté photos, à prévoir quand le volume montera : plusieurs photos par dossier,
pagination du feed, et modération.

À prévoir côté comptes quand le site s'ouvrira : confirmation d'e-mail,
réinitialisation de mot de passe, limitation du nombre de tentatives de
connexion, et migration vers une base gérée.

Points encore ouverts : la durée d'une manche, le barème de points et la
nature des récompenses (volontairement laissés de côté pour l'instant).
