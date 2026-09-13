# Zone Golf

Réseau social pour les propriétaires de Volkswagen Golf : un fil où l'on montre
sa voiture, pose ses questions, commente et aime celles des autres — et, à
terme, des **duels** où la communauté vote pour départager deux photos.

Projet de fans, **non affilié à Volkswagen AG** — aucun logo ni marque officielle
n'est utilisé.

## État actuel

- **Fil social** en page d'accueil : publications, likes, commentaires. Un
  membre poste une photo *ou* une simple question — beaucoup d'échanges
  n'auront pas d'image.
- **Comptes** : inscription, connexion, déconnexion, session persistante.
- **Profils** : photo, fiche (bio, voiture, ville, âge), compteurs de
  publications et de likes reçus, et le mur des publications du membre.
  `/profil` est le sien — publication et édition comprises —
  `/membre/<pseudo>` celui des autres, `/membres` l'annuaire de la communauté.
- **Notifications** : likes et commentaires reçus, compteur dans l'en-tête.
- **Compte** `/compte` : changer son mot de passe, se déconnecter, supprimer
  son compte (et tout ce qu'il a publié).
- **Sécurité du compte** : mot de passe oublié, confirmation d'adresse,
  limitation des tentatives de connexion.
- **Modération** : signaler une publication ou un commentaire, file de
  traitement pour les modérateurs.
- **Pages légales** : mentions et confidentialité.
- **Duels** sur leur propre page `/duels`, annoncés comme non ouverts. Le site
  est d'abord un espace de partage ; la compétition vient en plus.

Tout cela s'active avec `DATABASE_URL`. Sans base configurée, le site tourne
en **mode vitrine** : les pages s'affichent, le fil annonce qu'il ouvre bientôt,
et rien n'invite à créer un compte qui ne pourrait pas être conservé.

Par honnêteté vis-à-vis des visiteurs, aucun chiffre n'est inventé : aucune
publication d'exemple ne se mêle aux vraies, et l'aperçu des duels affiche
`— · —` plutôt qu'un score fictif.

## Démarrer

```bash
npm install
cp .env.example .env.local   # renseigner DATABASE_URL pour activer les comptes
npm run dev                  # http://localhost:3000
```

Autres commandes : `npm run build`, `npm run start`, `npm run lint`, `npm test`.

## Tests

Une suite de bout en bout, dans un vrai navigateur (`tests/`, Playwright) :
authentification et verrouillage des tentatives, fil, likes, commentaires et
pagination, profils, photos, modération, plafonds de rythme et ménage, et une
passe d'apparence — un seul titre et un pied de page par écran, aucun
débordement de 320 px à 1440 px y compris avec un nom à rallonge ou une adresse
sans espace, cibles tactiles d'au moins 24 px (WCAG 2.5.8), lien d'évitement au
premier coup de tabulation, fermeture du menu par Échap, anneau de focus
visible sur tout ce qui s'atteint au clavier, mouvement coupé quand le système
le demande.

```bash
createdb zonegolf_test
DATABASE_URL=postgres://…/zonegolf_test npm run build
DATABASE_URL=postgres://…/zonegolf_test npm test
```

Les tests partagent une base : un seul ouvrier, et une table rase entre chaque
scénario. Le **schéma appartient à l'application**, qui le crée au premier
accès ; les tests la sollicitent une fois plutôt que de recopier le DDL, une
copie finissant toujours par diverger en silence.

`CHROMIUM_PATH` permet d'utiliser un navigateur déjà présent sur la machine au
lieu de celui que Playwright installe.

`NAVIGATEURS=tous` ajoute Firefox et WebKit — le moteur de Safari, donc de tous
les navigateurs sur iPhone (`npx playwright install firefox webkit` d'abord).
Ce n'est pas la valeur par défaut parce que la suite triple de durée, mais
c'est ce qui a révélé les deux tiers des défauts trouvés en fin de parcours.

La même suite tourne à chaque push et sur chaque pull request
(`.github/workflows/ci.yml`), avec un PostgreSQL de service : lint, types,
construction, puis les tests. En cas d'échec, le rapport est joint à
l'exécution.

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
  profil/          son propre profil : fiche, édition, publication, ses posts
  membre/[handle]/ profil public d'un membre
  membres/         annuaire de la communauté
  publication/[id] lien permanent d'une publication
  notifications/   likes et commentaires reçus
  compte/          mot de passe, déconnexion, suppression
  moderation/      file des signalements (modérateurs seulement)
  confirmer/[token]     confirmation d'adresse
  (auth)/reinitialiser/ nouveau mot de passe depuis le lien reçu
  mentions/        mentions légales
  confidentialite/ ce qui est collecté, et comment tout effacer
  not-found.tsx    404
  error.tsx        page d'erreur
  robots.ts        et sitemap.ts
  (auth)/          inscription et connexion
  photos/[id]/     sert une photo stockée en base
  actions/         Server Actions (auth.ts, post.ts)
components/
  SiteHeader.tsx   nav + bandeau HUD (menu mobile en <details>, sans JS)
  feed/            Composer, PostCard, LikeButton, CommentSection, Avatar
  auth/            formulaires d'inscription et de connexion
  profil/          fiche affichée, formulaire d'édition, champ photo compressé
lib/
  db.ts            tout le SQL (users, sessions, dossiers, photos, likes, comments)
  flags.ts         mode vitrine ou communauté, selon DATABASE_URL
  password.ts      hachage scrypt des mots de passe
  session.ts       création / lecture / destruction de session
  dal.ts           getCurrentUser() et requireUser()
  photo.ts         validation des images déposées
  post.ts          règles partagées formulaire / serveur (générations, longueurs)
  profile.ts       validation de la fiche de profil
  mail.ts          envoi de courrier (Resend), sans dépendance
  notify-mail.ts   les deux courriers transactionnels du site
  tokens.ts        jetons des liens reçus par courrier
  throttle.ts      limitation des tentatives de connexion
  content.ts       textes de l'en-tête et libellés partagés
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

Sans `DATABASE_URL`, `/inscription`, `/connexion` et `/profil` répondent 404,
les Server Actions refusent les appels directs (une action reste appelable même
quand sa page a disparu), et aucune connexion à la base n'est ouverte. `ZONE_GOLF_ACCOUNTS=off`
force ce mode même avec une base (maintenance).

Ces valeurs sont lues à la construction pour les pages prérendues : après les
avoir changées, il faut **reconstruire / redéployer**.

## Le fil

Une seule requête ramène les publications, leurs compteurs de likes et leurs
commentaires (`listFeed`). La base est à Francfort et le serveur à Paris :
chaque aller-retour supplémentaire se paierait à chaque affichage.

Le fil ne joint que les **trois derniers commentaires** de chaque publication,
avec le compte réel et un lien vers la suite : sans ce plafond, une discussion
à cent messages était rechargée en entier à chaque affichage de l'accueil, pour
chacune des vingt publications. Le lien permanent, lui, montre tout.

Le bouton « j'aime » met à jour le compteur **avant** la réponse du serveur
(`useOptimistic`) — un like qui attend un aller-retour ne donne pas
l'impression d'un réseau social. Un membre ne peut aimer qu'une fois : c'est
la clé primaire `(dossier_id, user_id)` qui l'impose, pas le code.

Une publication se **corrige** sur place : une faute de frappe n'oblige plus à
supprimer et republier, ce qui emportait likes et commentaires. La correction
est signalée sous le pseudo — on ne réécrit pas le passé en silence. La photo,
elle, ne se change pas : remplacer l'image, c'est une autre publication.

Un visiteur non connecté voit tout le fil ; ses clics sur « j'aime » ou
« commenter » l'amènent à l'inscription.

Le fil est paginé **par curseur** (`?avant=<id>`) et non par décalage : avec un
décalage, une publication postée pendant la lecture décale tout et en fait
sauter une. Une page de plus que nécessaire est demandée, juste pour savoir
s'il faut proposer la suite.

Chaque publication a un **lien permanent** (`/publication/<id>`), qui est ce
que visent les notifications et les partages.

## Notifications

Un like ou un commentaire prévient l'auteur — jamais soi-même : c'est la
requête d'insertion qui l'écarte (`WHERE d.user_id <> l'auteur du geste`),
pas le code appelant. Retirer son like retire la notification, sinon aimer
puis se raviser en boucle remplirait la boîte de l'autre.

Le compteur de non-lues est ramené **avec la session**, dans la même requête :
l'en-tête l'affiche sur chaque page, et un aller-retour de plus vers Francfort
se paierait à chaque vue.

## Compte

L'entrée se fait par **l'avatar dans l'en-tête**, qui ouvre le menu du membre
(profil, compte, modération, déconnexion) : c'est là qu'on cherche ses réglages
sur n'importe quel site. Le menu est un `<details>`, donc utilisable au clavier
et sans JavaScript — au prix connu de ne pas se refermer en cliquant à côté.

Changer son mot de passe demande l'ancien — sans quoi un appareil resté ouvert
suffirait à prendre le compte — et déconnecte tous les autres appareils.

Supprimer son compte efface publications, photos, commentaires, likes et
sessions : les clés étrangères sont en cascade. C'est confirmé par le mot de
passe et un mot à recopier, parce que c'est irréversible.

## Sécurité du compte

**Tentatives de connexion.** Deux compteurs : par e-mail (5 échecs, 15 minutes
de pause) contre l'essai de mots de passe sur un compte précis, par adresse IP
(20 échecs) contre le balayage de plusieurs comptes depuis la même machine — le
second est plus large parce qu'une adresse peut être partagée par tout un
immeuble. Le décompte vit en base : chaque instance serverless a sa propre
mémoire, un compteur en RAM ne protégerait rien. Le verrou est consulté
**avant** toute vérification, sinon essayer des mots de passe resterait
gratuit.

**Mot de passe oublié et confirmation d'adresse.** Les liens portent un jeton
aléatoire de 256 bits dont la base ne garde que l'empreinte, comme les
sessions. Le jeton est consommé dans la requête qui le lit, donc un lien ne
sert qu'une fois même si l'on clique deux fois. Une réinitialisation vaut une
heure, une confirmation une semaine, et un nouveau lien invalide le précédent.
La page de réinitialisation ne vérifie pas le jeton à l'affichage : le
consommer là suffirait à ce qu'un aperçu de lien par une messagerie le brûle
avant que le destinataire n'ait rien saisi.

La demande répond la même chose que l'adresse existe ou non — autrement, la
page dirait qui est inscrit. Seule exception : quand le site ne sait pas encore
envoyer de courrier, il le dit, parce qu'un « vérifiez vos e-mails » qui ne
mène à rien est pire que rien.

## Rythme et entretien

Trois plafonds, en plus du freinage de la connexion : **10 publications** et
**40 commentaires** par heure et par membre, **5 inscriptions** par heure et
par adresse IP. Ces chiffres ne gênent personne — dix publications en une
heure, c'est déjà beaucoup pour une seule voiture — mais ils arrêtent un
script, et c'est le but : une photo pèse jusqu'à 2 Mo, le plan gratuit de Neon
donne 0,5 Go, et sans plafond une seule personne remplit la base en une soirée.

Le compteur vit dans `rate_limits`, distinct de `login_attempts` : celui-ci
compte des **échecs** et pose un verrou, celui-là des **réussites** sur une
fenêtre qui s'ouvre à la première. Le quota se vérifie une fois la saisie
jugée valable et ne se décompte qu'après l'action : un formulaire mal rempli
ne coûte pas le droit de publier. Le décompte est en base et non en mémoire —
chaque instance serverless a la sienne, un compteur en RAM ne protégerait rien.

`GET /api/entretien`, appelée chaque nuit par la tâche planifiée de
`vercel.json`, efface les sessions périmées, les jetons consommés ou expirés
et les compteurs dormants. `CRON_SECRET` verrouille l'accès quand la variable
est posée ; sans elle la route reste ouverte, ce qui ne prête pas à
conséquence — elle ne supprime que ce qui a déjà expiré, et l'appeler dix fois
ne fait pas plus que l'appeler une.

Deux de ces tables portent une adresse IP. C'est le seul usage qu'en fait le
site, elle n'est rattachée à aucun compte, elle est effacée au plus tard sept
jours après le dernier essai — et la page de confidentialité le dit, ce qui
n'était pas le cas jusqu'ici alors que `login_attempts` en stockait déjà.

## Modération

Un membre peut signaler la publication ou le commentaire d'un autre. Les
signalements s'empilent dans `/moderation`, ouverte aux seuls pseudos listés
dans `ZONE_GOLF_MODERATEURS` — pour tous les autres, la page **n'existe pas**,
un 403 confirmerait qu'il y a quelque chose à cette adresse.

Pas de colonne « administrateur » en base : le jour où l'on donne ce droit
depuis le site, il faut une page pour le retirer, une trace de qui l'a donné,
et de quoi empêcher un compte compromis de se l'octroyer. Une variable
d'environnement se change en une minute et ne se pirate pas depuis le site.

## Profils

Le pseudo d'une publication mène au profil de son auteur. La fiche stocke
l'**année de naissance** et non l'âge : un âge en base serait faux dès le
premier anniversaire venu. Tous les champs sont facultatifs — une fiche vide
n'affiche pas une rangée de tirets, seulement ce qui est renseigné.

Les compteurs (publications, likes reçus) sont calculés dans la même requête
que la fiche. `listPostsOfUser` prend le membre **et** le visiteur en
paramètres distincts : sur le profil d'un autre, ce sont les likes du visiteur
qu'il faut refléter.

La **photo de profil** est rangée dans la table `photos`, comme les photos de
publication, et servie par la même route au même cache immuable. Remplacer sa
photo crée une nouvelle ligne — donc une nouvelle URL, que les caches ne
peuvent pas confondre avec l'ancienne — et supprime la précédente dans la même
transaction. Elle est réduite à 512 px dans le navigateur avant l'envoi.

`/membres` n'ouvre ni cookie ni en-tête : sans `connection()`, Next la
prérendrait à la construction et l'annuaire resterait figé sur l'état du
dernier déploiement.

## Photos

Les images sont stockées **dans Postgres** (`bytea`) et servies par
`/photos/[id]` avec un cache immuable d'un an — un identifiant ne change jamais
de contenu. Un seul service à administrer pour démarrer ; si le volume grossit,
seul ce point de stockage est à déplacer vers un stockage objet.

**Les métadonnées sont retirées** de toute image déposée : un téléphone y écrit
la date, le modèle de l'appareil et surtout les **coordonnées GPS** de la prise
de vue. Publier sa voiture garée devant chez soi reviendrait sinon à publier son
adresse. Le navigateur réencode systématiquement l'image, ce qui les efface
déjà — mais une Server Action accepte n'importe quel corps de requête, donc
`lib/exif.ts` refait le travail côté serveur, sur des octets qu'on a lus
soi-même. Pas de bibliothèque de traitement d'image : on retire les segments
porteurs (APP1/APP13/COM en JPEG, blocs non essentiels en PNG, `EXIF`/`XMP ` en
WebP) et on recopie le reste. Vérifié sur des fichiers réellement porteurs
d'un EXIF GPS : métadonnées absentes après coup, image identique au pixel près.

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
- Pour que le mot de passe oublié fonctionne : un compte
  [Resend](https://resend.com) (gratuit jusqu'à 3 000 e-mails par mois), un
  domaine vérifié chez eux, puis `RESEND_API_KEY` et `MAIL_FROM` côté Vercel.
  Sans cela le reste du site marche, mais un membre qui perd son mot de passe
  ne peut pas récupérer son compte.
- Pour traiter les signalements : `ZONE_GOLF_MODERATEURS=votrepseudo`.
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

## Direction visuelle

Fusion d'un univers de garage technique et d'un univers de compétition
sport/gaming : base graphite avec grille technique, **orange sécurité** comme
couleur de marque *et* comme camp A d'un duel, **bleu acier** comme camp B, et
le vert réservé à un duel réellement en cours (inutilisé pour l'instant).
Titres en Russo One, libellés en Barlow Condensed, relevés en Space Mono.

## Mouvement

Une seule courbe (`--ease-out-firm`) et trois durées : 90 ms à l'appui, 160 ms
au survol, 260 ms à l'entrée. Sortie franche, sans rebond — l'univers est
mécanique, pas enfantin.

Trois utilitaires portent l'essentiel : `.surface` (bloc inerte), `.card`
(+ `.card-link`) pour ce qui est cliquable, `.pressable` pour les commandes.
Un bloc qui n'est pas cliquable ne réagit pas au survol : ce serait promettre
une action qui n'existe pas.

Deux mouvements ne sont pas décoratifs :

- **Le cœur** qui bat une fois quand on aime. Le `key` sur l'état force React à
  remonter l'icône, sans quoi l'animation ne se jouerait qu'au premier clic.
- **La photo qui se déplace** du fil vers son lien permanent
  (`<ViewTransition name={photo-<id>}>` des deux côtés). C'est le même objet ;
  le mouvement le dit mieux qu'un fondu. Attention : un `loading.tsx` à la
  racine casse ce morphing — la destination se suspend, la paire ne se forme
  pas, et au passage un squelette de fil clignoterait sur les mentions
  légales. Le fil est donc mis en attente par un `<Suspense>` local, pas par un
  fichier de route.

Tout est neutralisé sous `prefers-reduced-motion`, y compris les
pseudo-éléments de transition de vue, que la règle générale n'atteint pas —
ils vivent hors de l'arbre du document.

Trois règles apprises en chemin, à respecter si on étend le style :

- Aucun champ ne porte `outline-none`. Les utilitaires Tailwind passent après
  la couche `base` : une seule de ces classes suffit à emporter l'anneau de
  focus clavier, sans que rien ne le signale. La bordure orange au focus est un
  renfort, pas l'indice principal.

- Le biseau (`.bevel`) ne va que sur des éléments à **fond plein** : un
  `clip-path` ne redessine pas la bordure sur la diagonale, un cadre bordé
  apparaîtrait donc ouvert. Les panneaux bordés utilisent `.panel` (bordure
  complète + filet haut orange), et `.bevel-sm` existe pour les petits badges.
- Les variables de police de `next/font` sont posées sur `<body>` : elles
  doivent être exposées via `@theme inline`, sinon la déclaration devient
  invalide et tout retombe sur la pile système.

Sur grand écran, le fil est en deux colonnes : la lecture à 680 px et une
colonne latérale (soi, la communauté, les duels). Sans elle, 700 px de vide de
chaque côté donnaient au site l'air d'un téléphone étiré. Elle ne contient rien
qui manquerait sur mobile.

Les maquettes d'origine (cette direction plus les trois explorations initiales,
en desktop et mobile) ont été produites en amont sur un canvas séparé.

## Prochaines étapes

1. ~~Comptes et authentification.~~
2. ~~Upload de photos et dossiers voiture.~~
3. ~~Fil social : publications, likes, commentaires.~~
4. ~~Profils, annuaire des membres, notifications, pagination.~~
5. Duels : appariement, vote (1 membre = 1 voix), verdict.

Restent à faire :

- **Contenu** : plusieurs photos par publication, recherche.
- **Entretien** : aucune alerte ne prévient d'une panne.
- **WebKit** : la suite passe sur les trois moteurs, mais quand ils tournent à
  la suite dans le même conteneur, WebKit plante par moments en cours de
  navigation (« internal error »). Seul, il fait 41/41. C'est le conteneur,
  pas le site — d'où `NAVIGATEURS=tous` réservé à une vérification manuelle.
- **Mentions légales** : le nom et l'adresse de contact de l'éditeur y sont
  encore à compléter — la loi impose de les publier.

Points encore ouverts sur les duels : la durée, le barème de points et la
nature des récompenses (volontairement laissés de côté pour l'instant).
