let bookChapters = {};
let currentEnemy = { name: "", skill: 0, stamina: 0, next: "1" };

// =============================================================================
// 1. RÉSZ: FÁJL BEOLVASÁSA (bekeres.html)
// =============================================================================
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

            const statusEl = document.getElementById("file-status");
            const continueEl = document.getElementById("continue");

            if (lines.length === 0) {
                if (statusEl) statusEl.textContent = "⚠ A kiválasztott fájl üres!";
                if (continueEl) continueEl.style.display = "none";
                return;
            }

            let parsedBook = {};
            let parseErrors = 0;

            lines.forEach((line, idx) => {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const id = parts[0].trim();
                    const text = parts[1].trim();
                    const optionsRaw = parts[2] ? parts[2].trim() : "";

                    let options = [];
                    if (optionsRaw) {
                        optionsRaw.split(',').forEach(opt => {
                            opt = opt.trim();
                            // Utolsó ':' alapján vágunk, hogy a szövegben lehessen kettőspont
                            const lastColon = opt.lastIndexOf(':');
                            if (lastColon > 0) {
                                const optText   = opt.substring(0, lastColon).trim();
                                const optTarget = opt.substring(lastColon + 1).trim();
                                if (optText && optTarget) {
                                    options.push({ text: optText, target: optTarget });
                                }
                            }
                        });
                    }

                    if (id) {
                        parsedBook[id] = { text: text, options: options };
                    }
                } else {
                    parseErrors++;
                }
            });

            const chapterCount = Object.keys(parsedBook).length;

            if (chapterCount === 0) {
                if (statusEl) statusEl.textContent = "⚠ Nem sikerült fejezeteket beolvasni. Ellenőrizd a fájl formátumát!";
                if (continueEl) continueEl.style.display = "none";
                return;
            }

            // Mentés localStorage-ba
            try {
                localStorage.setItem('kjk_book', JSON.stringify(parsedBook));
                if (statusEl) {
                    statusEl.textContent = `✓ ${chapterCount} fejezet sikeresen betöltve: ${file.name}`;
                }
                if (continueEl) continueEl.style.display = "inline-block";
            } catch (err) {
                // localStorage nem elérhető (pl. privát mód, kvóta)
                if (statusEl) statusEl.textContent = "⚠ Nem sikerült menteni a böngésző memóriájába. Próbálj normál módban!";
                if (continueEl) continueEl.style.display = "none";
            }
        };

        reader.onerror = function () {
            const statusEl = document.getElementById("file-status");
            if (statusEl) statusEl.textContent = "⚠ Hiba a fájl olvasásakor!";
        };

        reader.readAsText(file, 'UTF-8');
    });
}

// =============================================================================
// 2. RÉSZ: JÁTÉKMENET (index.html)
// =============================================================================
if (document.getElementById('options-container')) {
    let savedBook = null;
    try {
        savedBook = localStorage.getItem('kjk_book');
    } catch (err) {
        // localStorage nem elérhető
    }

    if (savedBook) {
        try {
            bookChapters = JSON.parse(savedBook);
            generalKalandlap();
            loadChapter("1");
        } catch (err) {
            document.getElementById("description").textContent =
                "Hiba a könyv adatok beolvasásakor. Kérlek, töltsd be újra a fájlt!";
        }
    } else {
        document.getElementById("description").textContent =
            "Kérlek, tölts be egy könyv fájlt a bal felső sarokban!";
    }
}

