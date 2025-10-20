// Clown Configuration with images
const CLOWNS = [
    { name: 'Tessa', size: 30, color: 0xFF6B6B, score: 1, image: 'images/tessa.png', hitboxScale: 0.95 },
    { name: 'Twinkles', size: 35, color: 0xFFA07A, score: 3, image: 'images/twinkles.png', hitboxScale: 0.95 },
    { name: 'Reina', size: 40, color: 0xFFD93D, score: 6, image: 'images/reina.png', hitboxScale: 0.95 },
    { name: 'Osvaldo', size: 45, color: 0x95E1D3, score: 10, image: 'images/osvaldo.png', hitboxScale: 0.95 },
    { name: 'Hazel', size: 50, color: 0x6BCB77, score: 15, image: 'images/hazel.png', hitboxScale: 0.95 },
    { name: 'Mumbles', size: 55, color: 0x4D96FF, score: 21, image: 'images/mumbles.png', hitboxScale: 0.95 },
    { name: 'Sneaky', size: 60, color: 0x9D84B7, score: 28, image: 'images/sneaky.png', hitboxScale: 0.95 },
    { name: 'Wendy', size: 65, color: 0xFF6FB5, score: 36, image: 'images/wendy.png', hitboxScale: 0.95 },
    { name: 'Chatty', size: 70, color: 0xF9A826, score: 45, image: 'images/chatty.png', hitboxScale: 0.95 },
    { name: 'Cups', size: 75, color: 0x00D9FF, score: 55, image: 'images/cups.png', hitboxScale: 0.95 },
    { name: 'Kirk', size: 80, color: 0xFF0080, score: 66, image: 'images/kirk.png', hitboxScale: 0.95 }
];

// Game variables
let playerName = '';
let game;
let currentClown;
let nextClownType;
let score = 0;
let bestScore = 0;
let gameOver = false;
let canDrop = true;
let clownBodies = [];
let gameScene;
let vanSprite;

// Audio system
const sounds = {
    drop: null,
    merge: [],
    gameOver: null
};

// DOM Elements
const nameModal = document.getElementById('nameModal');
const playerNameInput = document.getElementById('playerName');
const startButton = document.getElementById('startButton');
const gameOverModal = document.getElementById('gameOverModal');
const restartButton = document.getElementById('restartButton');
const scoreValues = document.querySelectorAll('#scoreValue');
const bestScoreValue = document.getElementById('bestScore');
const nextClownPreview = document.getElementById('nextClownPreview');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('bestScore');
    if (saved) {
        bestScore = parseInt(saved);
        if (bestScoreValue) {
            bestScoreValue.textContent = bestScore;
        }
    }
    initAudio();
});

function initAudio() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sounds.drop = audioContext;
        for (let i = 0; i < 11; i++) {
            sounds.merge.push(audioContext);
        }
        sounds.gameOver = audioContext;
    } catch (e) {
        console.log('Audio context not available');
    }
}

function playSound(type, index = 0) {
    if (!sounds.drop) return;
    
    try {
        const ctx = sounds.drop;
        const now = ctx.currentTime;
        
        switch (type) {
            case 'drop':
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.frequency.value = 400;
                osc1.type = 'sine';
                gain1.gain.setValueAtTime(0.3, now);
                gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc1.start(now);
                osc1.stop(now + 0.1);
                break;
                
            case 'merge':
                const pitch = 300 + (index * 50);
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.value = pitch;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.3, now);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc2.start(now);
                osc2.stop(now + 0.15);
                break;
        }
    } catch (e) {
        // Audio failed silently
    }
}

function updateScore(newScore) {
    score = newScore;
    scoreValues.forEach(el => {
        if (el) el.textContent = score;
    });
    
    if (score > bestScore) {
        bestScore = score;
        if (bestScoreValue) {
            bestScoreValue.textContent = bestScore;
        }
        localStorage.setItem('bestScore', bestScore.toString());
    }
}

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
    
    localStorage.setItem('playerName', playerName);
    nameModal.style.display = 'none';
    initGame();
});

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startButton.click();
    }
});

restartButton.addEventListener('click', () => {
    gameOverModal.style.display = 'none';
    
    if (game) {
        game.destroy(true);
    }
    
    resetGameState();
    initGame();
});

function resetGameState() {
    updateScore(0);
    gameOver = false;
    canDrop = true;
    clownBodies = [];
    currentClown = null;
    vanSprite = null;
}

