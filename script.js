document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const usernameInput = document.getElementById('username-input');
    const startBtn = document.getElementById('start-btn');
    const displayName = document.getElementById('display-name');
    const countersContainer = document.getElementById('counters-container');
    const resetAllBtn = document.getElementById('reset-all-btn');

    // Tabs & Views
    const tabBtns = document.querySelectorAll('.tab-btn');
    const trackerView = document.getElementById('tracker-view');
    const rankingView = document.getElementById('ranking-view');
    const rankingsContainer = document.getElementById('rankings-container');

    // State
    let currentUser = '';
    const counterTypes = [
        { id: 'beers', label: 'Cervezas', icon: '🍺' },
        { id: 'drinks', label: 'Copas', icon: '🍹' },
        { id: 'shots', label: 'Chupitos', icon: '🥃' },
        { id: 'bathroom', label: 'Baño', icon: '🚽' },
        { id: 'water', label: 'Agua', icon: '💧' }
    ];

    // Functions
    function init() {
        // Check if name exists in session storage (for page reload convenience)
        const savedName = sessionStorage.getItem('partyTrackerName');
        if (savedName) {
            login(savedName);
        }
    }

    function login(name) {
        try {
            currentUser = name;
            sessionStorage.setItem('partyTrackerName', name);

            // Ensure user exists in localStorage
            const data = getStoredData();
            if (!data.users[name]) {
                data.users[name] = initializeUserStats();
                saveData(data);
            }

            showDashboard();
            renderCounters();
        } catch (error) {
            console.error("Login error:", error);
            alert("Hubo un error al iniciar sesión. Intentando reiniciar datos...");
            localStorage.removeItem('partyTrackerData');
            location.reload();
        }
    }

    function initializeUserStats() {
        const stats = {};
        counterTypes.forEach(type => stats[type.id] = 0);
        return stats;
    }

    function getStoredData() {
        try {
            const raw = localStorage.getItem('partyTrackerData');
            const data = raw ? JSON.parse(raw) : { users: {} };

            // Validate structure
            if (!data.users) {
                data.users = {};
            }
            return data;
        } catch (e) {
            console.error("Data corruption detected", e);
            return { users: {} };
        }
    }

    function saveData(data) {
        localStorage.setItem('partyTrackerData', JSON.stringify(data));
    }
    function showDashboard() {
        displayName.textContent = currentUser;
        welcomeScreen.classList.remove('active');
        welcomeScreen.classList.add('hidden');

        setTimeout(() => {
            dashboardScreen.classList.remove('hidden');
            dashboardScreen.classList.add('active');
        }, 300);
    }

    function renderCounters() {
        const data = getStoredData();
        const userStats = data.users[currentUser];

        countersContainer.innerHTML = '';
        counterTypes.forEach(type => {
            const count = userStats[type.id] || 0;
            const card = document.createElement('div');
            card.className = 'counter-card';
            card.innerHTML = `
                <div class="counter-icon">${type.icon}</div>
                <div class="counter-title">${type.label}</div>
                <div class="counter-value" id="val-${type.id}">${count}</div>
                <div class="counter-controls">
                    <button class="control-btn btn-minus" onclick="updateCounter('${type.id}', -1)">-</button>
                    <button class="control-btn btn-plus" onclick="updateCounter('${type.id}', 1)">+</button>
                </div>
            `;
            countersContainer.appendChild(card);
        });
    }

    // Expose updateCounter to global scope
    window.updateCounter = function (id, change) {
        const data = getStoredData();
        const userStats = data.users[currentUser];

        const newValue = (userStats[id] || 0) + change;

        if (newValue >= 0) {
            userStats[id] = newValue;
            saveData(data);

            // Animate update
            const valueEl = document.getElementById(`val-${id}`);
            valueEl.style.transform = 'scale(1.2)';
            valueEl.style.color = change > 0 ? 'var(--success-color)' : 'var(--danger-color)';

            setTimeout(() => {
                valueEl.textContent = newValue;
                valueEl.style.transform = 'scale(1)';
                valueEl.style.color = 'var(--text-primary)';
            }, 100);
        }
    };

    function renderRankings() {
        const data = getStoredData();
        const users = data.users;
        const userNames = Object.keys(users);

        rankingsContainer.innerHTML = '';

        if (userNames.length === 0) {
            rankingsContainer.innerHTML = '<p style="text-align:center; width:100%; color: var(--text-secondary);">Aún no hay datos.</p>';
            return;
        }

        counterTypes.forEach(type => {
            // Sort users for this category
            const sortedUsers = userNames
                .map(name => ({ name, count: users[name][type.id] || 0 }))
                .sort((a, b) => b.count - a.count)
                .filter(u => u.count > 0) // Only show if count > 0
                .slice(0, 5); // Top 5

            if (sortedUsers.length > 0) {
                const card = document.createElement('div');
                card.className = 'ranking-card';

                let listHtml = '<ul class="ranking-list">';
                sortedUsers.forEach((u, index) => {
                    const rankClass = index < 3 ? `top-${index + 1}` : '';
                    listHtml += `
                        <li class="ranking-item">
                            <span class="rank-pos ${rankClass}">#${index + 1}</span>
                            <span class="rank-name">${u.name}</span>
                            <span class="rank-value">${u.count}</span>
                        </li>
                    `;
                });
                listHtml += '</ul>';

                card.innerHTML = `
                    <div class="ranking-header">
                        <span class="ranking-icon">${type.icon}</span>
                        <span class="ranking-title">${type.label}</span>
                    </div>
                    ${listHtml}
                `;
                rankingsContainer.appendChild(card);
            }
        });

        if (rankingsContainer.children.length === 0) {
            rankingsContainer.innerHTML = '<p style="text-align:center; width:100%; color: var(--text-secondary);">Nadie ha empezado la fiesta aún (todos los contadores en 0).</p>';
        }
    }

    // Event Listeners
    startBtn.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (name) {
            login(name);
        } else {
            usernameInput.style.borderColor = 'var(--danger-color)';
            usernameInput.classList.add('shake');
            setTimeout(() => {
                usernameInput.classList.remove('shake');
                usernameInput.style.borderColor = '#334155';
            }, 500);
        }
    });

    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startBtn.click();
        }
    });

    resetAllBtn.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres reiniciar TUS contadores a 0?')) {
            const data = getStoredData();
            data.users[currentUser] = initializeUserStats();
            saveData(data);
            renderCounters();
        }
    });

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            trackerView.classList.add('hidden');
            trackerView.classList.remove('active');
            rankingView.classList.add('hidden');
            rankingView.classList.remove('active');

            // Add active to clicked
            btn.classList.add('active');

            if (btn.dataset.tab === 'tracker') {
                trackerView.classList.remove('hidden');
                trackerView.classList.add('active');
            } else {
                rankingView.classList.remove('hidden');
                rankingView.classList.add('active');
                renderRankings();
            }
        });
    });

    // Initialize
    init();
});
