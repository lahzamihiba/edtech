
/* ========================================
   1. DONNEES DES COURS
======================================== */

const courses = {
    html: {
        title: "HTML5 — Les fondamentaux",
        level: "Débutant",
        description:
            "Découvre la structure d'une page web et crée ton premier document HTML.",
        icon: "</>",
        lessons: [
            { title: "Introduction au HTML5", duration: "20 min" },
            { title: "Les titres et les paragraphes", duration: "25 min" },
            { title: "Les liens et les images", duration: "30 min" },
            { title: "Les listes et les tableaux", duration: "35 min" },
            { title: "Les formulaires HTML", duration: "40 min" }
        ]
    },

    css: {
        title: "CSS3 — Le design web",
        level: "Débutant",
        description:
            "Apprends à styliser tes pages, maîtriser les couleurs et créer des mises en page responsives.",
        icon: "✳",
        lessons: [
            { title: "Introduction au CSS3", duration: "20 min" },
            { title: "Couleurs, polices et bordures", duration: "30 min" },
            { title: "Le modèle de boîte (Box Model)", duration: "35 min" },
            { title: "Flexbox et alignement", duration: "40 min" },
            { title: "CSS Grid et responsive design", duration: "45 min" }
        ]
    },

    js: {
        title: "JavaScript — L'interactivité",
        level: "Intermédiaire",
        description:
            "Découvre les variables, les fonctions, les événements et la manipulation du DOM.",
        icon: "JS",
        lessons: [
            { title: "Variables et types de données", duration: "30 min" },
            { title: "Conditions et boucles", duration: "35 min" },
            { title: "Fonctions et tableaux", duration: "40 min" },
            { title: "Les événements JavaScript", duration: "35 min" },
            { title: "Manipuler le DOM", duration: "45 min" },
            { title: "Mini-projet interactif", duration: "60 min" }
        ]
    },

    react: {
        title: "React — Les premiers pas",
        level: "Intermédiaire",
        description:
            "Découvre les composants, les props et le state pour créer des interfaces dynamiques.",
        icon: "⚛",
        lessons: [
            { title: "Introduction à React", duration: "30 min" },
            { title: "JSX et composants", duration: "40 min" },
            { title: "Props et réutilisation", duration: "40 min" },
            { title: "State et événements", duration: "45 min" },
            { title: "Les hooks essentiels", duration: "50 min" },
            { title: "Créer une mini-application", duration: "60 min" }
        ]
    }
};


/* ========================================
   2. ETAT ET SAUVEGARDE
======================================== */

const STORAGE_KEY = "devpath-progress-v1";

function loadProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return {};
        }

        const data = JSON.parse(saved);

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return {};
        }

        return data;
    } catch (error) {
        console.warn("Impossible de charger la progression.", error);
        return {};
    }
}

let progress = loadProgress();
let currentCourse = "html";
let activeFilter = "all";


function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
        console.warn("La progression ne peut pas être sauvegardée.", error);
    }
}


function getCompletedLessons(courseId) {
    const course = courses[courseId];
    const saved = progress[courseId];

    if (!course || !saved || !Array.isArray(saved.completed)) {
        return [];
    }

    // Ne conserve que les indices de leçons valides.
    return [...new Set(saved.completed)].filter(index =>
        Number.isInteger(index) &&
        index >= 0 &&
        index < course.lessons.length
    );
}


function getCoursePercent(courseId) {
    const course = courses[courseId];
    if (!course) return 0;

    const completed = getCompletedLessons(courseId).length;

    return Math.round((completed / course.lessons.length) * 100);
}


/* ========================================
   3. ELEMENTS HTML
======================================== */

const searchInput = document.getElementById("search");
const courseCards = document.querySelectorAll(".course-card");
const filterButtons = document.querySelectorAll(".filter-button");
const emptyState = document.getElementById("empty-state");

const lessonTitle = document.getElementById("lesson-title");
const lessonDescription = document.getElementById("lesson-description");
const lessonLevel = document.getElementById("lesson-level");
const lessonIcon = document.getElementById("lesson-icon");
const lessonList = document.getElementById("lesson-list");
const lessonPercent = document.getElementById("lesson-percent");
const lessonProgress = document.getElementById("lesson-progress");
const actionMessage = document.getElementById("action-message");

const completedCount = document.getElementById("completed-count");
const globalPercent = document.getElementById("global-percent");
const totalCourses = document.getElementById("total-courses");
const courseCount = document.getElementById("course-count");


/* ========================================
   4. AFFICHER UNE FICHE DE COURS
======================================== */

function openCourse(courseId) {
    if (!courses[courseId]) return;

    currentCourse = courseId;

    const course = courses[courseId];

    lessonTitle.textContent = course.title;
    lessonDescription.textContent = course.description;
    lessonIcon.textContent = course.icon;
    lessonLevel.textContent = course.level;

    // Adapte la couleur du niveau.
    lessonLevel.className = "level " +
        (course.level === "Débutant"
            ? "level-beginner"
            : "level-intermediate");

    actionMessage.textContent = "";

    renderLessons();
    updateProgressDisplay();

    // Sur mobile, amène la fiche dans la zone visible.
    document.getElementById("detail-cours").scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        block: "start"
    });
}


/* ========================================
   5. AFFICHER LES LEÇONS
======================================== */

function renderLessons() {
    const course = courses[currentCourse];
    const completed = getCompletedLessons(currentCourse);

    lessonList.replaceChildren();

    course.lessons.forEach((lesson, index) => {
        const isDone = completed.includes(index);

        const row = document.createElement("div");
        row.className = "lesson-item" + (isDone ? " done" : "");

        const check = document.createElement("span");
        check.className = "lesson-check";
        check.textContent = isDone ? "✓" : "";
        check.setAttribute("aria-label", isDone ? "Terminée" : "À terminer");

        const name = document.createElement("span");
        name.className = "lesson-name";
        name.textContent = `${index + 1}. ${lesson.title}`;

        const duration = document.createElement("span");
        duration.className = "lesson-duration";
        duration.textContent = lesson.duration;

        row.append(check, name, duration);
        lessonList.appendChild(row);
    });
}


