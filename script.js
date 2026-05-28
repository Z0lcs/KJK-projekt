// ============================================================
//  KJK PROJECT – script.js
//  Funkciócsoportok:
//   1. Globális állapot
//   2. Fájl beolvasása (bekeres.html)
//   3. Játékmenet – fejezet betöltése (index.html)
//   4. Kalandlap (stat generálás, stat frissítés)
//   5. Leltárrendszer (add / remove / use)
//   6. Harci rendszer (2 kocka, menekülés)
//   7. Szerencse-próba
// ============================================================


// ============================================================
// 1. GLOBÁLIS ÁLLAPOT
// ============================================================

let bookChapters = {};   

let currentEnemy = {
    name:        "",
    skill:       0,
    stamina:     0,
    maxStamina:  0,   
    next:        "1",
    escape:      null // Menekülési fejezet azonosítója (vagy null)
};

let maxStats = { skill: 12, stamina: 24, luck: 12 };

/**
 * 9 leltárslot tömbje.
 * Minden elem: null (üres) VAGY { name, statType, statValue }
 */
let inventoryItems = new Array(9).fill(null);


// ============================================================
// 2. SEGÉDFÜGGVÉNYEK
// ============================================================

/** Dob `count` db `sides` lapú kockával, visszaadja az összeget. */
function rollDice(count, sides) {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
}

/** Visszaadja egy elem szöveges tartalmát számként. */
function getStatValue(id) {
    const el = document.getElementById(id);
    return el ? (parseInt(el.textContent) || 0) : 0;
}