function initGame() {
    resetGameState();
    
    const container = document.getElementById('gameCanvas');
    const maxWidth = Math.min(450, container.clientWidth);
    const maxHeight = Math.min(650, container.clientHeight);
    
    const config = {
        type: Phaser.AUTO,
        width: maxWidth,
        height: maxHeight,
        parent: 'gameCanvas',
        backgroundColor: '#000000',
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: 1.2 },
                debug: false,
                enableSleeping: false
            }
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    game = new Phaser.Game(config);
}

function preload() {
    CLOWNS.forEach((clown, index) => {
        this.load.image(`clown-${index}`, clown.image);
    });
    this.load.image('van', 'images/van.png');
    this.load.image('container', 'images/container.svg'); // Load container image
}

function create() {
    gameScene = this;
    
    const containerWidth = this.game.config.width;
    const containerHeight = this.game.config.height;
    
    // 3D Container dimensions (like Suika game)
    const boxWidth = containerWidth * 0.75;
    const boxHeight = containerHeight * 0.85;
    const boxX = containerWidth / 2;
    const boxY = containerHeight * 0.55;
    
    const wallThickness = 20;
    const topMargin = 80;
    
    // Create 3D-looking box container
    const graphics = this.make.graphics({ x: 0, y: 0, add: true });
    
    // Draw 3D box (front view with perspective)
    const halfWidth = boxWidth / 2;
    const halfHeight = boxHeight / 2;
    
    // Back shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRect(boxX - halfWidth + 5, boxY - halfHeight + 5, boxWidth, boxHeight);
    
    // Main box body - beige/tan color like Suika
    graphics.fillStyle(0xE8D4B8, 1);
    graphics.fillRect(boxX - halfWidth, boxY - halfHeight, boxWidth, boxHeight);
    
    // Top rim (darker)
    graphics.fillStyle(0xC4A882, 1);
    graphics.fillRect(boxX - halfWidth - 10, boxY - halfHeight - 15, boxWidth + 20, 20);
    
    // Top rim highlight
    graphics.fillStyle(0xF5E6D3, 0.6);
    graphics.fillRect(boxX - halfWidth - 8, boxY - halfHeight - 13, boxWidth + 16, 8);
    
    // Left wall shadow
    graphics.fillStyle(0x9B8565, 1);
    graphics.fillRect(boxX - halfWidth, boxY - halfHeight, wallThickness, boxHeight);
    
    // Right wall shadow
    graphics.fillStyle(0x9B8565, 1);
    graphics.fillRect(boxX + halfWidth - wallThickness, boxY - halfHeight, wallThickness, boxHeight);
    
    // Bottom floor
    graphics.fillStyle(0x8B7355, 1);
    graphics.fillRect(boxX - halfWidth, boxY + halfHeight - wallThickness, boxWidth, wallThickness);
    
    // 3D depth lines
    graphics.lineStyle(2, 0x6B5645, 0.5);
    graphics.strokeRect(boxX - halfWidth, boxY - halfHeight, boxWidth, boxHeight);
    
    // Inner highlight for 3D effect
    graphics.lineStyle(1, 0xFFFFFF, 0.2);
    graphics.strokeRect(boxX - halfWidth + 2, boxY - halfHeight + 2, boxWidth - 4, boxHeight - 4);
    
    // Physics walls - THICKER FLOOR TO PREVENT FALLING THROUGH
    const leftWall = this.matter.add.rectangle(
        boxX - halfWidth + wallThickness/2, 
        boxY, 
        wallThickness, 
        boxHeight + 100,
        { isStatic: true, friction: 0.8, restitution: 0.3 }
    );
    
    const rightWall = this.matter.add.rectangle(
        boxX + halfWidth - wallThickness/2, 
        boxY, 
        wallThickness, 
        boxHeight + 100,
        { isStatic: true, friction: 0.8, restitution: 0.3 }
    );
    
    // MUCH THICKER FLOOR with multiple segments to prevent tunneling
    const floorY = boxY + halfHeight - wallThickness/2;
    const floorThickness = wallThickness * 3; // Triple thickness
    
    const floor = this.matter.add.rectangle(
        boxX, 
        floorY, 
        boxWidth, 
        floorThickness,
        { isStatic: true, friction: 1, restitution: 0.1, slop: 0.01 }
    );
    
    // Extra safety floor below (invisible backup)
    const safetyFloor = this.matter.add.rectangle(
        boxX, 
        floorY + 30, 
        boxWidth, 
        50,
        { isStatic: true, friction: 1, restitution: 0 }
    );
    
    // Game over zone (visual depth limit)
    const dangerY = boxY - halfHeight + topMargin;
    
    // Store references
    gameScene.dangerY = dangerY;
    gameScene.containerWidth = containerWidth;
    gameScene.boxX = boxX;
    gameScene.boxY = boxY;
    gameScene.boxWidth = boxWidth;
    gameScene.boxHeight = boxHeight;
    gameScene.halfWidth = halfWidth;
    gameScene.halfHeight = halfHeight;
    gameScene.wallThickness = wallThickness;
    gameScene.playAreaLeft = boxX - halfWidth + wallThickness;
    gameScene.playAreaRight = boxX + halfWidth - wallThickness;
    
    // Initialize next clown
    nextClownType = Phaser.Math.Between(0, 4);
    updateNextPreview();
    
    // Spawn preview clown
    spawnPreviewClown.call(this);
    
    // Mouse movement for preview
    this.input.on('pointermove', (pointer) => {
        if (vanSprite && !gameOver && canDrop) {
            const clown = CLOWNS[nextClownType];
            const minX = gameScene.playAreaLeft + clown.size / 2 + 5;
            const maxX = gameScene.playAreaRight - clown.size / 2 - 5;
            vanSprite.x = Phaser.Math.Clamp(pointer.x, minX, maxX);
            if (currentClown) {
                currentClown.x = vanSprite.x;
            }
        }
    });
    
    // Click to drop
    this.input.on('pointerdown', () => {
        if (canDrop && !gameOver && currentClown) {
            dropClown.call(gameScene);
            playSound('drop');
        }
    });
    
    // Collision detection for merging
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach((pair) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            if (bodyA.gameObject && bodyB.gameObject) {
                handleClownCollision(bodyA.gameObject, bodyB.gameObject);
            }
        });
    });
}