// -----------------------------------------------------------------------------
// Fejezet betöltése
// -----------------------------------------------------------------------------
function loadChapter(chapterId) {
    const chapter = bookChapters[chapterId];
    if (!chapter) {
        const descEl = document.getElementById("description");
        if (descEl) descEl.textContent = "A(z) \"" + chapterId + "\" fejezet nem található a betöltött könyvben!";
        const container = document.getElementById("options-container");
        if (container) container.innerHTML = "";
        return;
    }

    const titleEl = document.getElementById("chapter-title");
    const descEl  = document.getElementById("description");
    if (titleEl) titleEl.textContent = chapterId + ". fejezet";
    if (descEl)  descEl.textContent  = chapter.text;

    // Csata panel elrejtése
    const fightBox = document.getElementById("fight");
    if (fightBox) fightBox.style.display = "none";

    // Gombok
    const container = document.getElementById("options-container");
    if (!container) return;
    container.innerHTML = "";

    if (chapter.options.length === 0) {
        // Nincs tovább – vége a kalandnak
        const endMsg = document.createElement("p");
        endMsg.style.cssText = "color:#fdbb2d;font-style:italic;text-align:center;margin-top:16px;";
        endMsg.textContent = "— Vége —";
        container.appendChild(endMsg);
        return;
    }

    chapter.options.forEach(option => {
        const button = document.createElement("button");
        button.className = "option-btn";
        button.textContent = option.text;

        button.addEventListener("click", function () {
            if (option.target.startsWith("fight_")) {
                // Formátum: fight_NévRészek_ügyesség_életerő_következőFejezet
                // A név tartalmazhat aláhúzást, ezért hátulról szedjük ki a számokat
                const raw = option.target.substring(6); // "fight_" után
                const parts = raw.split('_');
                if (parts.length < 3) {
                    alert("Hibás harc formátum: " + option.target);
                    return;
                }
                const nextChapter = parts[parts.length - 1];
                const stamina     = parseInt(parts[parts.length - 2]);
                const skill       = parseInt(parts[parts.length - 3]);
                const name        = parts.slice(0, parts.length - 3).join(' ');
                startBattle(name, skill, stamina, nextChapter);
            } else {
                loadChapter(option.target);
                // Mobilon görgetjük fel a könyvet
                const bookEl = document.getElementById("book");
                if (bookEl) bookEl.scrollTop = 0;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        container.appendChild(button);
    });
}

// -----------------------------------------------------------------------------
// Kalandlap generálása (kockadobás alapú)
// -----------------------------------------------------------------------------
function generalKalandlap() {
    const skill   = rollDice(1, 6) + 6;
    const stamina = rollDice(2, 6) + 12;
    const luck    = rollDice(1, 6) + 6;

    setStatDisplay("skill-val",   skill);
    setStatDisplay("stamina-val", stamina);
    setStatDisplay("luck-val",    luck);
}

function rollDice(count, sides) {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
}

function setStatDisplay(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getStatValue(id) {
    const el = document.getElementById(id);
    return el ? parseInt(el.textContent) || 0 : 0;
}

// -----------------------------------------------------------------------------
// Harc rendszer
// -----------------------------------------------------------------------------
function startBattle(name, skill, stamina, nextChapter) {
    currentEnemy = { name, skill, stamina, next: nextChapter };

    setStatDisplay("enemy-name",    name);
    setStatDisplay("enemy-skill",   skill);
    setStatDisplay("enemy-stamina", stamina);

    const battleLog = document.getElementById("battle-log");
    if (battleLog) battleLog.textContent = "⚔ Csata kezdődik! Dobj a kockával!";

    const fightBox = document.getElementById("fight");
    if (fightBox) {
        fightBox.style.display = "block";
        // Mobilon görgetünk a harc panelre
        setTimeout(() => {
            fightBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    // Gomb esemény – cloneNode-dal eltávolítjuk a régi listenert
    const diceBtn = document.getElementById("dice-btn");
    if (!diceBtn) return;
    const newDiceBtn = diceBtn.cloneNode(true);
    diceBtn.parentNode.replaceChild(newDiceBtn, diceBtn);

    newDiceBtn.addEventListener("click", function () {
        battleRound();
    });
}

function battleRound() {
    const battleLog = document.getElementById("battle-log");

    let playerSkill   = getStatValue("skill-val");
    let playerStamina = getStatValue("stamina-val");

    const pRoll      = rollDice(2, 6);
    const playerAtk  = playerSkill + pRoll;
    const eRoll      = rollDice(2, 6);
    const enemyAtk   = currentEnemy.skill + eRoll;

    let log = `Te dobál: ${pRoll} → Támadásod: ${playerAtk}  |  ${currentEnemy.name} dobott: ${eRoll} → Támadása: ${enemyAtk}\n`;

    if (playerAtk > enemyAtk) {
        currentEnemy.stamina -= 2;
        log += `✔ Megsebezted! (${currentEnemy.name} életereje: ${currentEnemy.stamina})`;
        setStatDisplay("enemy-stamina", currentEnemy.stamina);
    } else if (enemyAtk > playerAtk) {
        playerStamina -= 2;
        log += `✘ Megsebzett! (Életerőd: ${playerStamina})`;
        setStatDisplay("stamina-val", playerStamina);
    } else {
        log += `⚡ Döntetlen – senki sem sérül.`;
    }

    if (battleLog) battleLog.textContent = log;

    // Győzelem
    if (currentEnemy.stamina <= 0) {
        if (battleLog) battleLog.textContent += "\n\n🏆 GYŐZELEM! Továbblépés...";
        const diceBtn = document.getElementById("dice-btn");
        if (diceBtn) diceBtn.disabled = true;
        setTimeout(() => {
            if (diceBtn) diceBtn.disabled = false;
            loadChapter(currentEnemy.next);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 2500);
        return;
    }

    // Halál
    if (playerStamina <= 0) {
        if (battleLog) battleLog.textContent += "\n\n💀 MEGHALTÁL! A kaland véget ért.";
        const diceBtn = document.getElementById("dice-btn");
        if (diceBtn) diceBtn.disabled = true;
        setTimeout(() => {
            if (confirm("A játéknak vége. Újrakezded az elejéről?")) {
                generalKalandlap();
                loadChapter("1");
                const fightBox = document.getElementById("fight");
                if (fightBox) fightBox.style.display = "none";
                if (diceBtn) diceBtn.disabled = false;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 2000);
        return;
    }
}