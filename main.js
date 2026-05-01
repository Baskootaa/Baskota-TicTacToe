// 1. تعريف المتغيرات الأساسية والأصوات
let board = ["", "", "", "", "", "", "", "", ""];
let gameActive = true;
let currentPlayer = "X";
let gameMode = 'cpu'; 
let difficulty = 'easy'; 

// استخدام الملفات المحلية بامتداد .wav حسب صورتك
const clickSound = new Audio('sounds/click.wav');
const winSound = new Audio('sounds/win.wav');
const lossSound = new Audio('sounds/lose.wav');

// إعدادات التحميل
[clickSound, winSound, lossSound].forEach(s => {
    s.preload = 'auto';
    s.load(); 
});

const playSound = (sound) => {
    sound.currentTime = 0;
    let playPromise = sound.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => console.error("خطأ في تشغيل الصوت:", error.message));
    }
};

// 2. تحميل البيانات من الـ localStorage
let scores = JSON.parse(localStorage.getItem('baskota_scores')) || { p: 0, f: 0, ai: 0, d: 0, t: 0 };
let matchHistory = JSON.parse(localStorage.getItem('baskota_history')) || [];
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// --- وظيفة إظهار نتيجة اللعبة بشكل كبير (Overlay) ---
function showGameResult(resultText, type) {
    // إنشاء العنصر لو مش موجود
    let overlay = document.getElementById('game-result-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'game-result-overlay';
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; flex-direction: column;
            justify-content: center; align-items: center; z-index: 9999;
            transition: all 0.5s ease; cursor: pointer;
        `;
        overlay.onclick = () => { overlay.style.display = 'none'; resetGame(); };
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <h1 style="color: white; font-size: 80px; margin: 0; text-shadow: 0 0 20px ${type === 'win' ? '#2ecc71' : '#e74c3c'}; font-family: sans-serif; font-weight: bold;">
            ${resultText}
        </h1>
        <p style="color: #ccc; margin-top: 20px;">اضغط في أي مكان للاستمرار</p>
    `;
    overlay.style.display = 'flex';
}

// --- وظائف التنقل والواجهة ---
function showSection(id) {
    document.querySelectorAll('.page-section').forEach(s => { s.style.display = 'none'; });
    const targetSection = document.getElementById(id);
    if (targetSection) {
        targetSection.style.display = 'flex';
        targetSection.style.flexDirection = 'column';
        targetSection.style.alignItems = 'center';
    }
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(btn => 
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(id)
    );
    if (activeBtn) activeBtn.classList.add('active');
}

function setMode(mode) {
    gameMode = mode;
    if(document.getElementById('vs-cpu')) document.getElementById('vs-cpu').classList.toggle('active', mode === 'cpu');
    if(document.getElementById('vs-friend')) document.getElementById('vs-friend').classList.toggle('active', mode === 'friend');
    if (document.getElementById('opponent-display')) document.getElementById('opponent-display').innerText = mode === 'cpu' ? "الكمبيوتر (O)" : "الصديق (O)";
    if (document.getElementById('difficulty-settings')) document.getElementById('difficulty-settings').style.display = mode === 'cpu' ? 'flex' : 'none';
    resetGame();
}

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    if (document.getElementById(`diff-${level}`)) document.getElementById(`diff-${level}`).classList.add('active');
    resetGame();
}

// 3. منطق اللعبة
document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
        const idx = e.target.dataset.index;
        if (board[idx] !== "" || !gameActive) return;
        playSound(clickSound); 
        makeMove(idx, currentPlayer);
        if (gameActive) {
            if (gameMode === 'cpu') {
                currentPlayer = "O";
                gameActive = false; 
                setTimeout(aiMove, 600);
            } else {
                currentPlayer = currentPlayer === "X" ? "O" : "X";
            }
        }
    });
});

function makeMove(idx, p) {
    board[idx] = p;
    const cell = document.querySelector(`[data-index='${idx}']`);
    if (cell) {
        cell.innerText = p;
        cell.classList.add(p === 'X' ? 'x-color' : 'o-color');
    }
    if (checkWinner(board, p)) {
        highlightWin(board, p);
        endGame(p);
    } else if (!board.includes("")) {
        endGame('draw');
    }
}

function aiMove() {
    let move;
    const emptyIndices = board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
    if (emptyIndices.length === 0) return;
    if (difficulty === 'easy') move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    else if (difficulty === 'medium') move = smartMove() ?? emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    else move = minimax(board, "O").index;

    gameActive = true; 
    playSound(clickSound); 
    makeMove(move, "O");
    if (gameActive) currentPlayer = "X";
}

function smartMove() {
    const winConditions = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    for (let combo of winConditions) {
        let values = combo.map(i => board[i]);
        if (values.filter(v => v === "O").length === 2 && values.filter(v => v === "").length === 1) return combo[values.indexOf("")];
    }
    for (let combo of winConditions) {
        let values = combo.map(i => board[i]);
        if (values.filter(v => v === "X").length === 2 && values.filter(v => v === "").length === 1) return combo[values.indexOf("")];
    }
    return null;
}

