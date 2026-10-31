# EdTech — Plateforme de cours en ligne (mini LMS)

Mini-projet JavaScript FIA2 — ISSAT Sousse · Sujet 8 · Binôme : Isra Khlifi & Hiba Hzami

## Lancer le projet
Ouvrir `index.html` (ou, de préférence, utiliser **Live Server** dans VS Code).
Aucune bibliothèque : HTML5, CSS3 et JavaScript « vanilla ».

## Structure
```
index.html        # coquille de la SPA (menu, barre du haut, zone #view)
css/style.css     # design de la partie 1 (HTML/CSS)
css/lms.css       # styles des nouvelles vues (lecteur, quiz, admin)
js/data.js        # données fictives : cours, leçons, quiz (tableau JS)
js/app.js         # état, routeur, vues, quiz, administration
```

## Fonctionnalités obligatoires (cahier des charges)
| Exigence | Où |
|---|---|
| Navigation entre cours sans rechargement (SPA) | routeur par hash `#/cours/...` dans `app.js` (section 4) |
| Progression dynamique (pourcentage + checklist) | fiche cours, page « Ma progression », cartes du catalogue |
| Sauvegarde automatique de la position (localStorage) | leçon + chapitre mémorisés, carte « Reprendre » |
| Quiz interactif avec validation immédiate | `viewQuiz` : correction dès le choix, score, meilleur score |

## Règles du quiz
Le quiz d'un cours est **verrouillé** tant que toutes les leçons ne sont pas validées (bouton grisé sur la fiche du cours, et l'adresse `#/cours/.../quiz` est aussi protégée).

## Vidéos YouTube
Chaque leçon peut afficher une vidéo YouTube intégrée. Deux façons d'en ajouter :
1. Dans `js/data.js`, tableau `YOUTUBE` : coller le lien de chaque leçon (dans l'ordre).
2. Directement dans la leçon (champ « Ajouter une vidéo YouTube ») ou dans l'administration.
Pour que l'intégration fonctionne, ouvrir le projet avec **Live Server** (http://localhost), pas en double-cliquant sur `index.html`.

## Vidéo enregistrée localement
Dans l'administration, une leçon peut avoir un fichier vidéo (max 300 Mo). Il est stocké dans **IndexedDB**, donc uniquement dans le navigateur utilisé : rien n'est envoyé sur Internet, et la vidéo n'apparaît pas sur un autre ordinateur. Si une leçon a une vidéo enregistrée et un lien YouTube, la vidéo enregistrée est affichée.

## Bonus réalisés
- Leçons découpées en **chapitres** (numéros cliquables + boutons Chapitre précédent / suivant, chapitre mémorisé automatiquement).
- **Interface d'administration** : constructeur de leçons (titre, durée, lien YouTube ou vidéo enregistrée sur l'ordinateur, chapitres avec leur contenu) et de quiz (question + réponses, bonne réponse cochée), avec validation ; suppression de cours et restauration des cours par défaut.

## Améliorations UI/UX
- Toute la carte de cours est cliquable (plus de clic « dans le vide ») + lien explicite.
- Fiche de cours dédiée, fil d'Ariane, boutons Précédente / Suivante, bouton « Reprendre ».
- Messages d'état (`aria-live`), retours visuels + texte pour les bonnes/mauvaises réponses (pas seulement la couleur).
- Menu actif (`aria-current`), lien d'évitement, focus visible, navigation clavier, `prefers-reduced-motion`.
- Pages inexistantes : message « Page introuvable » au lieu d'une page vide.

## Qualité
Responsive (mobile / tablette / desktop), aucun `innerHTML` (création DOM sécurisée), aucune erreur console.

## Avant de rendre
- [ ] Valider HTML/CSS sur le validateur W3C
- [ ] Relever les scores Lighthouse (captures dans le rapport)
- [ ] Tester mobile, tablette, desktop et au clavier
- [ ] Commits réguliers des **deux** étudiants sur GitHub
- [ ] Rapport rédigé avec le modèle fourni + démonstration préparée
