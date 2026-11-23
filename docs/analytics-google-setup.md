# Mesure d'audience — configuration Google Analytics (FIF 2026)

Ce document s'adresse à la personne qui gère le compte Google de l'organisation (ou le domaine
`fikiri.co`). Il décrit les **deux** réglages à faire pour que le site public mesure son audience et que
l'équipe FIF retrouve les chiffres directement dans sa console d'administration.

Durée : environ 20 minutes. Aucune compétence technique particulière n'est nécessaire, mais il faut un
compte Google avec les droits d'administration sur Google Analytics.

À la fin, cinq valeurs seront à transmettre à l'équipe technique :

| Valeur | Ressemble à | Où la trouver |
|---|---|---|
| Identifiant de mesure | `G-AB12CD34EF` | Étape 1.4 |
| Identifiant de propriété | `123456789` | Étape 1.5 |
| Identifiant du client OAuth | `123-abc.apps.googleusercontent.com` | Étape 2.3 |
| Code secret du client | `GOCSPX-…` | Étape 2.3 |
| Jeton d'autorisation | `1//0g…` | Étape 2.5 |

> Le code secret et le jeton sont des **secrets** : transmettez-les par un canal sécurisé
> (gestionnaire de mots de passe interne, message chiffré), jamais par e-mail ordinaire ni dans une
> conversation de groupe.

---

## Étape 1 — Créer la propriété Google Analytics

**1.1** Ouvrez [analytics.google.com](https://analytics.google.com) et connectez-vous avec le compte
Google de l'organisation (pas un compte personnel : le jour où la personne quitte l'équipe, l'accès
serait perdu).

**1.2** En bas à gauche, cliquez sur **Administration** (l'icône en forme de roue dentée).

**1.3** Dans la colonne **Propriété**, cliquez sur **Créer** → **Propriété**, puis renseignez :

- **Nom de la propriété** : `FIF 2026 — Site public`
- **Fuseau horaire** : `(GMT+01:00) Kinshasa`
- **Devise** : au choix (sans effet sur la mesure)

Continuez, répondez aux questions sur l'activité (secteur « Organisme à but non lucratif », taille au
choix), puis acceptez les conditions d'utilisation.

**1.4** À l'écran **Commencer à collecter les données**, choisissez la plateforme **Web** et renseignez :

- **URL du site web** : `https://festival.fikiri.co`
- **Nom du flux** : `Site public`

Google affiche alors un **identifiant de mesure** de la forme `G-AB12CD34EF`.
👉 **Notez-le, c'est la première valeur à transmettre.**

Google propose ensuite d'installer une balise sur le site : **ignorez cette étape**, elle est déjà
intégrée au site. Il n'y a ni code à copier, ni extension à installer.

**1.5** Toujours dans **Administration** → colonne **Propriété** → **Paramètres de la propriété**, repérez
l'**ID de propriété** : un nombre à 9 ou 10 chiffres affiché en haut à droite.
👉 **Notez-le, c'est la deuxième valeur à transmettre.**

> Ne confondez pas les deux : `G-AB12CD34EF` sert à **mesurer** depuis le site, le nombre `123456789`
> sert à **relire** les chiffres dans la console FIF.

---

## Étape 2 — Créer un accès en lecture pour la console FIF

La console d'administration du festival affiche les statistiques sans que personne ait à ouvrir Google
Analytics. Pour cela, elle a besoin d'une autorisation de lecture, accordée une seule fois par un compte
qui a accès à la propriété.

