// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBVXOlBMPcPDTkjZIE0iFGcIbzVPlnuQfo",
    authDomain: "clown-suika-game.firebaseapp.com",
    projectId: "clown-suika-game",
    storageBucket: "clown-suika-game.firebasestorage.app",
    messagingSenderId: "612315618269",
    appId: "1:612315618269:web:f8976ebab2fa7c9611b434"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Load leaderboard on page load
window.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
    
    // Refresh leaderboard every 30 seconds
    setInterval(loadLeaderboard, 30000);
});

async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    
    try {
        const snapshot = await db.collection('leaderboard')
            .orderBy('score', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            leaderboardList.innerHTML = '<div class="loading">No scores yet. Be the first!</div>';
            return;
        }

        leaderboardList.innerHTML = '';
        
        const currentPlayer = localStorage.getItem('playerName');
        
        snapshot.forEach((doc, index) => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            // Highlight current user
            if (currentPlayer && currentPlayer === data.name) {
                item.classList.add('current-user');
            }
            
            item.innerHTML = `
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="rank-avatar">🤡</span>
                <span class="leaderboard-name">${data.name}</span>
                <span class="leaderboard-score">${data.score}</span>
            `;
            leaderboardList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardList.innerHTML = '<div class="loading">Error loading scores</div>';
    }
}

async function submitScore(playerName, score) {
    try {
        await db.collection('leaderboard').add({
            name: playerName,
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Get updated rankings
        const snapshot = await db.collection('leaderboard')
            .orderBy('score', 'desc')
            .get();

        const scores = [];
        snapshot.forEach(doc => {
            scores.push(doc.data());
        });

        // Find user rank
        let userRank = 0;
        for (let i = 0; i < scores.length; i++) {
            if (scores[i].name === playerName && scores[i].score === score) {
                userRank = i + 1;
                break;
            }
        }

        // Reload main leaderboard
        loadLeaderboard();

        return {
            rank: userRank,
            total: scores.length,
            topScores: scores.slice(0, 10)
        };
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}