function spawnPreviewClown() {
    if (gameOver) return;
    
    const clown = CLOWNS[nextClownType];
    const startX = gameScene.containerWidth / 2;
    const startY = gameScene.boxY - gameScene.halfHeight + 40;
    
    // Create van sprite
    if (!vanSprite) {
        vanSprite = gameScene.add.sprite(startX, startY - 35, 'van');
        vanSprite.setDisplaySize(60, 40);
        vanSprite.setDepth(1000);
    }
    
    // Create preview ball
    const preview = gameScene.add.sprite(startX, startY, `clown-${nextClownType}`);
    preview.setDisplaySize(clown.size, clown.size);
    preview.setAlpha(0.8);
    preview.setDepth(999);
    
    preview.clownType = nextClownType;
    preview.isPreview = true;
    preview.canMerge = true;
    
    currentClown = preview;
}

function updateNextPreview() {
    const nextClown = CLOWNS[nextClownType];
    const size = Math.min(50, nextClown.size);
    
    nextClownPreview.innerHTML = `
        <img src="${nextClown.image}" style="
            width: ${size}px; 
            height: ${size}px; 
            object-fit: contain;
            filter: drop-shadow(0 3px 8px rgba(0,0,0,0.3));
            border-radius: 50%;
        " alt="${nextClown.name}">
    `;
}

function dropClown() {
    if (!currentClown || !canDrop || gameOver) return;
    
    canDrop = false;
    
    const clownType = currentClown.clownType;
    const clown = CLOWNS[clownType];
    const x = currentClown.x;
    const y = gameScene.boxY - gameScene.halfHeight + 60;
    
    // Remove preview
    currentClown.destroy();
    currentClown = null;
    
    // Create physics ball with Matter.js
    const ball = gameScene.add.sprite(x, y, `clown-${clownType}`);
    ball.setDisplaySize(clown.size, clown.size);
    ball.setDepth(100);
    
    const radius = (clown.size / 2) * clown.hitboxScale;
    
    // Matter.js physics body
    const physicsBody = gameScene.matter.add.circle(x, y, radius, {
        restitution: 0.4,
        friction: 0.8,
        frictionAir: 0.01,
        density: 0.001,
        slop: 0.01
    });
    
    ball.setData('body', physicsBody);
    // Allow natural rotation for smooth physics
    
    ball.clownType = clownType;
    ball.canMerge = true;
    ball.dangerTimer = 0;
    ball.physicsBody = physicsBody;
    
    // Link sprite to physics body
    physicsBody.gameObject = ball;
    
    clownBodies.push(ball);
    
    // Prepare next clown
    const currentType = clownType;
    nextClownType = Phaser.Math.Between(0, Math.min(4, currentType + 1));
    updateNextPreview();
    
    // Allow dropping again
    gameScene.time.delayedCall(500, () => {
        if (!gameOver) {
            canDrop = true;
            spawnPreviewClown.call(gameScene);
        }
    });
}