/** Egyszerű szöveg-beállítás egy elem ID alapján (nem-stat mezőkhöz). */
function setStatDisplay(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/**
 * A három fő stat egységes frissítése és MENTÉSE
 */
function updateStat(statName, value) {
    const max     = maxStats[statName] || 1;
    const clamped = Math.max(0, Math.min(value, max));

    const valEl = document.getElementById(`${statName}-val`);
    if (valEl) valEl.textContent = clamped;

    const bar = document.getElementById(`${statName}-bar`);
    if (bar) bar.style.width = `${(clamped / max) * 100}%`;

    // Harci panel szinkron
    if (statName === "stamina") {
        setStatDisplay("fight-player-stamina", clamped);
        updatePlayerHpBar(clamped);
    }

    // Mentés, hogy ne vesszen el aloldal váltáskor
    saveCharacterState(clamped, statName);

    return clamped;
}

/** Karakter aktuális állapotának mentése */
function saveCharacterState(currentValue, statName) {
    try {
        let charState = JSON.parse(localStorage.getItem('kjk_character') || '{}');
        if(!charState.stats) charState.stats = {};
        charState.stats[statName] = currentValue;
        charState.maxStats = maxStats;
        localStorage.setItem('kjk_character', JSON.stringify(charState));
    } catch (_) {}
}

/** Állítja a játékos harci HP-sávját. */
function updatePlayerHpBar(currentStamina) {
    const bar = document.getElementById("player-hp-bar");
    if (bar) bar.style.width = `${Math.max(0, (currentStamina / maxStats.stamina) * 100)}%`;
}

/** Állítja az ellenség harci HP-sávját. */
function updateEnemyHpBar() {
    const bar = document.getElementById("enemy-hp-bar");
    if (bar && currentEnemy.maxStamina > 0) {
        bar.style.width = `${Math.max(0, (currentEnemy.stamina / currentEnemy.maxStamina) * 100)}%`;
    }
}

/** Mutat egy felugró értesítő "toast" üzenetet. */
function showToast(msg) {
    const toast = document.getElementById("item-toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/** Stat neve magyarul (toast üzenetekhez). */
function statLabel(statType) {
    return ({ skill: 'Ügyesség', stamina: 'Életerő', luck: 'Szerencse' })[statType] || statType;
}


// ============================================================
// 3. FÁJL BEOLVASÁSA  (bekeres.html)
// ============================================================

const fileButton = document.getElementById('fileButton');
if (fileButton) {
    fileButton.addEventListener('change', function (event) {
        const files = event.target.files;
        if (files.length === 0) return;

        const file   = files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const lines = e.target.result
                .split('\n')
                .map(l => l.trim())
                .filter(l => l !== '');

            const statusEl   = document.getElementById("file-status");
            const continueEl = document.getElementById("continue");

            if (lines.length === 0) {
                if (statusEl)   statusEl.textContent  = "⚠ A kiválasztott fájl üres!";
                if (continueEl) continueEl.style.display = "none";
                return;
            }

            let parsedBook  = {};
            let parseErrors = 0;

            lines.forEach(line => {
                const parts = line.split('|');
                if (parts.length < 2) { parseErrors++; return; }

                const id         = parts[0].trim();
                const text       = parts[1].trim();
                const optionsRaw = parts[2] ? parts[2].trim() : "";
                const itemRaw    = parts[3] ? parts[3].trim() : "";

                let options = [];
                if (optionsRaw) {
                    optionsRaw.split(',').forEach(opt => {
                        opt = opt.trim();
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

                let itemAction = null;
                if (itemRaw.startsWith("add_item:")) {
                    const iparts = itemRaw.substring(9).split(':');
                    itemAction = {
                        type:      'add',
                        name:      iparts[0] ? iparts[0].trim() : "Tárgy",
                        statType:  iparts[1] ? iparts[1].trim() : null,
                        statValue: iparts[2] ? parseInt(iparts[2].trim()) : 0
                    };
                } else if (itemRaw.startsWith("remove_item:")) {
                    itemAction = {
                        type: 'remove',
                        name: itemRaw.substring(12).trim()
                    };
                }

                if (id) {
                    parsedBook[id] = { text, options, itemAction };
                }
            });

            const chapterCount = Object.keys(parsedBook).length;

            if (chapterCount === 0) {
                if (statusEl)   statusEl.textContent     = "⚠ Nem sikerült fejezeteket beolvasni. Ellenőrizd a formátumot!";
                if (continueEl) continueEl.style.display = "none";
                return;
            }

            try {
                localStorage.setItem('kjk_book', JSON.stringify(parsedBook));
                if (statusEl)   statusEl.textContent     = `✓ ${chapterCount} fejezet betöltve: ${file.name}` + (parseErrors ? ` (${parseErrors} sor hibás)` : "");
                if (continueEl) continueEl.style.display = "inline-block";
            } catch (err) {
                if (statusEl)   statusEl.textContent     = "⚠ Nem sikerült menteni a böngésző memóriájába. Próbálj normál módban!";
                if (continueEl) continueEl.style.display = "none";
            }
        };

        reader.onerror = () => {
            const statusEl = document.getElementById("file-status");
            if (statusEl) statusEl.textContent = "⚠ Hiba a fájl olvasásakor!";
        };

        reader.readAsText(file, 'UTF-8');
    });
}

// ============================================================
// ÚJ: JÁTÉK RESETELÉSE (Minden mentés törlése a bekeres.html-en)
// ============================================================
const resetBtn = document.getElementById('resetGameButton');
if (resetBtn) {
    resetBtn.addEventListener('click', function () {
        if (confirm("Biztosan törölni szeretnél minden mentést? (A betöltött könyv, a karaktered és az aktuális fejezeted is elveszik!)")) {
            try {
                // Kitöröljük a KJK-s kulcsokat a böngésző memóriájából
                localStorage.removeItem('kjk_book');
                localStorage.removeItem('kjk_character');
                localStorage.removeItem('kjk_current_chapter');

                // Visszajelzést adunk a felhasználónak
                const statusEl = document.getElementById("file-status");
                if (statusEl) {
                    statusEl.textContent = "🗑 Minden játékmentés és betöltött könyv sikeresen törölve!";
                    statusEl.style.color = "#c0362a"; // Átváltunk pirosas/narancsos színre a törlés miatt
                }

                // Elrejtjük a "Tovább a kalandra" gombot, hiszen nincs aktív könyv
                const continueEl = document.getElementById("continue");
                if (continueEl) {
                    continueEl.style.display = "none";
                }

                // Egy kis plusz animáció a gombon a siker jelzésére
                resetBtn.innerHTML = `<i class="fa-solid fa-check"></i> Sikeresen törölve!`;
                resetBtn.style.borderColor = "var(--accent-red)";
                resetBtn.disabled = true;

                setTimeout(() => {
                    resetBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Játék resetelése`;
                    resetBtn.style.borderColor = "";
                    resetBtn.disabled = false;
                }, 2000);

            } catch (err) {
                alert("Hiba történt a törlés során!");
            }
        }
    });
}

// ============================================================
// 4. JÁTÉKMENET – INIT  (index.html)
// ============================================================

if (document.getElementById('options-container')) {
    let savedBook = null;
    try { savedBook = localStorage.getItem('kjk_book'); } catch (_) {}

    if (savedBook) {
        try {
            bookChapters = JSON.parse(savedBook);
            
            // Okos betöltés: ha van már mentett karakter, azt töltjük be, nem generálunk újat!
            let savedChar = null;
            try { savedChar = localStorage.getItem('kjk_character'); } catch(_) {}
            
            if (savedChar) {
                const charData = JSON.parse(savedChar);
                maxStats = charData.maxStats;
                inventoryItems = charData.inventory || new Array(9).fill(null);
                
                // UI frissítése a mentett értékekkel
                updateStat("skill", charData.stats.skill);
                updateStat("stamina", charData.stats.stamina);
                updateStat("luck", charData.stats.luck);
                
                const staminaMaxEl = document.getElementById("stamina-max");
                if (staminaMaxEl) staminaMaxEl.textContent = `/ ${maxStats.stamina}`;
                renderInventory();
            } else {
                // Ha még nincs karakter, most generálunk először
                generalKalandlap();
            }

            // Aktuális fejezet betöltése (alapból az 1-es, vagy ahol tartott)
            let currentChapter = localStorage.getItem('kjk_current_chapter') || "1";
            loadChapter(currentChapter);

        } catch (err) {
            document.getElementById("description").textContent =
                "Hiba a könyv adatok beolvasásakor. Kérlek, töltsd be újra a fájlt!";
        }
    } else {
        document.getElementById("description").textContent =
            "Kérlek, tölts be egy könyv fájlt a bal felső sarokban!";
    }
}


// ============================================================
// 5. KALANDLAP  – stat generálás és megjelenítés
// ============================================================

function generalKalandlap() {
    const skill   = rollDice(1, 6) + 6;   // 7–12
    const stamina = rollDice(2, 6) + 12;  // 14–24
    const luck    = rollDice(1, 6) + 6;   // 7–12

    maxStats = { skill, stamina, luck };

    // Leltár nullázása
    inventoryItems = new Array(9).fill(null);
    
    // Kezdeti mentés objektum strukturálása
    try {
        const charState = {
            stats: { skill, stamina, luck },
            maxStats: maxStats,
            inventory: inventoryItems
        };
        localStorage.setItem('kjk_character', JSON.stringify(charState));
    } catch(_) {}

    updateStat("skill",   skill);
    updateStat("stamina", stamina);
    updateStat("luck",    luck);

    const staminaMaxEl = document.getElementById("stamina-max");
    if (staminaMaxEl) staminaMaxEl.textContent = `/ ${stamina}`;

    renderInventory();
}


// ============================================================
// 6. FEJEZET BETÖLTÉSE
// ============================================================

function loadChapter(chapterId) {
    const chapter = bookChapters[chapterId];
    if (!chapter) {
        const descEl = document.getElementById("description");
        if (descEl) descEl.textContent = `A(z) "${chapterId}" fejezet nem található a betöltött könyvben!`;
        const container = document.getElementById("options-container");
        if (container) container.innerHTML = "";
        return;
    }

    // Elmentjük, épp melyik fejezetben jár a játékos
    try { localStorage.setItem('kjk_current_chapter', chapterId); } catch(_) {}

    const titleEl = document.getElementById("chapter-title");
    const descEl  = document.getElementById("description");
    if (titleEl) titleEl.textContent = `${chapterId}. fejezet`;
    if (descEl)  descEl.textContent  = chapter.text;

    const fightBox = document.getElementById("fight");
    if (fightBox) fightBox.style.display = "none";

    if (chapter.itemAction) {
        const ia = chapter.itemAction;
        if (ia.type === 'add') {
            addItem(ia.name, ia.statType, ia.statValue);
        } else if (ia.type === 'remove') {
            removeItem(ia.name);
        }
    }

    const container = document.getElementById("options-container");
    if (!container) return;
    container.innerHTML = "";

    if (!chapter.options || chapter.options.length === 0) {
        const endMsg = document.createElement("p");
        endMsg.style.cssText = "color:#fdbb2d;font-style:italic;text-align:center;margin-top:16px;";
        endMsg.textContent = "— Vége —";
        container.appendChild(endMsg);
        return;
    }

    chapter.options.forEach(option => {
        const button = document.createElement("button");
        button.className = "option-btn";

        if (option.target.startsWith("luck_test:")) {
            const ltParts        = option.target.substring(10).split(':');
            const successChapter = ltParts[0];
            const failChapter    = ltParts[1];

            button.classList.add("luck-btn");
            button.innerHTML = `<i class="fa-solid fa-clover"></i> ${option.text} <em class="luck-hint">(Szerencse-próba)</em>`;

            button.addEventListener("click", function () {
                button.disabled = true;
                runLuckTest(successChapter, failChapter);
            });

        } else if (option.target.startsWith("fight_")) {
            const raw   = option.target.substring(6);
            const parts = raw.split('_');

            if (parts.length < 4) {
                button.textContent = option.text + " (⚠ hibás harc-formátum)";
                button.disabled = true;
                container.appendChild(button);
                return;
            }

            let nextChapter, escapeChapter = null, stamina, skill, name;

            if (parts.length >= 5) {
                escapeChapter = parts[parts.length - 1];
                nextChapter   = parts[parts.length - 2];
                stamina       = parseInt(parts[parts.length - 3]);
                skill         = parseInt(parts[parts.length - 4]);
                name          = parts.slice(0, parts.length - 4).join(' ');
            } else {
                nextChapter = parts[parts.length - 1];
                stamina     = parseInt(parts[parts.length - 2]);
                skill       = parseInt(parts[parts.length - 3]);
                name        = parts.slice(0, parts.length - 3).join(' ');
            }

            button.textContent = option.text;
            button.addEventListener("click", function () {
                startBattle(name, skill, stamina, nextChapter, escapeChapter);
            });

        } else {
            button.textContent = option.text;
            button.addEventListener("click", function () {
                loadChapter(option.target);
                const bookEl = document.getElementById("book");
                if (bookEl) bookEl.scrollTop = 0;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        container.appendChild(button);
    });
}


// ============================================================
// 7. LELTÁRRENDSZER
// ============================================================

function saveInventory() {
    try {
        let charState = JSON.parse(localStorage.getItem('kjk_character') || '{}');
        charState.inventory = inventoryItems;
        localStorage.setItem('kjk_character', JSON.stringify(charState));
    } catch(_) {}
}

function addItem(name, statType, statValue) {
    const emptySlot = inventoryItems.findIndex(i => i === null);
    if (emptySlot === -1) {
        showToast(`⚠ A hátizsák tele! (${name} nem fért be)`);
        return;
    }
    inventoryItems[emptySlot] = {
        name,
        statType:  statType  || null,
        statValue: statValue || 0
    };
    saveInventory();
    renderInventory();
    showToast(`📦 Felvéve: ${name}`);
}

function removeItem(name) {
    const idx = inventoryItems.findIndex(i => i && i.name === name);
    if (idx === -1) return;
    inventoryItems[idx] = null;
    saveInventory();
    renderInventory();
    showToast(`🗑 Elveszítve: ${name}`);
}

function useItem(slotIdx) {
    const item = inventoryItems[slotIdx];
    if (!item) return;

    if (item.statType && item.statValue !== 0) {
        const curVal = getStatValue(`${item.statType}-val`);
        const newVal = updateStat(item.statType, curVal + item.statValue);
        const sign   = item.statValue > 0 ? '+' : '';
        showToast(`✨ ${item.name} elfogyasztva!  ${sign}${item.statValue} ${statLabel(item.statType)}  (${statLabel(item.statType)}: ${newVal})`);
        inventoryItems[slotIdx] = null;
        saveInventory();
        renderInventory();
    } else {
        showToast(`🔍 ${item.name} — kulcstárgy, nem fogyasztható.`);
    }
}

function renderInventory() {
    for (let i = 0; i < 9; i++) {
        const slot = document.getElementById(`slot-${i}`);
        if (!slot) continue;

        const item = inventoryItems[i];

        if (item) {
            slot.className = 'item-slot has-item';
            slot.innerHTML = '';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.textContent = item.name;
            slot.appendChild(nameSpan);

            if (item.statType && item.statValue) {
                const badge = document.createElement('span');
                badge.className = `item-stat-badge badge-${item.statType}`;
                badge.textContent = (item.statValue > 0 ? '+' : '') + item.statValue;
                slot.appendChild(badge);
                slot.title = `Kattints a használathoz (${sign(item.statValue)}${item.statValue} ${statLabel(item.statType)})`;
            } else {
                slot.title = `${item.name} — kulcstárgy`;
            }

            slot.onclick = () => useItem(i);

            void slot.offsetWidth;
            slot.classList.add('item-added');
            setTimeout(() => slot.classList.remove('item-added'), 400);

        } else {
            slot.className = 'item-slot empty';
            slot.innerHTML = '';
            slot.onclick   = null;
            slot.title     = '';
        }
    }
}

function sign(n) { return n > 0 ? '+' : ''; }


// ============================================================
// 8. SZERENCSE-PRÓBA  (Luck test)
// ============================================================

function runLuckTest(successChapter, failChapter) {
    const roll     = rollDice(2, 6);
    const curLuck  = getStatValue("luck-val");
    const newLuck  = updateStat("luck", curLuck - 1);
    const success  = roll <= curLuck;

    if (success) {
        showToast(`🍀 Szerencse-próba SIKERES! (${roll} ≤ ${curLuck})  –  Szerencse: ${newLuck}`);
        setTimeout(() => {
            loadChapter(successChapter);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1600);
    } else {
        showToast(`💔 Szerencse-próba SIKERTELEN! (${roll} > ${curLuck})  –  Szerencse: ${newLuck}`);
        setTimeout(() => {
            loadChapter(failChapter);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1600);
    }
}


// ============================================================
// 9. HARCI RENDSZER
// ============================================================

function startBattle(name, skill, stamina, nextChapter, escapeChapter) {
    currentEnemy = {
        name,
        skill,
        stamina,
        maxStamina:  stamina,
        next:        nextChapter,
        escape:      escapeChapter || null
    };

    setStatDisplay("enemy-name",    name);
    setStatDisplay("enemy-stamina", stamina);
    updateEnemyHpBar();

    const playerStamina = getStatValue("stamina-val");
    setStatDisplay("fight-player-stamina", playerStamina);
    updatePlayerHpBar(playerStamina);

    resetDice();
    setStatDisplay("player-dice-result", "—");
    setStatDisplay("enemy-dice-result",  "—");

    const battleLog = document.getElementById("battle-log");
    if (battleLog) battleLog.textContent = "⚔ Csata kezdődik! Dobj a kockával!";

    const fightBox = document.getElementById("fight");
    if (fightBox) {
        fightBox.style.display = "block";
        setTimeout(() => fightBox.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }

    const escapeBtn = document.getElementById("escape-btn");
    if (escapeBtn) {
        if (escapeChapter) {
            escapeBtn.style.display = "inline-flex";
            const newEscapeBtn = escapeBtn.cloneNode(true);
            escapeBtn.parentNode.replaceChild(newEscapeBtn, escapeBtn);
            newEscapeBtn.addEventListener("click", function () {
                handleEscape(escapeChapter);
            });
        } else {
            escapeBtn.style.display = "none";
        }
    }

    const diceBtn = document.getElementById("dice-btn");
    if (!diceBtn) return;
    const newDiceBtn = diceBtn.cloneNode(true);
    diceBtn.parentNode.replaceChild(newDiceBtn, diceBtn);
    newDiceBtn.addEventListener("click", function () {
        newDiceBtn.disabled = true;
        battleRound(() => { newDiceBtn.disabled = false; });
    });
}

function handleEscape(escapeChapter) {
    const curStamina = getStatValue("stamina-val");
    const newStamina = updateStat("stamina", curStamina - 2);

    showToast(`💨 Menekülésnél 2 Életerőt veszítesz! (Maradt: ${newStamina})`);

    if (newStamina <= 0) {
        const battleLog = document.getElementById("battle-log");
        if (battleLog) battleLog.textContent = "💀 Belehaltál a menekülésbe...";
        setTimeout(() => handlePlayerDeath(), 2000);
    } else {
        const fightBox = document.getElementById("fight");
        if (fightBox) fightBox.style.display = "none";
        setTimeout(() => {
            loadChapter(escapeChapter);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1200);
    }
}

function battleRound(onRoundComplete) {
    const battleLog = document.getElementById("battle-log");

    const pRoll1 = rollDice(1, 6);
    const pRoll2 = rollDice(1, 6);
    const pRoll  = pRoll1 + pRoll2;
    const eRoll  = rollDice(2, 6);

    if (battleLog) battleLog.textContent = "🎲 A kockák pörögnek...";

    animateDice(pRoll1, pRoll2, () => {
        const playerSkill   = getStatValue("skill-val");
        const playerStamina = getStatValue("stamina-val");

        const playerAtk = playerSkill + pRoll;
        const enemyAtk  = currentEnemy.skill + eRoll;

        setStatDisplay("player-dice-result", `${pRoll1}+${pRoll2}=${pRoll} (Ü:${playerSkill})`);
        setStatDisplay("enemy-dice-result",  `${eRoll} (Ü:${currentEnemy.skill})`);

        let log = `🎲 Te: ${pRoll1} + ${pRoll2} = ${pRoll}  →  Támadás: ${playerAtk}\n🎲 ${currentEnemy.name}: ${eRoll}  →  Támadás: ${enemyAtk}\n`;

        if (playerAtk > enemyAtk) {
            currentEnemy.stamina = Math.max(0, currentEnemy.stamina - 2);
            setStatDisplay("enemy-stamina", currentEnemy.stamina);
            updateEnemyHpBar();
            log += `✔ Megsebezted! (${currentEnemy.name} ÉP: ${currentEnemy.stamina})`;

        } else if (enemyAtk > playerAtk) {
            const newStamina = updateStat("stamina", playerStamina - 2);
            log += `✘ Megsebzett! (Életerőd: ${newStamina})`;

        } else {
            log += `⚡ Döntetlen – senki sem sérül.`;
        }

        if (battleLog) battleLog.textContent = log;

        if (currentEnemy.stamina <= 0) {
            if (battleLog) battleLog.textContent += "\n\n🏆 GYŐZELEM! Továbblépés...";
            setTimeout(() => {
                loadChapter(currentEnemy.next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 2500);
            return;
        }

        if (getStatValue("stamina-val") <= 0) {
            if (battleLog) battleLog.textContent += "\n\n💀 MEGHALTÁL! A kaland véget ért.";
            setTimeout(() => handlePlayerDeath(), 2000);
            return;
        }

        if (onRoundComplete) onRoundComplete();
    });
}

function handlePlayerDeath() {
    if (confirm("A játéknak vége. Újrakezded az elejéről?")) {
        try {
            localStorage.removeItem('kjk_character');
            localStorage.removeItem('kjk_current_chapter');
        } catch(_) {}
        generalKalandlap();
        loadChapter("1");
        const fightBox = document.getElementById("fight");
        if (fightBox) fightBox.style.display = "none";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}


// ============================================================
// 10. 3D KOCKA ANIMÁCIÓ (két kocka)
// ============================================================

function resetDice() {
    ['dice-cube-1', 'dice-cube-2'].forEach(id => {
        const cube = document.getElementById(id);
        if (!cube) return;
        cube.className = '';
        void cube.offsetWidth;
        cube.classList.add('face-1');
    });
}

function animateDice(val1, val2, callback) {
    const cube1 = document.getElementById('dice-cube-1');
    const cube2 = document.getElementById('dice-cube-2');

    if (cube1) {
        cube1.className = '';
        void cube1.offsetWidth;
        cube1.classList.add('rolling');
    }

    setTimeout(() => {
        if (cube2) {
            cube2.className = '';
            void cube2.offsetWidth;
            cube2.classList.add('rolling');
        }
    }, 120);

    // Animáció lefutása után végső lapok beállítása
    setTimeout(() => {
        if (cube1) {
            cube1.classList.remove('rolling');
            cube1.classList.add(`face-${val1}`);
        }
        if (cube2) {
            cube2.classList.remove('rolling');
            cube2.classList.add(`face-${val2}`);
        }
        callback();
    }, 950);
}