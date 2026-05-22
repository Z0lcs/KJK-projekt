let bookChapters = {};
let currentEnemy = { name: "", skill: 0, stamina: 0, next: "1" };

// --- 1. RÉSZ: FÁJL BEOLVASÁSA (Ez fut a bekeres.html oldalon) ---
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
                alert("A kiválasztott fájl üres!");
                return;
            }

            let parsedBook = {};
            lines.forEach(line => {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const id = parts[0].trim();
                    const text = parts[1].trim();
                    const optionsRaw = parts[2] ? parts[2].trim() : "";
                    
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

            // Eltároljuk a böngésző belső memóriájába
            localStorage.setItem('kjk_book', JSON.stringify(parsedBook));
            document.getElementById("continue").style.display = "block";
        };
        reader.readAsText(file);
    });
}

// --- 2. RÉSZ: JÁTÉKMENET INDÍTÁSA (Ez fut az index.html oldalon) ---
if (document.getElementById('options-container')) {
    const savedBook = localStorage.getItem('kjk_book');
    if (savedBook) {
        bookChapters = JSON.parse(savedBook);
        generalKalandlap();
        loadChapter("1"); // Elindítja az 1. fejezetet a beolvasott konyv.txt-ből
    }
}

function loadChapter(chapterId) {
    const chapter = bookChapters[chapterId];
    if (!chapter) {
        alert("A(z) " + chapterId + ". fejezet nem található!");
        return;
    }

    document.getElementById("chapter-title").innerText = chapterId + ". fejezet";
    document.getElementById("description").innerText = chapter.text;
    document.getElementById("fight").style.display = "none";

    const container = document.getElementById("options-container");
    container.innerHTML = "";

    chapter.options.forEach(option => {
        const button = document.createElement("button");
        button.className = "option-btn";
        button.innerText = option.text;
        
        button.addEventListener("click", function() {
            if (option.target.startsWith("fight_")) {
                const params = option.target.split('_');
                startBattle(params[1], parseInt(params[2]), parseInt(params[3]), params[4]);
            } else {
                loadChapter(option.target);
            }
        });
        container.appendChild(button);
    });
}

function generalKalandlap() {
    const skill = Math.floor(Math.random() * 6) + 7;
    const stamina = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 14;
    const luck = Math.floor(Math.random() * 6) + 7;

    document.getElementById("skill-val").innerText = skill;
    document.getElementById("stamina-val").innerText = stamina;
    document.getElementById("luck-val").innerText = luck;
}

function startBattle(name, skill, stamina, nextChapter) {
    currentEnemy = { name: name, skill: skill, stamina: stamina, next: nextChapter };
    
    document.getElementById("enemy-name").innerText = name;
    document.getElementById("enemy-skill").innerText = skill;
    document.getElementById("enemy-stamina").innerText = stamina;
    
    const fightBox = document.getElementById("fight");
    fightBox.style.display = "block";
    fightBox.scrollIntoView({ behavior: 'smooth' });
    document.getElementById("battle-log").innerText = "Csata! Dobj a kockával.";

    const diceBtn = document.getElementById("dice-btn");
    const newDiceBtn = diceBtn.cloneNode(true);
    diceBtn.parentNode.replaceChild(newDiceBtn, diceBtn);

    newDiceBtn.addEventListener("click", function() {
        let playerSkill = parseInt(document.getElementById("skill-val").innerText);
        let playerStamina = parseInt(document.getElementById("stamina-val").innerText);

        let pDice1 = Math.floor(Math.random() * 6) + 1;
        let pDice2 = Math.floor(Math.random() * 6) + 1;
        let playerAttack = playerSkill + pDice1 + pDice2;

        let eDice1 = Math.floor(Math.random() * 6) + 1;
        let eDice2 = Math.floor(Math.random() * 6) + 1;
        let enemyAttack = currentEnemy.skill + eDice1 + eDice2;

        let log = `Te: ${playerAttack} VS ${currentEnemy.name}: ${enemyAttack}. `;

        if (playerAttack > enemyAttack) {
            currentEnemy.stamina -= 2;
            log += `Megsebezted! (${currentEnemy.name}: ${currentEnemy.stamina})`;
            document.getElementById("enemy-stamina").innerText = currentEnemy.stamina;
        } else if (enemyAttack > playerAttack) {
            playerStamina -= 2;
            log += `Megsebzett! (Életerőd: ${playerStamina})`;
            document.getElementById("stamina-val").innerText = playerStamina;
        } else {
            log += "Döntetlen!";
        }

        if (currentEnemy.stamina <= 0) {
            log += " NYERTÉL! Továbbhaladás...";
            document.getElementById("battle-log").innerText = log;
            setTimeout(() => { loadChapter(currentEnemy.next); }, 2500);
            return;
        }

        if (playerStamina <= 0) {
            log += " MEGHALTÁL!";
            document.getElementById("battle-log").innerText = log;
            alert("A játéknak vége.");
            return;
        }

        document.getElementById("battle-log").innerText = log;
    });
}