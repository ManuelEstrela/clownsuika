// Clown Configuration
const CLOWNS = [
    { name: 'Tessa', size: 30, color: 0xFF6B6B, score: 1 },
    { name: 'Twinkles', size: 40, color: 0xFFA07A, score: 3 },
    { name: 'Reina', size: 50, color: 0xFFD93D, score: 6 },
    { name: 'Osvaldo', size: 60, color: 0x95E1D3, score: 10 },
    { name: 'Hazel', size: 70, color: 0x6BCB77, score: 15 },
    { name: 'Mumbles', size: 80, color: 0x4D96FF, score: 21 },
    { name: 'Sneaky', size: 90, color: 0x9D84B7, score: 28 },
    { name: 'Wendy', size: 100, color: 0xFF6FB5, score: 36 },
    { name: 'Chatty', size: 110, color: 0xF9A826, score: 45 },
    { name: 'Cups', size: 120, color: 0x00D9FF, score: 55 },
    { name: 'Kirk', size: 140, color: 0xFF0080, score: 66 }
];

// Game variables
let playerName = '';
let game;
let currentClown;
let nextClownType;
let score = 0;
let gameOver = false;
let canDrop = true;
let clownBodies = [];
let gameScene;

// DOM Elements
const nameModal = document.getElementById('nameModal');
const playerNameInput = document.getElementById('playerName');
const startButton = document.getElementById('startButton');
const gameOverModal = document.getElementById('gameOverModal');
const restartButton = document.getElementById('restartButton');
const scoreValue = document.getElementById('scoreValue');
const nextClownPreview = document.getElementById('nextClownPreview');

// Start game on button click
startButton.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    
    if (playerName.length === 0) {
        alert('Please enter your name!');
        return;
    }
    
    if (playerName.length > 20) {
        alert('Name must be 20 characters or less!');
        return;
    }
    
    nameModal.style.display = 'none';
    initGame();
});

// Enter key to start
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startButton.click();
    }
});

// Restart game
restartButton.addEventListener('click', () => {
    gameOverModal.style.display = 'none';
    nameModal.style.display = 'flex';
    playerNameInput.value = playerName;
    
    if (game) {
        game.destroy(true);
    }
    
    resetGameState();
});

function resetGameState() {
    score = 0;
    gameOver = false;
    canDrop = true;
    clownBodies = [];
    currentClown = null;
    scoreValue.textContent = '0';
}

function initGame() {
    resetGameState();
    
    const config = {
        type: Phaser.AUTO,
        width: 600,
        height: 700,
        parent: 'gameCanvas',
        backgroundColor: '#87CEEB',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 800 },
                debug: false
            }
        },
        scene: {
            create: create,
            update: update
        }
    };

    game = new Phaser.Game(config);
}

function create() {
    gameScene = this;
    
    // Container dimensions
    const wallThickness = 20;
    const containerY = 150;
    const containerHeight = 550;
    const containerBottom = containerY + containerHeight;
    
    // Bottom wall
    const bottom = this.add.rectangle(300, containerBottom - wallThickness/2, 600, wallThickness, 0x8B4513);
    this.physics.add.existing(bottom, true); // true = static
    bottom.body.immovable = true;
    
    // Left wall
    const leftWall = this.add.rectangle(wallThickness/2, containerY + containerHeight/2, wallThickness, containerHeight, 0x8B4513);
    this.physics.add.existing(leftWall, true);
    leftWall.body.immovable = true;
    
    // Right wall  
    const rightWall = this.add.rectangle(600 - wallThickness/2, containerY + containerHeight/2, wallThickness, containerHeight, 0x8B4513);
    this.physics.add.existing(rightWall, true);
    rightWall.body.immovable = true;
    
    // Store walls for collision
    this.containerWalls = [bottom, leftWall, rightWall];
    
    // Danger line
    const dangerLine = this.add.line(300, containerY + 80, 0, 0, 560, 0, 0xFF0000, 0.5);
    dangerLine.setLineWidth(3);
    dangerLine.setOrigin(0, 0.5);
    
    // Initialize next clown
    nextClownType = Phaser.Math.Between(0, 4);
    updateNextPreview();
    
    // Spawn first clown
    spawnNewClown.call(this);
    
    // Input handlers
    this.input.on('pointerdown', (pointer) => {
        if (canDrop && !gameOver && pointer.y > containerY) {
            dropClown.call(this);
        }
    });
    
    this.input.on('pointermove', (pointer) => {
        if (currentClown && !gameOver) {
            const minX = wallThickness + currentClown.displayWidth / 2;
            const maxX = 600 - wallThickness - currentClown.displayWidth / 2;
            currentClown.x = Phaser.Math.Clamp(pointer.x, minX, maxX);
        }
    });
}

