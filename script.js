import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBkP0svfYAZaubdCP3OC8ZBS6ioUPzD-cI",
    authDomain: "party-tracker-dc912.firebaseapp.com",
    projectId: "party-tracker-dc912",
    storageBucket: "party-tracker-dc912.firebasestorage.app",
    messagingSenderId: "1061606049560",
    appId: "1:1061606049560:web:d0b3db58c285de2b3b006d",
    measurementId: "G-0DPVKJD1F5"
};

// Initialize Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
} catch (e) {
    console.error("Error inicializando Firebase. Revisa tu configuración.", e);
}

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
    let globalData = { users: {} }; // Local cache of DB data

    const counterTypes = [
        { id: 'beers', label: 'Cervezas', icon: '🍺' },
        { id: 'drinks', label: 'Copas', icon: '🍹' },
        { id: 'shots', label: 'Chupitos', icon: '🥃' },
        { id: 'bathroom', label: 'Baño', icon: '🚽' },
        { id: 'water', label: 'Agua', icon: '💧' }
    ];

    // Functions
    function init() {
        // Check if name exists in session storage
        const savedName = sessionStorage.getItem('partyTrackerName');
        if (savedName) {
            login(savedName);
        }

        // Setup Realtime Listener
        if (db) {
            const dbRef = ref(db, 'party-tracker');
            onValue(dbRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    globalData = data;
                    if (!globalData.users) globalData.users = {};

                    // Update UI if logged in
                    if (currentUser) {
                        renderCounters();
                        renderRankings();
                    }
                }
            });
        } else {
            alert("Falta configurar Firebase en script.js");
        }
    }

    function login(name) {
        currentUser = name;
        sessionStorage.setItem('partyTrackerName', name);

        // Check if user exists in globalData (which comes from DB)
        // If not, we initialize them in the DB
        if (db) {
            const userRef = ref(db, `party-tracker/users/${name}`);
            get(userRef).then((snapshot) => {
                if (!snapshot.exists()) {
                    set(userRef, initializeUserStats());
                }
            });
        }

        showDashboard();
        // Initial render (might be empty until DB syncs)
        renderCounters();
    }

    function initializeUserStats() {
        const stats = {};
        counterTypes.forEach(type => stats[type.id] = 0);
        return stats;
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
        const userStats = (globalData.users && globalData.users[currentUser]) || initializeUserStats();

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
                    <button class="control-btn btn-minus" data-id="${type.id}" data-action="-1">-</button>
                    <button class="control-btn btn-plus" data-id="${type.id}" data-action="1">+</button>
                </div>
            `;
            countersContainer.appendChild(card);
        });

        // Re-attach listeners because we are using module and inline onclick won't work easily
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const change = parseInt(e.target.dataset.action);
                updateCounter(id, change);
            });
        });
    }

    function updateCounter(id, change) {
        if (!db) return;

        const userStats = (globalData.users && globalData.users[currentUser]) || initializeUserStats();
        const newValue = (userStats[id] || 0) + change;

        if (newValue >= 0) {
            // Optimistic update (optional, but DB is fast enough usually)
            const updates = {};
            updates[`party-tracker/users/${currentUser}/${id}`] = newValue;
            update(ref(db), updates);

            // Animation is handled by re-render or we can add it here if we want instant feedback
            // For now, let's rely on the DB listener to update the UI to ensure sync
        }
    };

    function renderRankings() {
        const users = globalData.users || {};
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
            if (db) {
                set(ref(db, `party-tracker/users/${currentUser}`), initializeUserStats());
            }
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
