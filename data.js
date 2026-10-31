
const L = (title, min, ...sections) => ({ title, min, sections });
const Q = (q, ...rest) => {
    const explain = rest.pop();
    return { q, options: rest, answer: 0, explain };
};

const COURSES = [
    {
        id: "html",
        title: "HTML5 — Les fondamentaux",
        level: "Débutant",
        short: "Structure tes pages web avec les balises HTML.",
        description: "Découvre la structure d'une page web et crée ton premier document HTML.",
        icon: "</>", cover: "cover-html", badge: "ESSENTIEL", deco: "HTML",
        lessons: [
            L("Introduction au HTML5", 20,
                ["C'est quoi le HTML ?", "HTML signifie HyperText Markup Language : un langage de balises qui décrit le contenu d'une page."],
                ["Squelette d'une page", "Toute page contient <!DOCTYPE html>, puis <html>, <head> et <body>."],
                ["À retenir", "Le HTML structure le contenu ; le CSS le met en forme ; le JavaScript le rend interactif."]),
            L("Les titres et les paragraphes", 25,
                ["Les titres", "Les balises <h1> à <h6> hiérarchisent le contenu. Il n'y a qu'un seul <h1> par page."],
                ["Les paragraphes", "La balise <p> définit un paragraphe ; <br> force un retour à la ligne."],
                ["À retenir", "Choisis une balise pour son sens, pas pour son apparence."]),
            L("Les liens et les images", 30,
                ["Les liens", "<a href=\"url\"> crée un lien. Le texte du lien doit être explicite."],
                ["Les images", "<img src=\"photo.jpg\" alt=\"description\"> : l'attribut alt est obligatoire pour l'accessibilité."],
                ["À retenir", "Un lien décrit où l'on va ; une image décrit ce qu'elle montre."]),
            L("Les listes et les tableaux", 35,
                ["Les listes", "<ul> pour une liste à puces, <ol> pour une liste numérotée, <li> pour chaque élément."],
                ["Les tableaux", "<table> contient des lignes <tr> avec des cellules <th> (en-têtes) et <td> (données)."],
                ["À retenir", "N'utilise pas un tableau pour la mise en page : c'est le rôle du CSS."]),
            L("Les formulaires HTML", 40,
                ["Le formulaire", "<form> regroupe des champs <input>, <select> et <textarea>."],
                ["Les labels", "Chaque champ a un <label for=\"id\"> pour être compréhensible et accessible."],
                ["À retenir", "Les attributs required, type et pattern valident les données côté navigateur."])
        ],
        quiz: [
            Q("Que signifie HTML ?", "HyperText Markup Language", "HighText Machine Language", "Hyper Tool Multi Language", "HTML est un langage de balises pour structurer le contenu."),
            Q("Quelle balise définit le titre principal d'une page ?", "<h1>", "<head>", "<title1>", "<h1> est le titre principal ; <head> contient les métadonnées."),
            Q("Vrai ou faux : l'attribut alt d'une image est facultatif pour l'accessibilité.", "Faux", "Vrai", "Il remplace l'attribut src.", "alt décrit l'image aux lecteurs d'écran : il est indispensable."),
            Q("Quelle balise crée une liste numérotée ?", "<ol>", "<ul>", "<li>", "<ol> = ordered list ; <ul> = liste à puces.")
        ]
    },
    {
        id: "css",
        title: "CSS3 — Le design web",
        level: "Débutant",
        short: "Crée des interfaces élégantes et responsives.",
        description: "Apprends à styliser tes pages, maîtriser les couleurs et créer des mises en page responsives.",
        icon: "✳", cover: "cover-css", badge: "DESIGN", deco: "CSS",
        lessons: [
            L("Introduction au CSS3", 20,
                ["Rôle du CSS", "Le CSS (Cascading Style Sheets) décrit la présentation : couleurs, polices, espacements."],
                ["Syntaxe", "Une règle = un sélecteur + des déclarations : p { color: navy; }."],
                ["À retenir", "Place ton CSS dans un fichier .css séparé, relié avec <link>."]),
            L("Couleurs, polices et bordures", 30,
                ["Couleurs", "On utilise des noms, des codes hexadécimaux (#7057f5) ou rgb()/hsl()."],
                ["Polices", "font-family, font-size et font-weight contrôlent le texte."],
                ["Bordures", "border et border-radius habillent les boîtes."]),
            L("Le modèle de boîte (Box Model)", 35,
                ["Les 4 couches", "content, padding, border puis margin : chaque élément est une boîte."],
                ["box-sizing", "box-sizing: border-box inclut padding et bordure dans la largeur déclarée."],
                ["À retenir", "Inspecte les boîtes avec les outils de développement (F12)."]),
            L("Flexbox et alignement", 40,
                ["Conteneur flex", "display: flex aligne les enfants sur un axe principal."],
                ["Alignement", "justify-content gère l'axe principal, align-items l'axe secondaire."],
                ["À retenir", "Flexbox est idéal pour une dimension : une barre de menu, une rangée de cartes."]),
            L("CSS Grid et responsive design", 45,
                ["CSS Grid", "display: grid avec grid-template-columns crée des mises en page en deux dimensions."],
                ["Media queries", "@media (max-width: 760px) { ... } adapte la page aux petits écrans."],
                ["À retenir", "Conçois d'abord pour mobile, puis enrichis pour les grands écrans."])
        ],
        quiz: [
            Q("Quel symbole sélectionne une classe en CSS ?", ".", "#", "*", "Le point cible une classe, le # cible un id."),
            Q("Quelle propriété arrondit les angles d'une boîte ?", "border-radius", "corner-style", "round-box", "border-radius arrondit les coins."),
            Q("Vrai ou faux : display: flex convient pour une mise en page à deux dimensions.", "Faux, c'est plutôt Grid", "Vrai", "Faux, flex est interdit", "Flexbox = une dimension ; Grid = deux dimensions."),
            Q("Quel ordre va du centre vers l'extérieur dans le box model ?", "content, padding, border, margin", "margin, border, padding, content", "content, margin, padding, border", "Le contenu est entouré du padding, de la bordure puis de la marge.")
        ]
    },
    {
        id: "js",
        title: "JavaScript — L'interactivité",
        level: "Intermédiaire",
        short: "Ajoute des interactions et de la logique à tes pages.",
        description: "Découvre les variables, les fonctions, les événements et la manipulation du DOM.",
        icon: "JS", cover: "cover-js", badge: "LOGIQUE", deco: "CODE",
        lessons: [
            L("Variables et types de données", 30,
                ["Déclarer", "const pour une valeur qui ne change pas, let pour une valeur modifiable. Évite var."],
                ["Types", "string, number, boolean, null, undefined, object et array."],
                ["À retenir", "typeof renvoie le type d'une valeur."]),
            L("Conditions et boucles", 35,
                ["Conditions", "if / else if / else et l'opérateur ternaire choisissent un chemin."],
                ["Boucles", "for, while et for...of répètent des instructions."],
                ["À retenir", "Compare avec === pour éviter les conversions surprenantes."]),
            L("Fonctions et tableaux", 40,
                ["Fonctions", "function nom() {} ou les fonctions fléchées () => {}."],
                ["Tableaux", "map, filter et reduce transforment un tableau sans boucle manuelle."],
                ["À retenir", "Une fonction fait une seule chose et porte un nom clair."]),
            L("Les événements JavaScript", 35,
                ["Écouter", "element.addEventListener('click', fonction) réagit à une action de l'utilisateur."],
                ["L'objet event", "event.target désigne l'élément ; event.preventDefault() annule le comportement par défaut."],
                ["À retenir", "Utilise la délégation d'événements pour les listes dynamiques."]),
            L("Manipuler le DOM", 45,
                ["Sélectionner", "document.querySelector et querySelectorAll retrouvent des éléments."],
                ["Modifier", "textContent, classList et setAttribute changent la page. Préfère textContent à innerHTML."],
                ["À retenir", "Créer avec createElement évite les failles d'injection (XSS)."]),
            L("Mini-projet interactif", 60,
                ["Cahier des charges", "Choisis une petite application : to-do list, quiz ou compteur."],
                ["Étapes", "Structure en HTML, style en CSS, logique en JS, persistance avec localStorage."],
                ["À retenir", "Teste souvent, commit souvent."])
        ],
        quiz: [
            Q("Quel mot-clé déclare une constante ?", "const", "let", "var", "const interdit la réaffectation."),
            Q("Que fait addEventListener ?", "Réagit à un événement", "Crée un élément", "Envoie une requête", "Il associe une fonction à un événement."),
            Q("Vrai ou faux : === compare la valeur ET le type.", "Vrai", "Faux", "Seulement pour les nombres", "=== est la comparaison stricte."),
            Q("Quelle méthode crée un tableau filtré ?", "filter", "push", "join", "filter renvoie un nouveau tableau avec les éléments qui passent le test.")
        ]
    },
    {
        id: "react",
        title: "React — Les premiers pas",
        level: "Intermédiaire",
        short: "Découvre les composants et les interfaces dynamiques.",
        description: "Découvre les composants, les props et le state pour créer des interfaces dynamiques.",
        icon: "⚛", cover: "cover-react", badge: "FRAMEWORK", deco: "REACT",
        lessons: [
            L("Introduction à React", 30,
                ["Pourquoi React ?", "Bibliothèque JavaScript pour construire des interfaces à partir de composants."],
                ["Idée clé", "L'interface est une fonction de l'état : quand l'état change, React met à jour l'affichage."],
                ["À retenir", "React ne gère que la vue."]),
            L("JSX et composants", 40,
                ["JSX", "Syntaxe qui ressemble au HTML dans le JavaScript."],
                ["Composants", "Une fonction qui retourne du JSX ; son nom commence par une majuscule."],
                ["À retenir", "Un composant = une petite pièce réutilisable."]),
            L("Props et réutilisation", 40,
                ["Les props", "Données passées du parent à l'enfant : <Carte titre=\"React\" />."],
                ["Lecture seule", "Un composant ne modifie jamais ses props."],
                ["À retenir", "Les props rendent un composant paramétrable."]),
            L("State et événements", 45,
                ["useState", "const [n, setN] = useState(0) crée un état local."],
                ["Événements", "onClick={() => setN(n + 1)} met à jour l'état et l'affichage."],
                ["À retenir", "Ne modifie jamais le state directement : utilise le setter."]),
            L("Les hooks essentiels", 50,
                ["useEffect", "Exécute du code après le rendu : requêtes, abonnements, titre du document."],
                ["Règles des hooks", "Appelle-les au niveau supérieur d'un composant, jamais dans une condition."],
                ["À retenir", "Le tableau de dépendances contrôle quand l'effet se relance."]),
            L("Créer une mini-application", 60,
                ["Découper", "Repère les composants : liste, élément, formulaire."],
                ["Assembler", "Le state vit dans le parent commun, les enfants reçoivent des props."],
                ["À retenir", "Commence petit, puis ajoute des fonctionnalités une à une."])
        ],
        quiz: [
            Q("Comment s'appelle une fonction qui retourne du JSX ?", "Un composant", "Un reducer", "Un module CSS", "Un composant React est une fonction qui retourne du JSX."),
            Q("Quel hook crée un état local ?", "useState", "useEffect", "useRef", "useState renvoie la valeur et son setter."),
            Q("Vrai ou faux : un composant peut modifier ses props.", "Faux", "Vrai", "Seulement en classe", "Les props sont en lecture seule."),
            Q("Quand utiliser useEffect ?", "Pour un effet après le rendu", "Pour déclarer une constante", "Pour écrire du CSS", "useEffect gère les effets de bord : requêtes, abonnements...")
        ]
    }
];


/* ========================================
   LIENS YOUTUBE PAR LEÇON (facultatif)
   Colle ici le lien de la vidéo choisie pour chaque leçon, dans l'ordre
   des leçons du cours. Exemple :
     html: ["https://www.youtube.com/watch?v=XXXXXXXXXXX", "", ...]
   Une case vide "" affiche un lien de recherche YouTube, et l'apprenant
   peut aussi coller son propre lien depuis la leçon.
======================================== */
const YOUTUBE = {
    html:  ["", "", "", "", ""],
    css:   ["", "", "", "", ""],
    js:    ["", "", "", "", "", ""],
    react: ["", "", "", "", "", ""]
};

COURSES.forEach(course => course.lessons.forEach((lesson, i) => {
    lesson.video = (YOUTUBE[course.id] || [])[i] || "";
}));