/* ========================================
   6. VALIDER UNE LEÇON
======================================== */

document.getElementById("complete-course").addEventListener("click", () => {
    const course = courses[currentCourse];
    const completed = getCompletedLessons(currentCourse);

    // Toutes les leçons sont déjà terminées.
    if (completed.length === course.lessons.length) {
        actionMessage.textContent = "Bravo ! Tu as terminé ce cours. 🎉";
        return;
    }

    // Trouve la première leçon non terminée.
    const nextLesson = course.lessons.findIndex(
        (lesson, index) => !completed.includes(index)
    );

    if (nextLesson === -1) return;

    if (!progress[currentCourse]) {
        progress[currentCourse] = { completed: [] };
    }

    progress[currentCourse].completed = [...completed, nextLesson];

    saveProgress();
    renderLessons();
    updateProgressDisplay();

    const newPercent = getCoursePercent(currentCourse);

    if (newPercent === 100) {
        actionMessage.textContent =
            "Félicitations ! Tu as terminé ce cours ! 🎉";
    } else {
        actionMessage.textContent =
            `Leçon validée ! Progression : ${newPercent} %.`;
    }
});


/* ========================================
   7. RECOMMENCER UN COURS
======================================== */

document.getElementById("reset-course").addEventListener("click", () => {
    const confirmed = window.confirm(
        "Veux-tu vraiment remettre ce cours à zéro ?"
    );

    if (!confirmed) return;

    delete progress[currentCourse];

    saveProgress();
    renderLessons();
    updateProgressDisplay();

    actionMessage.textContent = "La progression de ce cours a été réinitialisée.";
});


/* ========================================
   8. METTRE A JOUR LES PROGRESSIONS
======================================== */

function updateProgressDisplay() {
    const courseIds = Object.keys(courses);

    const completedCourses = courseIds.filter(
        id => getCoursePercent(id) === 100
    ).length;

    const totalPercent = courseIds.reduce(
        (sum, id) => sum + getCoursePercent(id), 0
    );

    const average = Math.round(totalPercent / courseIds.length);

    completedCount.textContent = completedCourses;
    globalPercent.textContent = average + "%";
    totalCourses.textContent = courseIds.length;

    const percent = getCoursePercent(currentCourse);

    lessonPercent.textContent = percent + "%";
    lessonProgress.style.width = percent + "%";

    // Mise à jour des cartes du catalogue.
    document.querySelectorAll(".course-open").forEach(button => {
        const courseId = button.dataset.course;
        const card = button.closest(".course-card");

        if (!card || !courses[courseId]) return;

        const coursePercent = getCoursePercent(courseId);
        const fill = card.querySelector(".progress-fill");
        const label = card.querySelector(".progress-label");

        fill.style.width = coursePercent + "%";
        fill.dataset.progress = coursePercent;
        label.textContent = coursePercent + "%";

        if (coursePercent === 100) {
            button.textContent = "Cours terminé ✓";
        } else {
            button.textContent = "Découvrir le cours →";
        }
    });
}


/* ========================================
   9. OUVRIR LES COURS
======================================== */

document.querySelectorAll(".course-open").forEach(button => {
    button.addEventListener("click", () => {
        openCourse(button.dataset.course);
    });
});


/* ========================================
   10. RECHERCHE ET FILTRES
======================================== */

function filterCourses() {
    const query = searchInput.value.trim().toLocaleLowerCase("fr");
    let visibleCount = 0;

    courseCards.forEach(card => {
        const title = card.querySelector("h3").textContent.toLocaleLowerCase("fr");
        const description = card.querySelector("p").textContent.toLocaleLowerCase("fr");
        const level = card.dataset.level;

        const matchesSearch =
            title.includes(query) || description.includes(query);

        const matchesFilter =
            activeFilter === "all" || level === activeFilter;

        const visible = matchesSearch && matchesFilter;

        card.hidden = !visible;

        if (visible) visibleCount++;
    });

    emptyState.hidden = visibleCount !== 0;
    courseCount.textContent =
        String(visibleCount).padStart(2, "0") +
        (visibleCount > 1 ? " cours" : " cours");
}


searchInput.addEventListener("input", filterCourses);

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;

        filterButtons.forEach(item => {
            const selected = item === button;

            item.classList.toggle("selected", selected);
            item.setAttribute("aria-pressed", String(selected));
        });

        filterCourses();
    });
});


/* ========================================
   11. MENU BURGER
======================================== */

const sidebar = document.getElementById("sidebar");
const burger = document.getElementById("burger");


function closeMenu() {
    sidebar.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Ouvrir le menu");
}


burger.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");

    burger.setAttribute("aria-expanded", String(isOpen));
    burger.setAttribute(
        "aria-label",
        isOpen ? "Fermer le menu" : "Ouvrir le menu"
    );
});


document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.toggle("active", item === link);
        });

        closeMenu();
    });
});


// Fermer le menu avec la touche Echap.
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeMenu();
    }

    // Raccourci Ctrl+K ou Cmd+K pour la recherche.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
    }
});


// Fermer le menu quand on revient à un écran large.
window.matchMedia("(min-width: 761px)").addEventListener("change", event => {
    if (event.matches) {
        closeMenu();
    }
});


/* ========================================
   12. INITIALISATION
======================================== */

// Affiche le cours HTML au démarrage.
renderLessons();
updateProgressDisplay();
filterCourses();
