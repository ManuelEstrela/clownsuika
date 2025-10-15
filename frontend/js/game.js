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
let mergeQueue = [];

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
    mergeQueue = [];
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
            default: 'matter',
            matter: {
                gravity: { y: 1.2 },
                debug: false,
                enableSleeping: false
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
    const containerWidth = 600;
    const containerHeight = 700;
    const containerY = 0;
    
    // Create walls with Matter.js
    const leftWall = this.matter.add.rectangle(
        wallThickness / 2,
        containerHeight / 2,
        wallThickness,
        containerHeight,
        { 
            isStatic: true,
            friction: 0.1,
            restitution: 0.5
        }
    );
    
    const rightWall = this.matter.add.rectangle(
        containerWidth - wallThickness / 2,
        containerHeight / 2,
        wallThickness,
        containerHeight,
        { 
            isStatic: true,
            friction: 0.1,
            restitution: 0.5
        }
    );
    
    const floor = this.matter.add.rectangle(
        containerWidth / 2,
        containerHeight - wallThickness / 2,
        containerWidth,
        wallThickness,
        { 
            isStatic: true,
            friction: 0.5,
            restitution: 0.3
        }
    );
    
    // Visual walls
    this.add.rectangle(wallThickness / 2, containerHeight / 2, wallThickness, containerHeight, 0x8B4513);
    this.add.rectangle(containerWidth - wallThickness / 2, containerHeight / 2, wallThickness, containerHeight, 0x8B4513);
    this.add.rectangle(containerWidth / 2, containerHeight - wallThickness / 2, containerWidth, wallThickness, 0x8B4513);
    
    // Danger line
    const dangerY = 150;
    const dangerLine = this.add.line(300, dangerY, 0, 0, 560, 0, 0xFF0000, 0.8);
    dangerLine.setLineWidth(4);
    dangerLine.setOrigin(0, 0.5);
    
    // Initialize next clown
    nextClownType = Phaser.Math.Between(0, 4);
    updateNextPreview();
    
    // Spawn preview clown
    spawnPreviewClown.call(this);
    
    // Mouse movement for preview
    this.input.on('pointermove', (pointer) => {
        if (currentClown && currentClown.isPreview && !gameOver) {
            const clown = CLOWNS[currentClown.clownType];
            const minX = wallThickness + clown.size / 2;
            const maxX = containerWidth - wallThickness - clown.size / 2;
            currentClown.x = Phaser.Math.Clamp(pointer.x, minX, maxX);
        }
    });
    
    // Click to drop
    this.input.on('pointerdown', (pointer) => {
        if (canDrop && !gameOver && currentClown && currentClown.isPreview) {
            dropClown.call(this);
        }
    });
    
    // Collision detection for merging
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // Check if both bodies have game objects
            if (bodyA.gameObject && bodyB.gameObject) {
                const objA = bodyA.gameObject;
                const objB = bodyB.gameObject;
                
                // Check if they're the same type and can merge
                if (objA.clownType === objB.clownType && 
                    objA.clownType < CLOWNS.length - 1 &&
                    !objA.markedForMerge && 
                    !objB.markedForMerge &&
                    !objA.isPreview &&
                    !objB.isPreview) {
                    
                    // Mark for merge to prevent double-merging
                    objA.markedForMerge = true;
                    objB.markedForMerge = true;
                    
                    // Queue the merge
                    mergeQueue.push({ objA, objB });
                }
            }
        });
    });
}