**2.1** Ouvrez [console.cloud.google.com](https://console.cloud.google.com) avec le même compte Google.

- En haut, sélectionnez un projet existant ou cliquez sur **Nouveau projet** et nommez-le `FIF 2026`.

**2.2** Dans le menu de navigation (☰), allez dans **API et services** → **Bibliothèque**, recherchez
**Google Analytics Data API**, ouvrez-la et cliquez sur **Activer**.

**2.3** Toujours dans ☰, allez dans **API et services** → **Écran de consentement OAuth** (ou
**Google Auth Platform**) :

- **Type d'utilisateur** : **Interne**. C'est important : en mode « Test », Google invalide
  l'autorisation au bout de 7 jours et les statistiques disparaissent de la console toutes seules.
- Dans **Accès aux données**, ajoutez le périmètre `https://www.googleapis.com/auth/analytics.readonly`.
- Puis **Clients** → **Créer un client** :
  - **Type d'application** : **Application Web**
  - **Nom** : `FIF 2026 Analytics`
  - **Origines JavaScript autorisées** : laissez vide
  - **URI de redirection autorisés** : `https://developers.google.com/oauthplayground`
    (sans barre oblique à la fin)

Google affiche un **identifiant client** et un **code secret**.
👉 **Ce sont les troisième et quatrième valeurs à transmettre.**

**2.4** Sur [analytics.google.com](https://analytics.google.com) → **Administration** → colonne
**Propriété** → **Gestion des accès à la propriété**, vérifiez que le compte Google qui va donner
l'autorisation à l'étape 2.5 figure bien dans la liste avec au moins le rôle **Lecteur**.

**2.5** Ouvrez [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground) :

- Cliquez sur la roue dentée en haut à droite, cochez **Use your own OAuth credentials**, puis collez
  l'identifiant client et le code secret de l'étape 2.3.
- Dans le champ de gauche **Input your own scopes**, saisissez
  `https://www.googleapis.com/auth/analytics.readonly`, puis **Authorize APIs**.
- Connectez-vous avec le compte vérifié à l'étape 2.4 et acceptez.
- Cliquez sur **Exchange authorization code for tokens**. Un **Refresh token** apparaît, de la forme
  `1//0g…`.
  👉 **C'est la cinquième valeur à transmettre.**

> Cette autorisation ne se redonne pas : le jeton reste valable tant que personne ne le révoque et que
> l'écran de consentement reste en mode **Interne**.

> *Variante* : si votre organisation autorise le téléchargement de clés de comptes de service, un compte
> de service avec le rôle **Lecteur** sur la propriété fonctionne aussi — transmettez alors son adresse
> et le champ `private_key` de son fichier `.json` au lieu des trois valeurs OAuth.

---

## Étape 3 — Transmettre les valeurs suivantes

Envoyez les cinq éléments notés plus haut. L'équipe les renseignera sur le serveur, dans le fichier
`apps/server/.env` :

```
GA_MEASUREMENT_ID=G-AB12CD34EF
GA4_PROPERTY_ID=123456789
GA_OAUTH_CLIENT_ID=123-abc.apps.googleusercontent.com
GA_OAUTH_CLIENT_SECRET=GOCSPX-...
GA_OAUTH_REFRESH_TOKEN=1//0g...
```

Le serveur est ensuite redémarré ; aucune mise en ligne du site n'est nécessaire. La première valeur
suffit à elle seule pour que le site commence à compter les visites : les quatre autres ne servent qu'à
afficher les chiffres dans la console.

---

## Ce que cela change, concrètement

**Sur le site public** : un bandeau discret demande au visiteur s'il autorise un cookie de mesure.

- **Tant qu'il n'a pas autorisé, ou s'il refuse** : la mesure reste **anonyme et sans cookie**. Google
  reçoit un signal de visite sans aucun identifiant, **rien n'est écrit sur l'appareil du visiteur** et
  aucune visite ne peut être rattachée à une personne. C'est le mode « consentement avancé » de Google.
- **S'il autorise** : un cookie de mesure est déposé, ce qui permet en plus de distinguer une nouvelle
  visite d'une visite de retour.

Dans les deux cas, la publicité et le partage de données publicitaires sont désactivés de façon
permanente, et les adresses IP sont anonymisées. Les visites sont donc comptées pour tout le monde ;
seule la précision du décompte des visiteurs uniques dépend du choix du visiteur.

**Dans la console FIF** (menu **Audience**), l'équipe voit sur 7, 28 ou 90 jours :

- le nombre de visiteurs et de visites, et la part de nouveaux visiteurs ;
- le temps moyen passé par page et par visite ;
- les pages les plus consultées ;
- les actions suivies : candidatures envoyées, inscriptions au programme commencées et terminées,
  mises en relation avec un porteur de projet, badges téléchargés, clics sur les boutons « Participer » ;
- l'origine des visiteurs (recherche, réseaux sociaux, lien direct) et les appareils utilisés.

Les chiffres sont mis en cache 10 minutes. Google Analytics met généralement **24 à 48 heures** à
afficher des données complètes après la première visite : il est normal que tout soit à zéro le premier
jour.

---

## Questions fréquentes

**Faut-il installer quelque chose sur le site ?**
Non. La mesure est déjà intégrée ; elle s'active dès que l'identifiant `G-…` est renseigné sur le serveur.

**Peut-on changer d'identifiant plus tard ?**
Oui. Il suffit de modifier la valeur sur le serveur et de redémarrer : le site n'a pas besoin d'être
reconstruit.

**Que se passe-t-il si rien n'est configuré ?**
Le site fonctionne normalement, sans bandeau et sans mesure. La page **Audience** de la console indique
simplement que Google Analytics n'est pas encore relié.

**Les données personnelles des participants sont-elles envoyées à Google ?**
Non. Aucun nom, e-mail, numéro de téléphone ni contenu de formulaire n'est transmis. Seuls des
compteurs anonymes le sont : « une candidature a été envoyée », « une page a été consultée ».

**Qui peut consulter ces chiffres ?**
Les administrateurs du festival, depuis la console. Et toute personne à qui vous donnez accès à la
propriété Google Analytics (étape 2.4, avec le rôle **Lecteur**).
