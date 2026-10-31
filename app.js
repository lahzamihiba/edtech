
(() => {
    "use strict";

    /* ============ 1. OUTILS ============ */

    const $ = (selector, root = document) => root.querySelector(selector);

    // Crée un élément DOM. Les textes passent par createTextNode :
    // aucune injection HTML possible (important pour l'administration).
    function h(tag, props = {}, ...children) {
        const el = document.createElement(tag);
        for (const [key, value] of Object.entries(props)) {
            if (value === false || value == null) continue;
            if (key === "class") el.className = value;
            else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
            else el.setAttribute(key, value === true ? "" : value);
        }
        children.flat(Infinity).forEach(child => {
            if (child == null || child === false) return;
            el.append(child.nodeType ? child : document.createTextNode(child));
        });
        return el;
    }

    function formatDuration(minutes) {
        if (minutes < 60) return `${minutes} min`;
        return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
    }

    function shuffle(list) {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // Extrait l'identifiant d'une vidéo YouTube (liens watch, youtu.be, embed, shorts).
    // Retourne null si le lien n'est pas valide : on n'intègre jamais une URL brute.
    function youtubeId(value) {
        const text = String(value || "").trim();
        const valid = id => (id && /^[\w-]{11}$/.test(id)) ? id : null;
        if (valid(text)) return text;
        try {
            const url = new URL(text);
            const host = url.hostname.replace(/^(www|m)\./, "");
            if (host === "youtu.be") return valid(url.pathname.slice(1).split("/")[0]);
            if (host === "youtube.com" || host === "youtube-nocookie.com") {
                const fromPath = url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/);
                return valid(url.searchParams.get("v") || (fromPath && fromPath[1]));
            }
        } catch (error) { /* lien non valide */ }
        return null;
    }

    // Vidéos enregistrées localement : stockées dans IndexedDB (localStorage est trop petit).
    // Elles restent dans CE navigateur ; rien n'est envoyé sur Internet.
    const MAX_VIDEO = 300 * 1024 * 1024; // 300 Mo
    const videoDB = (() => {
        let opened;
        const open = () => opened || (opened = new Promise((resolve, reject) => {
            if (!window.indexedDB) return reject(new Error("IndexedDB indisponible"));
            const request = indexedDB.open("edtech-lms", 1);
            request.onupgradeneeded = () => request.result.createObjectStore("videos");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        }));
        const run = (mode, action) => open().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction("videos", mode);
            const request = action(tx.objectStore("videos"));
            tx.oncomplete = () => resolve(request.result);
            tx.onerror = tx.onabort = () => reject(tx.error);
        }));
        return {
            put: (key, blob) => run("readwrite", store => store.put(blob, key)),
            get: key => run("readonly", store => store.get(key)),
            remove: key => run("readwrite", store => store.delete(key))
        };
    })();

    const levelClass = level => level === "Débutant" ? "level-beginner" : "level-intermediate";


    /* ============ 2. ÉTAT + SAUVEGARDE ============ */

    const KEY = "edtech-lms-v2";
    const OLD_KEY = "devpath-progress-v1"; // ancienne version (partie 1)

    function loadState() {
        const base = { done: {}, position: {}, last: null, quiz: {}, videos: {}, custom: [], removed: [] };
        try {
            const saved = JSON.parse(localStorage.getItem(KEY));
            if (saved && typeof saved === "object") return { ...base, ...saved };

            // Reprise de la progression de la partie 1.
            const old = JSON.parse(localStorage.getItem(OLD_KEY));
            if (old && typeof old === "object") {
                for (const [id, value] of Object.entries(old)) {
                    if (value && Array.isArray(value.completed)) base.done[id] = value.completed;
                }
            }
        } catch (error) {
            console.warn("Sauvegarde illisible, on repart de zéro.", error);
        }
        return base;
    }

    let state = loadState();

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
        } catch (error) {
            console.warn("Sauvegarde impossible.", error);
        }
    }


    /* ============ 3. COURS ET PROGRESSION ============ */

    const allCourses = () => [
        ...COURSES.filter(course => !state.removed.includes(course.id)),
        ...state.custom
    ];
    const getCourse = id => allCourses().find(course => course.id === id);

    // Indices de leçons terminées (filtrés pour ne garder que des valeurs valides).
    const doneOf = course => [...new Set(state.done[course.id] || [])]
        .filter(i => Number.isInteger(i) && i >= 0 && i < course.lessons.length);

    const percentOf = course => Math.round(doneOf(course).length / course.lessons.length * 100);
    const totalMinutes = course => course.lessons.reduce((sum, lesson) => sum + lesson.min, 0);

    function toggleLesson(course, index) {
        const done = new Set(doneOf(course));
        if (done.has(index)) done.delete(index); else done.add(index);
        state.done[course.id] = [...done];
        save();
        return done.has(index);
    }

    // Première leçon non terminée, ou la dernière position connue.
    function resumeIndex(course) {
        const position = state.position[course.id];
        if (position && position.lesson >= 0 && position.lesson < course.lessons.length) return position.lesson;
        const next = course.lessons.findIndex((_, i) => !doneOf(course).includes(i));
        return next === -1 ? 0 : next;
    }

    function removeCourse(id) {
        const removed = getCourse(id);
        if (removed) removed.lessons.forEach(lesson => { if (lesson.localVideo) videoDB.remove(lesson.localVideo).catch(() => {}); });
        if (state.custom.some(course => course.id === id)) {
            state.custom = state.custom.filter(course => course.id !== id);
        } else if (!state.removed.includes(id)) {
            state.removed.push(id);
        }
        delete state.done[id];
        delete state.position[id];
        delete state.quiz[id];
        if (state.last && state.last.course === id) state.last = null;
        save();
    }


    /* ============ 4. ROUTEUR ============ */

    const view = $("#view");
    let onLeave = null;      // nettoyage de la vue courante (timers...)
    let refreshGrid = null;  // mise à jour de la grille quand on tape dans la recherche
    let query = "";
    let activeFilter = "all";

    const go = hash => { location.hash = hash; };

    function route() {
        if (onLeave) { onLeave(); onLeave = null; }
        refreshGrid = null;

        const [section, id, sub, number] = location.hash
            .replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);

        let node;
        let nav = "#/";
        const course = section === "cours" && id ? getCourse(id) : null;

        if (!section) node = viewHome();
        else if (section === "cours" && !id) { node = viewCatalogue(); nav = "#/cours"; }
        else if (course && sub === "lecon") { node = viewLesson(course, Number(number) - 1); nav = "#/cours"; }
        else if (course && sub === "quiz") { node = viewQuiz(course); nav = "#/cours"; }
        else if (course) { node = viewCourse(course); nav = "#/cours"; }
        else if (section === "progression") { node = viewProgress(); nav = "#/progression"; }
        else if (section === "admin") { node = viewAdmin(); nav = "#/admin"; }
        else node = viewNotFound();

        view.replaceChildren(node);

        const heading = $("h1", view);
        document.title = (heading ? heading.textContent + " — " : "") + "EdTech";

        document.querySelectorAll(".nav-link").forEach(link => {
            const active = link.dataset.nav === nav;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });

        closeMenu();
        window.scrollTo(0, 0);
        $("#main").focus({ preventScroll: true }); // aide les lecteurs d'écran
    }

    window.addEventListener("hashchange", route);


    /* ============ 5. VUES ============ */

    /* ---------- Éléments réutilisables ---------- */

    function progressBar(percent, large = false) {
        const fill = h("div", { class: "progress-fill" });
        fill.style.width = percent + "%";
        return {
            track: h("div", { class: "progress-track" + (large ? " large" : ""), role: "progressbar",
                "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": percent }, fill),
            fill
        };
    }

    function breadcrumb(...items) {
        return h("nav", { class: "crumbs", "aria-label": "Fil d'Ariane" },
            items.map((item, i) => [
                i > 0 ? h("span", { "aria-hidden": "true" }, "›") : null,
                item.href
                    ? h("a", { href: item.href }, item.label)
                    : h("span", { "aria-current": "page" }, item.label)
            ]));
    }

    function statsGrid() {
        const courses = allCourses();
        const completed = courses.filter(course => percentOf(course) === 100).length;
        const average = courses.length
            ? Math.round(courses.reduce((sum, course) => sum + percentOf(course), 0) / courses.length) : 0;
        const stat = (cls, icon, label, value) => h("article", { class: "stat-card" },
            h("div", { class: "stat-icon " + cls, "aria-hidden": "true" }, icon),
            h("div", {}, h("h2", { class: "stat-label" }, label), h("strong", { class: "stat-number" }, value)));
        return h("section", { class: "stats-grid", "aria-label": "Mes statistiques" },
            stat("purple", "▤", "Cours disponibles", courses.length),
            stat("green", "✓", "Cours terminés", completed),
            stat("orange", "↗", "Progression globale", average + "%"));
    }

    // Carte « reprendre là où tu t'étais arrêté » (position sauvegardée).
    function resumeCard() {
        const last = state.last;
        const course = last && getCourse(last.course);
        if (!course || !course.lessons[last.lesson]) return null;
        return h("section", { class: "resume-card", "aria-label": "Reprendre" },
            h("div", {},
                h("span", { class: "section-kicker" }, "REPRENDRE OÙ TU T'ES ARRÊTÉ·E"),
                h("h2", {}, course.title),
                h("p", {}, `Leçon ${last.lesson + 1} : ${course.lessons[last.lesson].title}`)),
            h("a", { class: "button button-primary", href: `#/cours/${course.id}/lecon/${last.lesson + 1}` }, "Continuer →"));
    }

    /* ---------- Carte de cours ---------- */

    function courseCard(course) {
        const percent = percentOf(course);
        const { track } = progressBar(percent);
        const href = `#/cours/${course.id}`;
        return h("article", {
            class: "course-card clickable",
            // Toute la carte est cliquable (correction du bug « rien ne s'ouvre »).
            onclick: event => { if (!event.target.closest("a, button")) go(href); }
        },
            h("div", { class: "course-cover " + (course.cover || "cover-custom"), "aria-hidden": "true" },
                h("span", { class: "cover-symbol" }, course.icon || "★"),
                h("span", { class: "cover-badge" }, course.badge || "COURS"),
                h("span", { class: "cover-decoration" }, course.deco || "")),
            h("div", { class: "course-body" },
                h("div", { class: "course-meta" },
                    h("span", { class: "level " + levelClass(course.level) }, course.level),
                    h("span", {}, `◷ ${formatDuration(totalMinutes(course))}`)),
                h("h3", {}, h("a", { href }, course.title)),
                h("p", {}, course.short || course.description),
                h("div", { class: "mini-progress" }, track, h("span", { class: "progress-label" }, percent + "%")),
                h("a", { class: "button button-primary", href },
                    percent === 100 ? "Revoir le cours ✓" : percent > 0 ? "Continuer le cours →" : "Découvrir le cours →")));
    }

    /* ---------- Catalogue (recherche + filtres) ---------- */

    function cataloguePart() {
        const grid = h("div", { class: "courses-grid" });
        const count = h("span", { class: "course-count", role: "status" });
        const levels = ["all", ...new Set(allCourses().map(course => course.level))];
        const filterRow = h("div", { class: "filter-row", role: "group", "aria-label": "Filtrer les cours" });

        function render() {
            const q = query.trim().toLocaleLowerCase("fr");
            const list = allCourses().filter(course =>
                (activeFilter === "all" || course.level === activeFilter) &&
                (course.title + " " + (course.short || course.description)).toLocaleLowerCase("fr").includes(q));
            const cards = list.map(courseCard);
            if (!list.length) cards.push(h("p", { class: "empty-state" }, "Aucun cours ne correspond à ta recherche."));
            grid.replaceChildren(...cards);
            count.textContent = String(list.length).padStart(2, "0") + " cours";
            filterRow.querySelectorAll("button").forEach(button => {
                const selected = button.dataset.filter === activeFilter;
                button.classList.toggle("selected", selected);
                button.setAttribute("aria-pressed", String(selected));
            });
        }

        levels.forEach(level => filterRow.append(h("button", {
            class: "filter-button", type: "button", "data-filter": level,
            onclick: () => { activeFilter = level; render(); }
        }, level === "all" ? "Tous les cours" : level)));

        refreshGrid = render;
        render();

        return h("section", { class: "courses-section" },
            h("div", { class: "section-heading" },
                h("div", {}, h("span", { class: "section-kicker" }, "TON PARCOURS"),
                    h("h2", {}, "Explore les cours"),
                    h("p", {}, "Choisis une compétence et commence à progresser.")),
                count),
            filterRow, grid);
    }

    /* ---------- Accueil ---------- */

    function viewHome() {
        const hero = h("section", { class: "hero" },
            h("div", { class: "hero-content" },
                h("span", { class: "eyebrow" }, h("span", { class: "status-dot" }), "TON ESPACE D'APPRENTISSAGE"),
                h("h1", {}, "Apprends aujourd'hui,", h("br"), h("span", {}, "construis demain.")),
                h("p", {}, "Développe tes compétences web à ton rythme : suis des cours, valide tes leçons et teste-toi avec des quiz."),
                h("a", { class: "button button-light", href: "#/cours" }, "Explorer les cours →")),
            h("div", { class: "hero-art", "aria-hidden": "true" },
                h("div", { class: "art-orbit orbit-one" }), h("div", { class: "art-orbit orbit-two" }),
                h("div", { class: "code-window" },
                    h("div", { class: "window-dots" }, h("i"), h("i"), h("i")),
                    h("div", { class: "code-lines" },
                        h("span", {}, h("b", {}, "01"), " <html>"),
                        h("span", { class: "code-highlight" }, h("b", {}, "02"), "   Hello, world!"),
                        h("span", {}, h("b", {}, "03"), " </html>"))),
                h("span", { class: "floating-tag tag-html" }, "HTML"),
                h("span", { class: "floating-tag tag-css" }, "CSS"),
                h("span", { class: "floating-tag tag-js" }, "JS")));
        return h("div", { class: "view" }, hero, resumeCard(), statsGrid(), cataloguePart());
    }

    function viewCatalogue() {
        return h("div", { class: "view" },
            h("h1", { class: "view-title" }, "Mes cours"), cataloguePart());
    }

    function viewNotFound() {
        return h("div", { class: "view" },
            h("h1", { class: "view-title" }, "Page introuvable"),
            h("p", {}, "Ce cours ou cette leçon n'existe pas (ou a été supprimé)."),
            h("a", { class: "button button-primary", href: "#/cours" }, "Retour aux cours"));
    }

    /* ---------- Fiche d'un cours : programme + checklist ---------- */

    function viewCourse(course) {
        const rows = [];
        const label = h("strong", {});
        const { track, fill } = progressBar(0, true);
        const resumeLink = h("a", { class: "button button-primary" });
        const status = h("p", { class: "action-message", role: "status", "aria-live": "polite" });

        // Met à jour toute la fiche sans la reconstruire (le focus reste en place).
        function sync() {
            const done = doneOf(course);
            const percent = percentOf(course);
            const resume = resumeIndex(course);
            label.textContent = `${percent}% — ${done.length}/${course.lessons.length} leçons`;
            fill.style.width = percent + "%";
            track.setAttribute("aria-valuenow", percent);
            resumeLink.href = `#/cours/${course.id}/lecon/${resume + 1}`;
            resumeLink.textContent = done.length ? `Reprendre la leçon ${resume + 1} →` : "Commencer le cours →";
            rows.forEach(({ row, check }, i) => {
                const isDone = done.includes(i);
                row.classList.toggle("done", isDone);
                row.classList.toggle("current", i === resume);
                check.textContent = isDone ? "✓" : "";
                check.setAttribute("aria-pressed", String(isDone));
            });
            syncQuiz();
        }

        const list = h("div", { class: "lesson-list" }, course.lessons.map((lesson, i) => {
            const check = h("button", {
                class: "lesson-check", type: "button",
                "aria-label": `Marquer la leçon ${i + 1} comme terminée`,
                onclick: () => {
                    const nowDone = toggleLesson(course, i);
                    status.textContent = nowDone ? `Leçon ${i + 1} validée.` : `Leçon ${i + 1} remise à faire.`;
                    sync();
                }
            });
            const row = h("div", { class: "lesson-item" },
                check,
                h("a", { class: "lesson-name", href: `#/cours/${course.id}/lecon/${i + 1}` }, `${i + 1}. ${lesson.title}`),
                h("span", { class: "lesson-duration" }, formatDuration(lesson.min)));
            rows.push({ row, check });
            return row;
        }));

        // Le quiz n'est débloqué que lorsque toutes les leçons sont validées.
        const hasQuiz = Boolean(course.quiz && course.quiz.length);
        const quizText = h("p", {});
        const quizAction = h("div", {});
        const quizBox = h("div", { class: "quiz-teaser" },
            h("div", {}, h("h4", {}, "Quiz de fin de cours"),
                hasQuiz ? quizText : h("p", {}, "Aucun quiz pour ce cours.")),
            quizAction);

        function syncQuiz() {
            if (!hasQuiz) return;
            const left = course.lessons.length - doneOf(course).length;
            const best = state.quiz[course.id];
            if (left > 0) {
                quizText.textContent = `🔒 Valide toutes les leçons pour débloquer le quiz (${left} restante${left > 1 ? "s" : ""}).`;
                quizAction.replaceChildren(h("span", { class: "button button-outline disabled", "aria-disabled": "true" }, "Quiz verrouillé"));
            } else {
                quizText.textContent = best
                    ? `Meilleur score : ${best.best}/${course.quiz.length} (${best.attempts} essai${best.attempts > 1 ? "s" : ""})`
                    : `Bravo, toutes les leçons sont validées ! ${course.quiz.length} questions t'attendent.`;
                quizAction.replaceChildren(h("a", { class: "button button-primary", href: `#/cours/${course.id}/quiz` },
                    best ? "Rejouer le quiz" : "Passer le quiz →"));
            }
        }

        const reset = h("button", {
            class: "button button-outline", type: "button",
            onclick: () => {
                if (!confirm("Veux-tu vraiment remettre ce cours à zéro ?")) return;
                delete state.done[course.id];
                delete state.position[course.id];
                save();
                status.textContent = "La progression de ce cours a été réinitialisée.";
                sync();
            }
        }, "Recommencer");

        const node = h("section", { class: "detail-section view" },
            breadcrumb({ label: "Mes cours", href: "#/cours" }, { label: course.title }),
            h("article", { class: "lesson-panel" },
                h("div", { class: "lesson-heading" },
                    h("div", { class: "lesson-icon", "aria-hidden": "true" }, course.icon || "★"),
                    h("div", { class: "lesson-title" },
                        h("span", { class: "level " + levelClass(course.level) }, course.level),
                        h("h1", {}, course.title),
                        h("p", {}, course.description))),
                h("div", { class: "lesson-progress-row" }, h("span", {}, "Progression du cours"), label),
                track,
                h("h2", { class: "curriculum-title" }, "Programme du cours"),
                list, quizBox,
                h("div", { class: "lesson-actions" }, reset, resumeLink),
                status));
        sync();
        return node;
    }

    /* ---------- Vidéo YouTube d'une leçon ---------- */

    // Affiche la vidéo de la leçon : fichier enregistré localement, sinon lien YouTube
    // (celui du cours ou celui ajouté par l'apprenant).
    function videoBlock(course, index, lesson) {
        const key = `${course.id}:${index}`;
        const box = h("section", { class: "video-box", "aria-label": "Vidéo de la leçon" });
        let objectUrl = null;
        const releaseUrl = () => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; } };
        onLeave = releaseUrl;

        function renderLocal() {
            const frame = h("div", { class: "video-empty" }, "Chargement de la vidéo…");
            videoDB.get(lesson.localVideo).then(blob => {
                if (!blob) {
                    frame.textContent = "La vidéo enregistrée pour cette leçon n'est pas disponible dans ce navigateur.";
                    return;
                }
                releaseUrl();
                objectUrl = URL.createObjectURL(blob);
                frame.className = "video-frame";
                frame.replaceChildren(h("video", { controls: true, preload: "metadata", src: objectUrl, "aria-label": `Vidéo : ${lesson.title}` }));
            }).catch(() => { frame.textContent = "Impossible de lire la vidéo enregistrée."; });
            box.replaceChildren(frame);
        }

        function render() {
            if (lesson.localVideo) return renderLocal();

            const id = youtubeId(state.videos[key] || lesson.video);
            const message = h("small", { class: "error", role: "alert" });
            const input = h("input", { type: "url", id: "yt-link", placeholder: "Colle un lien YouTube ici", "aria-label": "Lien YouTube de la leçon" });
            const query = `${course.title.split("—")[0].trim()} ${lesson.title} cours`;
            const searchUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);

            const form = h("form", { class: "video-form", novalidate: true,
                onsubmit: event => {
                    event.preventDefault();
                    const found = youtubeId(input.value);
                    if (!found) { message.textContent = "Lien YouTube non valide. Exemple : https://www.youtube.com/watch?v=..."; input.focus(); return; }
                    state.videos[key] = `https://youtu.be/${found}`;
                    save();
                    render();
                } },
                h("label", { for: "yt-link" }, id ? "Changer de vidéo" : "Ajouter une vidéo YouTube pour cette leçon"),
                h("div", { class: "video-form-row" }, input, h("button", { class: "button button-primary", type: "submit" }, "Enregistrer")),
                message);

            box.replaceChildren(
                id
                    ? h("div", { class: "video-frame" }, h("iframe", {
                        src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
                        title: `Vidéo YouTube : ${lesson.title}`,
                        loading: "lazy", allowfullscreen: true,
                        allow: "accelerometer; encrypted-media; picture-in-picture; fullscreen",
                        referrerpolicy: "strict-origin-when-cross-origin" }))
                    : h("div", { class: "video-empty" }, h("strong", {}, "▶ Pas encore de vidéo pour cette leçon"),
                        h("p", {}, "Cherche une vidéo sur YouTube, copie son lien et colle-le ci-dessous.")),
                h("div", { class: "video-links" },
                    id ? h("a", { href: `https://www.youtube.com/watch?v=${id}`, target: "_blank", rel: "noopener noreferrer" }, "Ouvrir sur YouTube ↗") : null,
                    h("a", { href: searchUrl, target: "_blank", rel: "noopener noreferrer" }, "Chercher d'autres vidéos sur ce sujet ↗"),
                    state.videos[key] ? h("button", { class: "link-button", type: "button", onclick: () => { delete state.videos[key]; save(); render(); } }, "Retirer ma vidéo") : null),
                form);
        }

        render();
        return box;
    }

    /* ---------- Leçon : vidéo + chapitres, position sauvegardée ---------- */

    function viewLesson(course, index) {
        const lesson = course.lessons[index];
        if (!Number.isInteger(index) || !lesson) return viewNotFound();

        // Chapitre mémorisé si on revient dans la même leçon.
        const previous = state.position[course.id];
        const sections = lesson.sections && lesson.sections.length ? lesson.sections : [["Contenu", "Contenu à venir."]];
        let current = previous && previous.lesson === index ? Math.min(previous.section || 0, sections.length - 1) : 0;

        state.position[course.id] = { lesson: index, section: current };
        state.last = { course: course.id, lesson: index };
        save();

        // --- Chapitres : simple navigation Précédent / Suivant (pas de lecture automatique) ---
        const chapterTitle = h("h2", { class: "chapter-title" });
        const chapterText = h("p", { class: "chapter-text" });
        const counter = h("span", { class: "chapter-counter" });
        const tabs = sections.map((section, i) => h("button", {
            class: "chapter-tab", type: "button", title: section[0],
            "aria-label": `Chapitre ${i + 1} : ${section[0]}`,
            onclick: () => show(i)
        }, String(i + 1)));
        const prevChapter = h("button", { class: "button button-outline", type: "button", onclick: () => show(current - 1) }, "← Chapitre précédent");
        const nextChapter = h("button", { class: "button button-outline", type: "button", onclick: () => show(current + 1) }, "Chapitre suivant →");
        const status = h("p", { class: "action-message", role: "status", "aria-live": "polite" });

        function show(i) {
            current = Math.max(0, Math.min(i, sections.length - 1));
            chapterTitle.textContent = sections[current][0];
            chapterText.textContent = sections[current][1];
            counter.textContent = `Chapitre ${current + 1} / ${sections.length}`;
            tabs.forEach((tab, k) => {
                tab.classList.toggle("active", k === current);
                tab.classList.toggle("passed", k < current);
                if (k === current) tab.setAttribute("aria-current", "step"); else tab.removeAttribute("aria-current");
            });
            prevChapter.disabled = current === 0;
            nextChapter.disabled = current === sections.length - 1;
            state.position[course.id] = { lesson: index, section: current }; // sauvegarde automatique
            save();
        }

        const hasPrev = index > 0;
        const hasNext = index < course.lessons.length - 1;
        const hasQuiz = Boolean(course.quiz && course.quiz.length);
        const nextLink = h("a", { class: "button button-primary" });

        // Dernière leçon : le quiz n'apparaît que si tout le cours est validé.
        function syncNext() {
            if (hasNext) {
                nextLink.href = `#/cours/${course.id}/lecon/${index + 2}`;
                nextLink.textContent = "Suivante →";
            } else if (hasQuiz && percentOf(course) === 100) {
                nextLink.href = `#/cours/${course.id}/quiz`;
                nextLink.textContent = "Passer le quiz →";
            } else {
                nextLink.href = `#/cours/${course.id}`;
                nextLink.textContent = hasQuiz ? "Retour au programme" : "Terminer";
            }
        }

        const doneButton = h("button", { class: "button button-outline", type: "button", onclick: () => {
            const nowDone = toggleLesson(course, index);
            syncDone();
            status.textContent = nowDone ? "Leçon validée ✓" : "Leçon remise à faire.";
            if (nowDone && hasQuiz && percentOf(course) === 100) status.textContent += " Toutes les leçons sont validées : le quiz est débloqué !";
        } });
        function syncDone() {
            const isDone = doneOf(course).includes(index);
            doneButton.textContent = isDone ? "✓ Leçon terminée (annuler)" : "Valider la leçon ✓";
            doneButton.setAttribute("aria-pressed", String(isDone));
            syncNext();
        }

        const node = h("section", { class: "detail-section view" },
            breadcrumb({ label: "Mes cours", href: "#/cours" }, { label: course.title, href: `#/cours/${course.id}` },
                { label: `Leçon ${index + 1}` }),
            h("article", { class: "lesson-panel" },
                h("span", { class: "level " + levelClass(course.level) }, `Leçon ${index + 1} / ${course.lessons.length} · ${formatDuration(lesson.min)}`),
                h("h1", { class: "lesson-h1" }, lesson.title),
                videoBlock(course, index, lesson),
                h("section", { class: "chapters", "aria-label": "Chapitres de la leçon" },
                    h("div", { class: "chapter-tabs", role: "group", "aria-label": "Chapitres" }, tabs, counter),
                    h("article", { class: "chapter-card" }, chapterTitle, chapterText),
                    h("div", { class: "chapter-nav" }, prevChapter, nextChapter)),
                h("div", { class: "lesson-actions split" },
                    hasPrev ? h("a", { class: "button button-outline", href: `#/cours/${course.id}/lecon/${index}` }, "← Leçon précédente") : h("a", { class: "button button-outline", href: `#/cours/${course.id}` }, "← Programme"),
                    doneButton,
                    nextLink),
                status));
        show(current);
        syncDone();
        return node;
    }

    /* ---------- Quiz : validation immédiate + meilleur score ---------- */

    function viewQuiz(course) {
        if (!course.quiz || !course.quiz.length) {
            return h("div", { class: "view" }, h("h1", { class: "view-title" }, "Pas de quiz"),
                h("a", { class: "button button-primary", href: `#/cours/${course.id}` }, "Retour au cours"));
        }
        if (percentOf(course) < 100) {
            const left = course.lessons.length - doneOf(course).length;
            return h("div", { class: "view" },
                h("h1", { class: "view-title" }, "Quiz verrouillé 🔒"),
                h("p", {}, `Valide d'abord toutes les leçons de « ${course.title} » (${left} restante${left > 1 ? "s" : ""}).`),
                h("a", { class: "button button-primary", href: `#/cours/${course.id}/lecon/${resumeIndex(course) + 1}` }, "Continuer les leçons →"));
        }
        const box = h("div", { class: "quiz-box" });
        let questions, step, score;

        function start() {
            // Questions et réponses mélangées à chaque essai.
            questions = shuffle(course.quiz).map(item => ({
                q: item.q, explain: item.explain,
                options: shuffle(item.options.map((text, i) => ({ text, ok: i === item.answer })))
            }));
            step = 0;
            score = 0;
            render();
        }

        function render() {
            box.replaceChildren();
            if (step >= questions.length) return box.append(result());

            const item = questions[step];
            const { track } = progressBar(Math.round(step / questions.length * 100));
            const feedback = h("div", { class: "feedback", role: "status", "aria-live": "polite" });
            const nextButton = h("button", { class: "button button-primary", type: "button", hidden: true, onclick: () => { step++; render(); } },
                step === questions.length - 1 ? "Voir mon score →" : "Question suivante →");
            const name = "q" + step;

            const options = item.options.map(option => {
                const input = h("input", { type: "radio", name, class: "quiz-input" });
                const label = h("label", { class: "quiz-option" }, input, h("span", {}, option.text));
                input.addEventListener("change", () => {
                    // Validation immédiate dès le choix de la réponse.
                    box.querySelectorAll(".quiz-input").forEach(radio => { radio.disabled = true; });
                    item.options.forEach((opt, i) => {
                        const el = options[i].label;
                        if (opt.ok) { el.classList.add("correct"); el.append(h("em", {}, " ✓ Bonne réponse")); }
                    });
                    if (option.ok) {
                        score++;
                        feedback.className = "feedback ok";
                        feedback.textContent = "✓ Bravo, bonne réponse ! " + item.explain;
                    } else {
                        label.classList.add("wrong");
                        label.append(h("em", {}, " ✗ Incorrect"));
                        feedback.className = "feedback ko";
                        feedback.textContent = "✗ Pas tout à fait. " + item.explain;
                    }
                    nextButton.hidden = false;
                    nextButton.focus();
                });
                return { label, input };
            });

            box.append(
                h("div", { class: "quiz-head" }, h("span", {}, `Question ${step + 1} / ${questions.length}`), h("span", {}, `Score : ${score}`)),
                track,
                h("fieldset", { class: "quiz-fieldset" }, h("legend", {}, item.q), options.map(o => o.label)),
                feedback, nextButton);
            options[0].input.focus({ preventScroll: true });
        }

        function result() {
            const total = questions.length;
            const previous = state.quiz[course.id] || { best: 0, attempts: 0 };
            const isRecord = score > previous.best;
            state.quiz[course.id] = { best: Math.max(previous.best, score), attempts: previous.attempts + 1, last: score };
            save();
            const percent = Math.round(score / total * 100);
            return h("div", { class: "quiz-result" },
                h("h2", {}, "Quiz terminé !"),
                h("p", { class: "big-score" }, `${score} / ${total}`),
                h("p", {}, percent === 100 ? "Parfait ! 🎉" : percent >= 50 ? "Bien joué, continue comme ça." : "Revois les leçons puis réessaie."),
                h("p", { class: "muted" }, isRecord ? "Nouveau meilleur score !" : `Meilleur score : ${state.quiz[course.id].best}/${total}`),
                h("div", { class: "lesson-actions" },
                    h("a", { class: "button button-outline", href: `#/cours/${course.id}` }, "Retour au cours"),
                    h("button", { class: "button button-primary", type: "button", onclick: start }, "Rejouer ↻")));
        }

        const node = h("section", { class: "detail-section view" },
            breadcrumb({ label: "Mes cours", href: "#/cours" }, { label: course.title, href: `#/cours/${course.id}` }, { label: "Quiz" }),
            h("article", { class: "lesson-panel" }, h("h1", { class: "lesson-h1" }, `Quiz — ${course.title}`), box));
        start();
        return node;
    }

    /* ---------- Ma progression ---------- */

    function viewProgress() {
        const list = h("div", { class: "progress-list" }, allCourses().map(course => {
            const percent = percentOf(course);
            const best = state.quiz[course.id];
            return h("article", { class: "progress-row" },
                h("div", { class: "progress-row-main" },
                    h("h2", {}, h("a", { href: `#/cours/${course.id}` }, course.title)),
                    progressBar(percent).track,
                    h("p", { class: "muted" },
                        `${doneOf(course).length}/${course.lessons.length} leçons · ` +
                        (best ? `quiz : ${best.best}/${(course.quiz || []).length}` : "quiz non passé"))),
                h("strong", { class: "progress-percent" }, percent + "%"),
                h("a", { class: "button button-outline", href: `#/cours/${course.id}/lecon/${resumeIndex(course) + 1}` }, "Reprendre"));
        }));
        const reset = h("button", { class: "button button-outline", type: "button", onclick: () => {
            if (!confirm("Effacer toute ta progression et tes scores ?")) return;
            state.done = {}; state.position = {}; state.last = null; state.quiz = {};
            save();
            route();
        } }, "Tout réinitialiser");
        return h("div", { class: "view" }, h("h1", { class: "view-title" }, "Ma progression"),
            statsGrid(), list, h("div", { class: "lesson-actions" }, reset));
    }

    /* ---------- Administration (ajout / suppression de cours) ---------- */

    function viewAdmin() {
        const status = h("p", { class: "action-message", role: "status", "aria-live": "polite" });
        const list = h("div", { class: "admin-list" });

        function renderList() {
            const items = allCourses().map(course => h("div", { class: "admin-item" },
                h("span", {}, h("strong", {}, course.title), ` — ${course.level}, ${course.lessons.length} leçons`),
                h("button", { class: "button button-outline danger", type: "button",
                    "aria-label": `Supprimer le cours ${course.title}`,
                    onclick: () => {
                        if (!confirm(`Supprimer « ${course.title} » ?`)) return;
                        removeCourse(course.id);
                        status.textContent = "Cours supprimé.";
                        renderList();
                    } }, "Supprimer")));
            if (!items.length) items.push(h("p", { class: "muted" }, "Aucun cours. Ajoutes-en un ou restaure les cours par défaut."));
            list.replaceChildren(...items);
        }

        const field = (id, labelText, control) => h("div", { class: "field" },
            h("label", { for: id }, labelText), control,
            h("small", { class: "error", id: id + "-error", role: "alert" }));

        const title = h("input", { id: "f-title", name: "title", type: "text", maxlength: 60, autocomplete: "off", placeholder: "Ex. : Git et GitHub" });
        const level = h("select", { id: "f-level", name: "level" },
            ["Débutant", "Intermédiaire", "Avancé"].map(name => h("option", { value: name }, name)));
        const description = h("textarea", { id: "f-desc", name: "description", rows: 2, maxlength: 200, placeholder: "De quoi parle ce cours ?" });

        /* --- Constructeur de leçons : titre, durée, vidéo, chapitres + contenu --- */
        const lessonRows = h("div", { class: "builder-list" });

        function renumber() {
            [...lessonRows.children].forEach((row, i) => {
                $(".builder-num", row).textContent = i + 1;
                $(".l-title", row).setAttribute("aria-label", `Titre de la leçon ${i + 1}`);
                $(".remove-lesson", row).setAttribute("aria-label", `Supprimer la leçon ${i + 1}`);
            });
        }

        function addChapter(chapterList, focus = false) {
            const chTitle = h("input", { type: "text", class: "c-title", maxlength: 80, placeholder: "Titre du chapitre", "aria-label": "Titre du chapitre" });
            const chText = h("textarea", { class: "c-text", rows: 3, placeholder: "Contenu du chapitre (explications, exemples...)", "aria-label": "Contenu du chapitre" });
            const chRow = h("div", { class: "chapter-row" },
                h("div", { class: "builder-fields" }, chTitle, chText),
                h("button", { class: "icon-remove", type: "button", "aria-label": "Supprimer ce chapitre",
                    onclick: () => { if (chapterList.children.length > 1) chRow.remove(); } }, "✕"));
            chapterList.append(chRow);
            if (focus) chTitle.focus();
        }

        function addLesson(focus = false) {
            const titleInput = h("input", { type: "text", class: "l-title", maxlength: 80, placeholder: "Titre de la leçon" });
            const minutes = h("input", { type: "number", class: "l-min", min: 5, max: 240, value: 20, "aria-label": "Durée en minutes" });
            const link = h("input", { type: "url", class: "l-link", placeholder: "Lien YouTube (facultatif)", "aria-label": "Lien YouTube de la leçon" });
            const file = h("input", { type: "file", class: "l-file", accept: "video/*" });
            const chapterList = h("div", { class: "chapter-list" });
            const row = h("div", { class: "builder-row lesson-card" },
                h("span", { class: "builder-num", "aria-hidden": "true" }, ""),
                h("div", { class: "builder-fields" },
                    titleInput,
                    h("div", { class: "builder-inline" }, minutes, h("span", {}, "min"), link),
                    h("label", { class: "file-label" }, "Ou une vidéo enregistrée sur ton ordinateur (facultatif)", file),
                    h("small", { class: "muted" }, "Si les deux sont fournis, la vidéo enregistrée est affichée. Elle reste dans ce navigateur."),
                    h("h4", { class: "chapters-heading" }, "Chapitres de la leçon"),
                    chapterList,
                    h("button", { class: "button button-outline small", type: "button", onclick: () => addChapter(chapterList, true) }, "+ Ajouter un chapitre"),
                    h("small", { class: "error", role: "alert" })),
                h("button", { class: "icon-remove remove-lesson", type: "button", onclick: () => {
                    if (lessonRows.children.length > 1) { row.remove(); renumber(); }
                } }, "✕"));
            addChapter(chapterList);
            lessonRows.append(row);
            renumber();
            if (focus) titleInput.focus();
        }

        /* --- Constructeur de quiz : question + 3 réponses, la bonne est cochée --- */
        const quizRows = h("div", { class: "builder-list" });
        let questionCount = 0;

        function addQuestion(focus = false) {
            const name = "right" + (++questionCount);
            const question = h("input", { type: "text", class: "q-text", placeholder: "Question", "aria-label": "Question" });
            const answers = [0, 1, 2].map(i => h("div", { class: "answer-row" },
                h("input", { type: "radio", name, class: "q-right", checked: i === 0, "aria-label": `Réponse ${i + 1} : bonne réponse` }),
                h("input", { type: "text", class: "q-answer", maxlength: 100,
                    placeholder: i < 2 ? `Réponse ${i + 1}` : `Réponse ${i + 1} (facultative)`, "aria-label": `Réponse ${i + 1}` })));
            const row = h("div", { class: "builder-row" },
                h("span", { class: "builder-num", "aria-hidden": "true" }, "?"),
                h("div", { class: "builder-fields" }, question,
                    h("p", { class: "muted" }, "Coche le rond de la bonne réponse."),
                    answers, h("small", { class: "error", role: "alert" })),
                h("button", { class: "icon-remove", type: "button", "aria-label": "Supprimer cette question", onclick: () => row.remove() }, "✕"));
            quizRows.append(row);
            if (focus) question.focus();
        }

        function resetBuilders() {
            lessonRows.replaceChildren();
            quizRows.replaceChildren();
            addLesson();
        }

        const form = h("form", { class: "admin-form", novalidate: true,
            onsubmit: async event => {
                event.preventDefault();
                form.querySelectorAll(".error").forEach(el => { el.textContent = ""; });
                let firstInvalid = null;
                const fail = (control, messageEl, text) => {
                    messageEl.textContent = text;
                    if (!firstInvalid) firstInvalid = control;
                };

                if (title.value.trim().length < 3) fail(title, $("#f-title-error"), "Le titre doit contenir au moins 3 caractères.");
                if (description.value.trim().length < 10) fail(description, $("#f-desc-error"), "La description doit contenir au moins 10 caractères.");

                // Leçons
                const lessons = [];
                const pendingFiles = [];
                [...lessonRows.children].forEach(row => {
                    const titleInput = $(".l-title", row);
                    const link = $(".l-link", row);
                    const fileInput = $(".l-file", row);
                    const errorEl = $(".error", row);
                    const name = titleInput.value.trim();
                    const chapters = [...row.querySelectorAll(".chapter-row")].map(chapter => ({
                        titleEl: $(".c-title", chapter), t: $(".c-title", chapter).value.trim(), p: $(".c-text", chapter).value.trim()
                    }));
                    const filled = chapters.filter(chapter => chapter.t || chapter.p);
                    const file = fileInput.files && fileInput.files[0];
                    if (!name && !link.value.trim() && !filled.length && !file) return; // leçon vide ignorée

                    if (!name) return fail(titleInput, errorEl, "Donne un titre à cette leçon.");
                    if (link.value.trim() && !youtubeId(link.value)) return fail(link, errorEl, "Lien YouTube non valide.");
                    if (file && !file.type.startsWith("video/")) return fail(fileInput, errorEl, "Le fichier doit être une vidéo.");
                    if (file && file.size > MAX_VIDEO) return fail(fileInput, errorEl, `Vidéo trop lourde (maximum ${MAX_VIDEO / 1024 / 1024} Mo).`);
                    const incomplete = filled.find(chapter => !chapter.t || !chapter.p);
                    if (incomplete) return fail(incomplete.titleEl, errorEl, "Chaque chapitre a besoin d'un titre ET d'un contenu.");
                    if (!filled.length) return fail(chapters[0].titleEl, errorEl, "Ajoute au moins un chapitre (titre + contenu).");

                    const id = youtubeId(link.value);
                    const lesson = {
                        title: name,
                        min: Math.min(240, Math.max(5, Number($(".l-min", row).value) || 20)),
                        video: id ? `https://youtu.be/${id}` : "",
                        sections: filled.map(chapter => [chapter.t, chapter.p])
                    };
                    lessons.push(lesson);
                    if (file) pendingFiles.push({ lesson, file });
                });
                if (!lessons.length && !firstInvalid) fail($(".l-title", lessonRows.firstElementChild), $(".error", lessonRows.firstElementChild), "Ajoute au moins une leçon.");

                // Quiz (facultatif) : une question vide est ignorée
                const quiz = [];
                [...quizRows.children].forEach(row => {
                    const text = $(".q-text", row).value.trim();
                    const options = [...row.querySelectorAll(".answer-row")].map(answer => ({
                        text: $(".q-answer", answer).value.trim(), right: $(".q-right", answer).checked
                    })).filter(option => option.text);
                    const right = options.find(option => option.right);
                    const errorEl = $(".error", row);
                    if (!text && !options.length) return;
                    if (!text) return fail($(".q-text", row), errorEl, "Écris la question.");
                    if (options.length < 2) return fail($(".q-answer", row), errorEl, "Ajoute au moins 2 réponses.");
                    if (!right) return fail($(".q-answer", row), errorEl, "La bonne réponse cochée doit être remplie.");
                    quiz.push({
                        q: text, answer: 0, explain: `La bonne réponse était : ${right.text}.`,
                        options: [right.text, ...options.filter(option => option !== right).map(option => option.text)]
                    });
                });

                if (firstInvalid) {
                    firstInvalid.focus();
                    status.textContent = "Le formulaire contient des erreurs : corrige les champs en rouge.";
                    return;
                }
                const courseId = "c" + Date.now().toString(36);
                try {
                    // Vidéos enregistrées localement : stockées dans IndexedDB.
                    for (const { lesson, file } of pendingFiles) {
                        const videoKey = `${courseId}-${lessons.indexOf(lesson)}`;
                        await videoDB.put(videoKey, file);
                        lesson.localVideo = videoKey;
                    }
                } catch (error) {
                    pendingFiles.forEach(({ lesson }) => { if (lesson.localVideo) videoDB.remove(lesson.localVideo).catch(() => {}); });
                    status.textContent = "Impossible d'enregistrer la vidéo dans ce navigateur (espace insuffisant ou stockage bloqué).";
                    return;
                }
                state.custom.push({
                    id: courseId,
                    title: title.value.trim(), level: level.value,
                    short: description.value.trim(), description: description.value.trim(),
                    icon: "★", badge: "NOUVEAU", deco: "COURS", lessons, quiz
                });
                save();
                form.reset();
                resetBuilders();
                status.textContent = `Cours « ${state.custom[state.custom.length - 1].title} » ajouté ✓ Il est disponible dans « Mes cours ».`;
                renderList();
                title.focus();
            } },
            field("f-title", "Titre du cours", title),
            field("f-level", "Niveau", level),
            field("f-desc", "Description", description),
            h("fieldset", { class: "builder" },
                h("legend", {}, "Leçons"),
                h("p", { class: "muted" }, "Pour chaque leçon : titre, durée, vidéo (YouTube ou fichier) et chapitres avec leur contenu."),
                lessonRows,
                h("button", { class: "button button-outline", type: "button", onclick: () => addLesson(true) }, "+ Ajouter une leçon")),
            h("fieldset", { class: "builder" },
                h("legend", {}, "Quiz (facultatif)"),
                quizRows,
                h("button", { class: "button button-outline", type: "button", onclick: () => addQuestion(true) }, "+ Ajouter une question")),
            h("button", { class: "button button-primary", type: "submit" }, "Ajouter le cours"));

        const restore = h("button", { class: "button button-outline", type: "button", onclick: () => {
            state.removed = [];
            save();
            status.textContent = "Cours par défaut restaurés.";
            renderList();
        } }, "Restaurer les cours par défaut");

        resetBuilders();
        renderList();
        return h("div", { class: "view" },
            h("h1", { class: "view-title" }, "Administration"),
            h("p", { class: "muted" }, "Interface simplifiée : ajoute ou supprime des cours (enregistrés dans ce navigateur)."),
            status,
            h("div", { class: "admin-grid" },
                h("section", { class: "lesson-panel" }, h("h2", {}, "Nouveau cours"), form),
                h("section", { class: "lesson-panel" }, h("h2", {}, "Cours existants"), list, h("div", { class: "lesson-actions" }, restore))));
    }

    /* ============ 6. MENU, RECHERCHE, RACCOURCIS ============ */

    const sidebar = $("#sidebar");
    const burger = $("#burger");
    const search = $("#search");

    function closeMenu() {
        sidebar.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Ouvrir le menu");
    }

    burger.addEventListener("click", () => {
        const open = sidebar.classList.toggle("open");
        burger.setAttribute("aria-expanded", String(open));
        burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });

    // La recherche filtre la grille, ou renvoie vers le catalogue depuis une autre page.
    search.addEventListener("input", () => {
        query = search.value;
        if (refreshGrid) refreshGrid(); else go("#/cours");
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            search.focus();
        }
    });

    matchMedia("(min-width: 761px)").addEventListener("change", event => { if (event.matches) closeMenu(); });

    route(); // premier affichage
})();