function spawnPreviewClown() {
    if (gameOver) return;
    
    const clown = CLOWNS[nextClownType];
    const radius = clown.size / 2;
    
    // Create preview circle (non-physics)
    currentClown = this.add.circle(300, 80, radius, clown.color);
    currentClown.setStrokeStyle(3, 0xFFFFFF, 0.8);
    currentClown.clownType = nextClownType;
    currentClown.isPreview = true;
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
    if (!currentClown || !canDrop || gameOver) return;
    
    canDrop = false;
    
    const clownType = currentClown.clownType;
    const clown = CLOWNS[clownType];
    const x = currentClown.x;
    const y = currentClown.y;
    const radius = clown.size / 2;
    
    // Remove preview
    currentClown.destroy();
    currentClown = null;
    
    // Create Matter.js physics body
    const body = this.matter.add.circle(x, y, radius, {
        restitution: 0.5,  // Bounciness
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.001
    });
    
    // Create visual representation
    const visual = this.add.circle(x, y, radius, clown.color);
    visual.setStrokeStyle(3, 0xFFFFFF);
    
    // Link visual to physics body
    body.gameObject = visual;
    visual.body = body;
    visual.clownType = clownType;
    visual.markedForMerge = false;
    visual.isPreview = false;
    visual.dangerTimer = 0;
    
    // Add to tracking array
    clownBodies.push(visual);
    
    // Update visual position every frame
    this.events.on('update', () => {
        if (visual && visual.active && body && body.position) {
            visual.x = body.position.x;
            visual.y = body.position.y;
            visual.rotation = body.angle;
        }
    });
    
    // Prepare next clown
    const currentType = clownType;
    nextClownType = Phaser.Math.Between(0, Math.min(4, currentType + 1));
    updateNextPreview();
    
    // Allow dropping again after delay
    this.time.delayedCall(400, () => {
        canDrop = true;
        spawnPreviewClown.call(this);
    });
}

function processMerges() {
    if (mergeQueue.length === 0 || gameOver) return;
    
    const merge = mergeQueue.shift();
    const { objA, objB } = merge;
    
    // Safety checks
    if (!objA || !objB || !objA.active || !objB.active) return;
    if (!objA.body || !objB.body) return;
    
    const newType = objA.clownType + 1;
    if (newType >= CLOWNS.length) return;
    
    const newClown = CLOWNS[newType];
    const newRadius = newClown.size / 2;
    
    // Calculate merge position (weighted average)
    const mergeX = (objA.body.position.x + objB.body.position.x) / 2;
    const mergeY = (objA.body.position.y + objB.body.position.y) / 2;
    
    // Add score
    score += newClown.score;
    scoreValue.textContent = score;
    
    // Remove old bodies from tracking
    const indexA = clownBodies.indexOf(objA);
    const indexB = clownBodies.indexOf(objB);
    if (indexA > -1) clownBodies.splice(indexA, 1);
    if (indexB > -1) clownBodies.splice(indexB, 1);
    
    // Remove old physics bodies
    gameScene.matter.world.remove(objA.body);
    gameScene.matter.world.remove(objB.body);
    objA.destroy();
    objB.destroy();
    
    // Create new merged ball
    const newBody = gameScene.matter.add.circle(mergeX, mergeY, newRadius, {
        restitution: 0.5,
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.001
    });
    
    const newVisual = gameScene.add.circle(mergeX, mergeY, newRadius, newClown.color);
    newVisual.setStrokeStyle(3, 0xFFFFFF);
    
    newBody.gameObject = newVisual;
    newVisual.body = newBody;
    newVisual.clownType = newType;
    newVisual.markedForMerge = false;
    newVisual.isPreview = false;
    newVisual.dangerTimer = 0;
    
    clownBodies.push(newVisual);
    
    // Update visual position
    gameScene.events.on('update', () => {
        if (newVisual && newVisual.active && newBody && newBody.position) {
            newVisual.x = newBody.position.x;
            newVisual.y = newBody.position.y;
            newVisual.rotation = newBody.angle;
        }
    });
    
    // Merge animation
    gameScene.tweens.add({
        targets: newVisual,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 150,
        yoyo: true,
        ease: 'Back.easeOut'
    });
}

function update() {
    if (gameOver) return;
    
    // Process any pending merges
    if (mergeQueue.length > 0) {
        processMerges();
    }
    
    // Check for game over
    const dangerY = 150;
    let dangerousClown = false;
    
    clownBodies.forEach(clown => {
        if (!clown || !clown.active || !clown.body) return;
        
        const velocityY = Math.abs(clown.body.velocity.y);
        
        // Check if clown is above danger line and nearly stopped
        if (clown.y < dangerY && velocityY < 0.5) {
            if (!clown.dangerTimer) {
                clown.dangerTimer = 0;
            }
            clown.dangerTimer++;
            
            // Game over after ~1 second
            if (clown.dangerTimer > 60) {
                dangerousClown = true;
            }
        } else {
            clown.dangerTimer = 0;
        }
    });
    
    if (dangerousClown) {
        endGame();
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