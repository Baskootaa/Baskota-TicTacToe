// 1. تعريف المتغيرات الأساسية
let board = ["", "", "", "", "", "", "", "", ""];
let gameActive = true;
let currentPlayer = "X";
let gameMode = 'cpu'; // 'cpu' or 'friend'
let difficulty = 'easy'; // 'easy', 'medium', 'hard'

// 2. تحميل البيانات من الـ localStorage (النقاط، الثيم، والسجل)
let scores = JSON.parse(localStorage.getItem('baskota_scores')) || { p: 0, f: 0, ai: 0, d: 0, t: 0 };
let matchHistory = JSON.parse(localStorage.getItem('baskota_history')) || [];
const savedTheme = localStorage.getItem('theme') || 'dark';

// تطبيق الثيم المحفوظ وتحديث الواجهة فوراً
document.documentElement.setAttribute('data-theme', savedTheme);

// --- وظائف التنقل والواجهة ---

function showSection(id) {
    document.querySelectorAll('.page-section').forEach(s => {
        s.style.display = 'none';
    });

    const targetSection = document.getElementById(id);
    if (targetSection) {
        targetSection.style.display = 'flex';
        targetSection.style.flexDirection = 'column';
        targetSection.style.alignItems = 'center';
    }
    
    // تحديث حالة الزر النشط في السايدبار
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(btn => 
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(id)
    );
    if (activeBtn) activeBtn.classList.add('active');

    // إغلاق السايدبار تلقائياً عند اختيار قسم (للموبايل)
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
}

function setMode(mode) {
    gameMode = mode;
    document.getElementById('vs-cpu').classList.toggle('active', mode === 'cpu');
    document.getElementById('vs-friend').classList.toggle('active', mode === 'friend');
    
    const oppDisplay = document.getElementById('opponent-display');
    if (oppDisplay) oppDisplay.innerText = mode === 'cpu' ? "الكمبيوتر (O)" : "الصديق (O)";
    
    const diffSettings = document.getElementById('difficulty-settings');
    if (diffSettings) diffSettings.style.display = mode === 'cpu' ? 'flex' : 'none';
    
    resetGame();
}

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`diff-${level}`).classList.add('active');
    resetGame();
}

// 3. منطق اللعبة والتحكم في الخلايا
document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
        const idx = e.target.dataset.index;
        if (board[idx] !== "" || !gameActive) return;

        makeMove(idx, currentPlayer);

        if (gameActive) {
            if (gameMode === 'cpu') {
                currentPlayer = "O";
                gameActive = false; // قفل اللعب مؤقتاً لحين رد الكمبيوتر
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

// --- منطق الذكاء الاصطناعي (Minimax & Smart Logic) ---

function aiMove() {
    let move;
    const emptyIndices = board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
    
    if (emptyIndices.length === 0) return;

    if (difficulty === 'easy') {
        move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    } 
    else if (difficulty === 'medium') {
        move = smartMove() ?? emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    } 
    else {
        move = minimax(board, "O").index;
    }

    gameActive = true; 
    makeMove(move, "O");
    if (gameActive) currentPlayer = "X";
}

function smartMove() {
    const winConditions = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    for (let combo of winConditions) {
        let values = combo.map(i => board[i]);
        if (values.filter(v => v === "O").length === 2 && values.filter(v => v === "").length === 1) {
            return combo[values.indexOf("")];
        }
    }
    for (let combo of winConditions) {
        let values = combo.map(i => board[i]);
        if (values.filter(v => v === "X").length === 2 && values.filter(v => v === "").length === 1) {
            return combo[values.indexOf("")];
        }
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
        let move = {};
        move.index = availSpots[i];
        newBoard[availSpots[i]] = player;

        if (player === "O") {
            let result = minimax(newBoard, "X");
            move.score = result.score;
        } else {
            let result = minimax(newBoard, "O");
            move.score = result.score;
        }

        newBoard[availSpots[i]] = "";
        moves.push(move);
    }

    let bestMove;
    if (player === "O") {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
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
        launchConfetti(); 
    } else if (res === 'O') {
        status = "خسارة";
        if (gameMode === 'cpu') scores.ai++; 
        else scores.f++;
    } else {
        status = "تعادل";
        scores.d++;
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
    if (!container) return;

    if (matchHistory.length === 0) {
        container.innerHTML = '<p class="empty-msg">لا يوجد مباريات مسجلة بعد</p>';
        return;
    }

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
    const rateEl = document.getElementById('win-rate');
    if (rateEl) rateEl.innerText = rate + "%";
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
    if (confirm("يا مازن، هل أنت متأكد من تصفير جميع الإحصائيات والسجلات؟")) {
        scores = { p: 0, f: 0, ai: 0, d: 0, t: 0 };
        matchHistory = [];
        localStorage.removeItem('baskota_scores');
        localStorage.removeItem('baskota_history');
        updateUI();
        renderHistory();
        resetGame();
    }
}

// --- 5. وظيفة تبديل الوضع (Dark/Light Mode) ---

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (themeIcon) {
        themeIcon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            let newTheme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            if (themeIcon) {
                themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            }
        });
    }
}

// --- 6. تهيئة العناصر وتشغيل الـ Hamburger Menu المطور (UPDATED SECTION) ---

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateUI();
    renderHistory();
    showSection('dashboard');

    // ملاحظة لمازن: تأكد أن الـ ID في الـ HTML هو 'mobile-menu' 
    // أو غيره لـ '.menu-toggle' لو كنت بتستخدم Class
    const menuToggle = document.getElementById('mobile-menu') || document.querySelector('.menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
            // طباعة للتأكد في الـ Console
            console.log("Sidebar status: ", sidebar.classList.contains('open') ? "Open" : "Closed");
        });

        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
});