function spawnNewClown() {
    if (gameOver) return;

    const clownType = nextClownType;
    const clown = CLOWNS[clownType];
    
    currentClown = this.add.circle(300, 100, clown.size / 2, clown.color);
    currentClown.setStrokeStyle(3, 0xFFFFFF);
    currentClown.clownType = clownType;
    currentClown.isPreview = true;
    
    // Update next clown
    nextClownType = Phaser.Math.Between(0, Math.min(4, clownType + 2));
    updateNextPreview();
}

function updateNextPreview() {
    const nextClown = CLOWNS[nextClownType];
    nextClownPreview.innerHTML = `
        <div style="
            width: ${nextClown.size}px; 
            height: ${nextClown.size}px; 
            background: #${nextClown.color.toString(16).padStart(6, '0')}; 
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>
    `;
}

function dropClown() {
    if (!currentClown || gameOver || !canDrop) return;

    canDrop = false;
    const clownType = currentClown.clownType;
    const x = currentClown.x;
    const y = currentClown.y;
    const clown = CLOWNS[clownType];

    // Remove preview
    currentClown.destroy();

    // Create physics body
    const droppedClown = this.add.circle(x, y, clown.size / 2, clown.color);
    droppedClown.setStrokeStyle(3, 0xFFFFFF);
    
    this.physics.add.existing(droppedClown);
    droppedClown.body.setCircle(clown.size / 2);
    droppedClown.body.setBounce(0.3);
    droppedClown.body.setCollideWorldBounds(false);
    droppedClown.body.setDrag(0);
    droppedClown.body.setMaxVelocity(1000, 1000);
    
    droppedClown.clownType = clownType;
    droppedClown.merging = false;
    droppedClown.dangerTimer = 0;
    
    // IMPORTANT: Add colliders BEFORE adding to array
    // Collide with all walls
    this.containerWalls.forEach(wall => {
        this.physics.add.collider(droppedClown, wall);
    });
    
    // Collide with all existing clowns
    clownBodies.forEach(otherClown => {
        if (otherClown.active) {
            this.physics.add.collider(droppedClown, otherClown);
            this.physics.add.overlap(droppedClown, otherClown, () => {
                checkMerge.call(this, droppedClown, otherClown);
            }, null, this);
        }
    });
    
    // Now add to array
    clownBodies.push(droppedClown);

    // Spawn next clown after delay
    this.time.delayedCall(300, () => {
        canDrop = true;
        spawnNewClown.call(this);
    });
}

function checkMerge(clownA, clownB) {
    if (!clownA || !clownB) return;
    if (!clownA.active || !clownB.active) return;
    if (clownA.merging || clownB.merging) return;
    if (clownA.clownType !== clownB.clownType) return;
    if (clownA.clownType >= CLOWNS.length - 1) return;
    
    // Check if they're actually touching (close enough)
    const dist = Phaser.Math.Distance.Between(clownA.x, clownA.y, clownB.x, clownB.y);
    const combinedRadius = clownA.displayWidth / 2 + clownB.displayWidth / 2;
    
    if (dist < combinedRadius * 0.9) {
        mergeClowns.call(this, clownA, clownB);
    }
}

