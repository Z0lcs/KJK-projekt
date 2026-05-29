// Játék adatok
const storyData = {
    start: {
        text: "Egy sötét barlang bejáratánál állsz. Balra egy fényes alagút, jobbra egy bűzös csatorna.",
        choices: [
            { text: "Balra", next: "light_tunnel" },
            { text: "Jobbra", next: "sewer" }
        ]
    },
    light_tunnel: { text: "Egy kincsre bukkantál!", choices: [{ text: "Újra", next: "start" }] },
    sewer: { text: "Egy szörny támad rád!", choices: [{ text: "Harcolj", next: "fight" }] },
    game_over: { text: "Meghaltál...", choices: [{ text: "Újrakezdés", next: "start" }] }
};

let gameState = {
    hp: 10,
    inventory: [],
    currentScene: 'start'
};

// Játék motor
const gameEngine = {
    init() {
        this.loadGame();
        this.render();
        document.getElementById('save-btn').onclick = () => this.saveGame();
        document.getElementById('dice-btn').onclick = () => this.rollDice();
    },

    render() {
        const scene = storyData[gameState.currentScene];
        const sceneEl = document.getElementById('scene');
        sceneEl.classList.add('fade-in');
        
        document.getElementById('text').innerText = scene.text;
        const choicesEl = document.getElementById('choices');
        choicesEl.innerHTML = '';
        
        scene.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.innerText = choice.text;
            btn.onclick = () => { gameState.currentScene = choice.next; this.render(); };
            choicesEl.appendChild(btn);
        });
    },

    rollDice() {
        const result = Math.floor(Math.random() * 6) + 1;
        document.getElementById('dice-result').innerText = `Dobás: ${result}`;
    },

    saveGame() {
        localStorage.setItem('kjk_save', JSON.stringify(gameState));
        alert('Játék mentve!');
    },

    loadGame() {
        const saved = localStorage.getItem('kjk_save');
        if (saved) gameState = JSON.parse(saved);
    }
};

gameEngine.init();