function handleClownCollision(obj1, obj2) {
    if (!obj1 || !obj2 || gameOver) return;
    if (!obj1.active || !obj2.active) return;
    if (!obj1.canMerge || !obj2.canMerge) return;
    if (obj1.clownType !== obj2.clownType) return;
    if (obj1.clownType >= CLOWNS.length - 1) return;
    
    // Check if they're close enough to merge
    const distance = Phaser.Math.Distance.Between(obj1.x, obj1.y, obj2.x, obj2.y);
    const clown = CLOWNS[obj1.clownType];
    if (distance > clown.size * 1.2) return;
    
    obj1.canMerge = false;
    obj2.canMerge = false;
    
    const newType = obj1.clownType + 1;
    const newClown = CLOWNS[newType];
    
    const mergeX = (obj1.x + obj2.x) / 2;
    const mergeY = (obj1.y + obj2.y) / 2;
    
    // Play merge sound
    playSound('merge', newType);
    
    updateScore(score + newClown.score);
    
    // Remove old bodies
    const idx1 = clownBodies.indexOf(obj1);
    const idx2 = clownBodies.indexOf(obj2);
    if (idx1 > -1) clownBodies.splice(idx1, 1);
    if (idx2 > -1) clownBodies.splice(idx2, 1);
    
    if (obj1.physicsBody) gameScene.matter.world.remove(obj1.physicsBody);
    if (obj2.physicsBody) gameScene.matter.world.remove(obj2.physicsBody);
    
    obj1.destroy();
    obj2.destroy();
    
    // Create new merged ball
    const newBall = gameScene.add.sprite(mergeX, mergeY, `clown-${newType}`);
    newBall.setDisplaySize(newClown.size, newClown.size);
    newBall.setDepth(100);
    
    const radius = (newClown.size / 2) * newClown.hitboxScale;
    
    const physicsBody = gameScene.matter.add.circle(mergeX, mergeY, radius, {
        restitution: 0.4,
        friction: 0.8,
        frictionAir: 0.01,
        density: 0.001,
        slop: 0.01
    });
    
    gameScene.matter.body.setVelocity(physicsBody, { x: 0, y: -3 });
    // Allow natural rotation
    
    newBall.setData('body', physicsBody);
    newBall.clownType = newType;
    newBall.canMerge = true;
    newBall.dangerTimer = 0;
    newBall.physicsBody = physicsBody;
    
    physicsBody.gameObject = newBall;
    
    clownBodies.push(newBall);
}

function update() {
    if (gameOver) return;
    
    // Update sprite positions and rotation to match physics bodies
    clownBodies.forEach(ball => {
        if (ball && ball.active && ball.physicsBody) {
            ball.x = ball.physicsBody.position.x;
            ball.y = ball.physicsBody.position.y;
            ball.rotation = ball.physicsBody.angle; // Sync rotation with physics
        }
    });
    
    // Check for game over
    let dangerousClown = false;
    const dangerY = gameScene.dangerY;
    
    clownBodies.forEach(ball => {
        if (!ball || !ball.active || !ball.physicsBody) return;
        
        const velocity = ball.physicsBody.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const topY = ball.y - ball.displayHeight / 2;
        
        // If ball is above danger line and barely moving
        if (topY < dangerY && speed < 0.5) {
            if (!ball.dangerTimer) {
                ball.dangerTimer = 0;
            }
            ball.dangerTimer++;
            
            // Game over after 2 seconds (120 frames at 60fps)
            if (ball.dangerTimer > 120) {
                dangerousClown = true;
            }
        } else {
            ball.dangerTimer = 0;
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
    
    if (currentClown && currentClown.destroy) {
        currentClown.destroy();
        currentClown = null;
    }
    
    if (vanSprite && vanSprite.destroy) {
        vanSprite.destroy();
        vanSprite = null;
    }
    
    document.getElementById('finalScoreValue').textContent = score;
    gameOverModal.style.display = 'flex';
    
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
                <span class="rank-avatar">🤡</span>
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