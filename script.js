// Globális objektum a könyv fejezeteinek tárolására
let bookChapters = {};

// --- 1. RÉSZ: FÁJL BEOLVASÁSA (A bekeres.html oldalon fut) ---
const fileButton = document.getElementById('fileButton');
if (fileButton) {
    fileButton.addEventListener('change', function (event) {
        const files = event.target.files;
        if (files.length === 0) return;

        const file = files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const allText = e.target.result;
            const lines = allText.split('\n').map(line => line.trim()).filter(line => line !== '');

            if (lines.length === 0) {
                document.getElementById("continue").style.display = "none";
                alert("A kiválasztott fájl nem tartalmaz adatot!");
                return;
            }

            // Feldolgozzuk a sorokat és felépítjük a könyv struktúrát
            let parsedBook = {};
            lines.forEach(line => {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const id = parts[0].trim();
                    const text = parts[1].trim();
                    const optionsRaw = parts[2] ? parts[2].trim() : "";
                    
                    // Opciók szétszedése (Gomb szöveg és cél fejezet)
                    let options = [];
                    if (optionsRaw) {
                        optionsRaw.split(',').forEach(opt => {
                            const optParts = opt.split(':');
                            if (optParts.length === 2) {
                                options.push({
                                    text: optParts[0].trim(),
                                    target: optParts[1].trim()
                                });
                            }
                        });
                    }

                    parsedBook[id] = { text: text, options: options };
                }
            });

            // Elmentjük a böngésző memóriájába, hogy a másik HTML oldal is elérje
            localStorage.setItem('kjk_book', JSON.stringify(parsedBook));
            
            // Megjelenítjük a Tovább gombot
            document.getElementById("continue").style.display = "block";
            console.log("Könyv sikeresen beolvasva és elmentve!");
        };

        reader.readAsText(file);
    });
}

// --- 2. RÉSZ: JÁTÉKMENET KEZELÉSE (Az index.html oldalon fut) ---
if (document.getElementById('options-container')) {
    // Amikor betölt az index.html, lekérjük a mentett könyvet
    const savedBook = localStorage.getItem('kjk_book');
    
    if (savedBook) {
        bookChapters = JSON.parse(savedBook);
        // Generáljunk véletlenszerű Kalandlap statisztikákat a klasszikus szabályok szerint
        generalKalandlap();
        // Betöltjük az 1. fejezetet kezdésként
        loadChapter("1");
    }
}

// Fejezet megjelenítése és a gombok legenerálása
function loadChapter(chapterId) {
    const chapter = bookChapters[chapterId];
    if (!chapter) {
        alert("Hiba: A(z) " + chapterId + ". fejezet nem található a fájlban!");
        return;
    }

    // Cím és leírás frissítése
    document.getElementById("chapter-title").innerText = chapterId + ". fejezet";
    document.getElementById("description").innerText = chapter.text;

    // Harc ablak elrejtése alapértelmezetten
    document.getElementById("fight").style.display = "none";

    // Régi gombok törlése
    const container = document.getElementById("options-container");
    container.innerHTML = "";

    // Új gombok létrehozása a fejezet opciói alapján
    chapter.options.forEach(option => {
        const button = document.createElement("button");
        button.className = "option-btn";
        button.innerText = option.text;
        
        // Eseménykezelő: ha rákattint, ugorjon a megadott fejezetre vagy harcra
        button.addEventListener("click", function() {
            if (option.target === "fight") {
                startBattle();
            } else {
                loadChapter(option.target);
            }
        });
        
        container.appendChild(button);
    });
}

// Egyszerű Kalandlap generátor (D6 kockadobásokkal)
function generalKalandlap() {
    // Ügyesség: 1d6 + 6
    const skill = Math.floor(Math.random() * 6) + 1 + 6;
    // Életerő: 2d6 + 12
    const stamina = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2 + 12;
    // Szerencse: 1d6 + 6
    const luck = Math.floor(Math.random() * 6) + 1 + 6;

    document.getElementById("skill-val").innerText = skill;
    document.getElementById("stamina-val").innerText = stamina;
    document.getElementById("luck-val").innerText = luck;
}

// Csata elindítása funkció
function startBattle() {
    const fightBox = document.getElementById("fight");
    fightBox.style.display = "block";
    // Görgetünk az aljára, hogy látszódjon a harc panel
    fightBox.scrollIntoView({ behavior: 'smooth' });
}