function minimax(newBoard, player) {
    let availSpots = newBoard.map((v, i) => v === "" ? i : null).filter(v => v !== null);
    if (checkWinner(newBoard, "X")) return { score: -10 };
    if (checkWinner(newBoard, "O")) return { score: 10 };
    if (availSpots.length === 0) return { score: 0 };
    let moves = [];
    for (let i = 0; i < availSpots.length; i++) {
        let move = {}; move.index = availSpots[i]; newBoard[availSpots[i]] = player;
        move.score = (player === "O") ? minimax(newBoard, "X").score : minimax(newBoard, "O").score;
        newBoard[availSpots[i]] = ""; moves.push(move);
    }
    let bestMove;
    if (player === "O") {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) { if (moves[i].score > bestScore) { bestScore = moves[i].score; bestMove = i; } }
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) { if (moves[i].score < bestScore) { bestScore = moves[i].score; bestMove = i; } }
    }
    return moves[bestMove];
}

function checkWinner(b, p) {
    const wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    return wins.some(combo => combo.every(i => b[i] === p));
}

function highlightWin(b, p) {
    const wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    const combo = wins.find(combo => combo.every(i => b[i] === p));
    if (combo) {
        combo.forEach(i => {
            const cell = document.querySelector(`[data-index='${i}']`);
            if(cell) cell.classList.add('win');
        });
    }
}

// 4. نهاية اللعبة ومعالجة النتائج
function endGame(res) {
    gameActive = false;
    scores.t++;
    let status = "";

    if (res === 'X') {
        scores.p++;
        status = "فوز";
        playSound(winSound); 
        launchConfetti(); 
        showGameResult("YOU WIN!", "win");
    } else if (res === 'O') {
        status = "خسارة";
        playSound(lossSound); 
        if (gameMode === 'cpu') scores.ai++; else scores.f++;
        showGameResult("GAME OVER", "lose");
    } else {
        status = "تعادل";
        playSound(lossSound); // تشغيل صوت الخسارة في التعادل حسب طلبك
        scores.d++;
        showGameResult("DRAW", "lose");
    }

    addMatchToHistory(status, gameMode, difficulty);
    localStorage.setItem('baskota_scores', JSON.stringify(scores));
    updateUI();
}

function addMatchToHistory(status, mode, diff) {
    const match = {
        status: status,
        mode: mode === 'cpu' ? `كمبيوتر (${translateDiff(diff)})` : "صديق",
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('ar-EG')
    };
    matchHistory.unshift(match);
    if (matchHistory.length > 5) matchHistory.pop();
    localStorage.setItem('baskota_history', JSON.stringify(matchHistory));
    renderHistory();
}

function translateDiff(d) {
    if (d === 'easy') return 'سهل';
    if (d === 'medium') return 'متوسط';
    return 'مستحيل';
}

function renderHistory() {
    const container = document.getElementById('match-history');
    if (!container || matchHistory.length === 0) return;
    container.innerHTML = matchHistory.map(match => `
        <div class="history-item ${match.status === 'فوز' ? 'win' : match.status === 'خسارة' ? 'loss' : 'draw'}">
            <div class="match-info-main">
                <span class="match-info-text">${match.status} ضد ${match.mode}</span>
                <br>
                <span class="match-date-text">${match.time} | ${match.date}</span>
            </div>
        </div>
    `).join('');
}

function launchConfetti() {
    if (typeof confetti === 'undefined') return;
    var duration = 3 * 1000;
    var end = Date.now() + duration;
    (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#3498db', '#ffffff'] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#3498db', '#ffffff'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

function updateUI() {
    const idsMap = { 'p-score': 'p', 'f-score': 'f', 'ai-score': 'ai', 'draws': 'd', 'total': 't' };
    Object.keys(idsMap).forEach(id => {
        let el = document.getElementById(id);
        if (el) el.innerText = scores[idsMap[id]];
    });
    let rate = scores.t > 0 ? Math.round((scores.p / scores.t) * 100) : 0;
    if (document.getElementById('win-rate')) document.getElementById('win-rate').innerText = rate + "%";
}

function resetGame() {
    board = ["", "", "", "", "", "", "", "", ""];
    gameActive = true;
    currentPlayer = "X";
    document.querySelectorAll('.cell').forEach(c => { 
        c.innerText = ""; 
        c.classList.remove('win', 'x-color', 'o-color'); 
    });
}

function resetAllStats() {
    if (confirm("يا مازن، هل أنت متأكد؟")) {
        scores = { p: 0, f: 0, ai: 0, d: 0, t: 0 };
        matchHistory = [];
        localStorage.removeItem('baskota_scores');
        localStorage.removeItem('baskota_history');
        updateUI(); renderHistory(); resetGame();
    }
}

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const updateIcon = (theme) => { if (themeIcon) themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun'; };
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateIcon(currentTheme);
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme); updateIcon(theme);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme(); updateUI(); renderHistory(); showSection('dashboard');
    const menuToggle = document.getElementById('mobile-menu') || document.querySelector('.menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); });
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) sidebar.classList.remove('open');
        });
    }
});