function mergeClowns(clownA, clownB) {
    if (!clownA || !clownB) return;
    if (!clownA.active || !clownB.active) return;
    if (clownA.merging || clownB.merging) return;
    if (gameOver) return;
    
    // Mark as merging
    clownA.merging = true;
    clownB.merging = true;

    const newType = clownA.clownType + 1;
    const newClown = CLOWNS[newType];
    
    // Add score
    score += newClown.score;
    scoreValue.textContent = score;

    // Calculate merge position
    const x = (clownA.x + clownB.x) / 2;
    const y = (clownA.y + clownB.y) / 2;

    // Remove from tracking array
    const indexA = clownBodies.indexOf(clownA);
    const indexB = clownBodies.indexOf(clownB);
    if (indexA > -1) clownBodies.splice(indexA, 1);
    if (indexB > -1) clownBodies.splice(indexB, 1);
    
    // Destroy old clowns
    clownA.destroy();
    clownB.destroy();

    // Create merged clown
    const merged = this.add.circle(x, y, newClown.size / 2, newClown.color);
    merged.setStrokeStyle(3, 0xFFFFFF);
    
    this.physics.add.existing(merged);
    merged.body.setCircle(newClown.size / 2);
    merged.body.setBounce(0.2);
    merged.body.setMass(1);
    
    merged.clownType = newType;
    merged.merging = false;
    merged.dangerTimer = 0;
    clownBodies.push(merged);

    // Add collisions with walls
    for (let wall of this.containerWalls) {
        this.physics.add.collider(merged, wall);
    }
    
    // Add collisions with existing clowns
    for (let otherClown of clownBodies) {
        if (otherClown !== merged && otherClown.active) {
            this.physics.add.collider(merged, otherClown);
            this.physics.add.overlap(merged, otherClown, () => {
                checkMerge.call(this, merged, otherClown);
            }, null, this);
        }
    }

    // Visual feedback
    this.tweens.add({
        targets: merged,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
        yoyo: true,
        ease: 'Sine.easeInOut'
    });
}

function update() {
    if (gameOver) return;

    const dangerY = 230;
    
    // Clean up destroyed clowns
    clownBodies = clownBodies.filter(clown => clown && clown.active);
    
    for (let clown of clownBodies) {
        if (!clown || !clown.active || !clown.body) continue;
        
        const speed = Math.abs(clown.body.velocity.y);
        
        if (clown.y < dangerY && speed < 10) {
            if (!clown.dangerTimer) {
                clown.dangerTimer = 0;
            }
            clown.dangerTimer++;
            
            if (clown.dangerTimer > 60) {
                endGame.call(this);
                break;
            }
        } else {
            clown.dangerTimer = 0;
        }
    }
}

function endGame() {
    if (gameOver) return;
    
    gameOver = true;
    canDrop = false;
    
    // Show game over modal
    document.getElementById('finalScoreValue').textContent = score;
    gameOverModal.style.display = 'flex';
    
    // Submit score
    submitScoreAndShowResults();
}

async function submitScoreAndShowResults() {
    const rankDisplay = document.getElementById('rankDisplay');
    const gameOverLeaderboard = document.getElementById('gameOverLeaderboard');
    
    rankDisplay.textContent = 'Submitting score...';
    gameOverLeaderboard.innerHTML = '';
    
    try {
        const result = await submitScore(playerName, score);
        
        rankDisplay.textContent = `🎉 You ranked #${result.rank} out of ${result.total} players! 🎉`;
        
        gameOverLeaderboard.innerHTML = '<h3>🏆 Top 10 Global 🏆</h3>';
        
        result.topScores.forEach((s, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-item';
            
            if (s.name === playerName && s.score === score && index < 10) {
                div.classList.add('current-user');
            }
            
            div.innerHTML = `
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${s.name}</span>
                <span class="leaderboard-score">${s.score}</span>
            `;
            gameOverLeaderboard.appendChild(div);
        });
        
    } catch (error) {
        console.error('Error submitting score:', error);
        rankDisplay.textContent = 'Error submitting score. Please try again!';
    }
}