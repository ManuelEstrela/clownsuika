// Clown Configuration with images
// hitboxScale: adjust this per clown for perfect hitbox matching (test with debug mode)
const CLOWNS = [
    { name: 'Tessa', size: 30, color: 0xFF6B6B, score: 1, image: 'images/tessa.png', hitboxScale: 1.92 },
    { name: 'Twinkles', size: 35, color: 0xFFA07A, score: 3, image: 'images/twinkles.png', hitboxScale: 2.32 },
    { name: 'Reina', size: 40, color: 0xFFD93D, score: 6, image: 'images/reina.png', hitboxScale: 2.45 },
    { name: 'Osvaldo', size: 45, color: 0x95E1D3, score: 10, image: 'images/osvaldo.png', hitboxScale: 2.71 },
    { name: 'Hazel', size: 50, color: 0x6BCB77, score: 15, image: 'images/hazel.png', hitboxScale: 2.77 },
    { name: 'Mumbles', size: 55, color: 0x4D96FF, score: 21, image: 'images/mumbles.png', hitboxScale: 2.81 },
    { name: 'Sneaky', size: 60, color: 0x9D84B7, score: 28, image: 'images/sneaky.png', hitboxScale: 3.42 },
    { name: 'Wendy', size: 65, color: 0xFF6FB5, score: 36, image: 'images/wendy.png', hitboxScale: 3.53 },
    { name: 'Chatty', size: 70, color: 0xF9A826, score: 45, image: 'images/chatty.png', hitboxScale: 3.67 },
    { name: 'Cups', size: 75, color: 0x00D9FF, score: 55, image: 'images/cups.png', hitboxScale: 3.82 },
    { name: 'Kirk', size: 80, color: 0xFF0080, score: 66, image: 'images/kirk.png', hitboxScale: 4.02 }
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
const scoreValue = document.getElementById('scoreValue');
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
    // Create audio context for game sounds
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Drop sound - short beep
        sounds.drop = audioContext;
        
        // Merge sounds - different pitches for different merges
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
    
    localStorage.setItem('playerName', playerName);
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
    
    if (game) {
        game.destroy(true);
    }
    
    resetGameState();
    initGame();
});

function resetGameState() {
    score = 0;
    gameOver = false;
    canDrop = true;
    clownBodies = [];
    currentClown = null;
    vanSprite = null;
    scoreValue.textContent = '0';
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
            default: 'arcade',
            arcade: {
                gravity: { y: 1000 },
                debug: true // ⭐ CHANGE THIS TO true TO SEE HITBOXES, false TO HIDE THEM
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
}

function create() {
    gameScene = this;
    
    const containerWidth = this.game.config.width;
    const containerHeight = this.game.config.height;
    const padding = 20;
    const wallThickness = 15;
    
    // Draw fancy container with shadow effect
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Outer shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillRect(padding + 3, padding + 3, containerWidth - padding * 2, containerHeight - padding * 2);
    
    // Main container body (gradient-like effect with layers)
    graphics.fillStyle(0x8B6F47, 1);
    graphics.fillRect(padding, padding, containerWidth - padding * 2, containerHeight - padding * 2);
    
    // Inner highlight
    graphics.fillStyle(0xA0815F, 0.6);
    graphics.fillRect(padding + 2, padding + 2, containerWidth - padding * 2 - 4, 8);
    
    // Border - beveled effect
    graphics.lineStyle(3, 0x5C4033, 1);
    graphics.strokeRect(padding, padding, containerWidth - padding * 2, containerHeight - padding * 2);
    
    graphics.lineStyle(1, 0xC4A57B, 0.4);
    graphics.strokeRect(padding + 2, padding + 2, containerWidth - padding * 2 - 4, containerHeight - padding * 2 - 4);
    
    graphics.generateTexture('boxContainer', containerWidth, containerHeight);
    graphics.destroy();
    
    const boxBG = this.add.image(containerWidth / 2, containerHeight / 2, 'boxContainer');
    boxBG.setDepth(0);
    
    // Create walls
    const walls = this.physics.add.staticGroup();
    
    const playAreaLeft = padding + wallThickness;
    const playAreaRight = containerWidth - padding - wallThickness;
    const playAreaTop = padding + wallThickness;
    const playAreaBottom = containerHeight - padding - wallThickness;
    
    // Left wall
    const leftWall = this.add.rectangle(playAreaLeft, containerHeight / 2, wallThickness, containerHeight, 0x654321);
    this.physics.add.existing(leftWall, true);
    walls.add(leftWall);
    
    // Right wall
    const rightWall = this.add.rectangle(playAreaRight, containerHeight / 2, wallThickness, containerHeight, 0x654321);
    this.physics.add.existing(rightWall, true);
    walls.add(rightWall);
    
    // Floor
    const floor = this.add.rectangle(containerWidth / 2, playAreaBottom, containerWidth, wallThickness, 0x654321);
    this.physics.add.existing(floor, true);
    walls.add(floor);
    
    // Danger line
    const dangerY = padding + 70;
    this.add.line(containerWidth / 2, dangerY, 0, 0, containerWidth - padding * 2, 0, 0xFF0000)
        .setLineWidth(2)
        .setOrigin(0, 0.5)
        .setDepth(100)
        .setAlpha(0.7);
    
    // Create physics group for clowns
    this.clownGroup = this.physics.add.group({
        collideWorldBounds: false,
        bounceX: 0.8,
        bounceY: 0.6
    });
    
    // Set up collisions
    this.physics.add.collider(this.clownGroup, walls);
    this.physics.add.collider(this.clownGroup, this.clownGroup, handleClownCollision, null, this);
    
    // Store references
    gameScene.walls = walls;
    gameScene.dangerY = dangerY;
    gameScene.containerWidth = containerWidth;
    gameScene.playAreaLeft = playAreaLeft;
    gameScene.playAreaRight = playAreaRight;
    gameScene.playAreaBottom = playAreaBottom;
    gameScene.padding = padding;
    
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
}

function spawnPreviewClown() {
    if (gameOver) return;
    
    const clown = CLOWNS[nextClownType];
    const startX = gameScene.containerWidth / 2;
    const startY = gameScene.padding + 50;
    
    // Create van sprite
    if (!vanSprite) {
        vanSprite = gameScene.add.sprite(startX, startY - 30, 'van');
        vanSprite.setDisplaySize(60, 40);
        vanSprite.setDepth(10);
    }
    
    // Create preview ball
    const preview = gameScene.add.sprite(startX, startY, `clown-${nextClownType}`);
    preview.setDisplaySize(clown.size, clown.size);
    preview.setAlpha(0.8);
    preview.setDepth(9);
    
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
    const y = gameScene.padding + 70;
    
    // Remove preview
    currentClown.destroy();
    currentClown = null;
    
    // Create physics ball
    const ball = gameScene.add.sprite(x, y, `clown-${clownType}`);
    ball.setDisplaySize(clown.size, clown.size);
    ball.setDepth(5);
    
    gameScene.physics.add.existing(ball);
    const radius = clown.size / 2;
    
    // ⭐ USE CUSTOM HITBOX SCALE PER CLOWN TYPE
    const hitboxRadius = radius * clown.hitboxScale;
    ball.body.setCircle(hitboxRadius);
    
    // Improved physics - based on Suika game
    ball.body.setBounce(0.9, 0.9);
    ball.body.setFriction(0.5, 0.5);
    ball.body.setAngularDrag(400);
    ball.body.setDrag(0.3);
    ball.body.setMaxVelocity(900, 1500);
    
    ball.clownType = clownType;
    ball.canMerge = true;
    ball.dangerTimer = 0;
    
    gameScene.clownGroup.add(ball);
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
    
    obj1.canMerge = false;
    obj2.canMerge = false;
    
    const newType = obj1.clownType + 1;
    const newClown = CLOWNS[newType];
    
    const mergeX = (obj1.x + obj2.x) / 2;
    const mergeY = (obj1.y + obj2.y) / 2;
    
    // Play merge sound
    playSound('merge', newType);
    
    score += newClown.score;
    scoreValue.textContent = score;
    
    if (score > bestScore) {
        bestScore = score;
        if (bestScoreValue) {
            bestScoreValue.textContent = bestScore;
        }
        localStorage.setItem('bestScore', bestScore.toString());
    }
    
    const idx1 = clownBodies.indexOf(obj1);
    const idx2 = clownBodies.indexOf(obj2);
    if (idx1 > -1) clownBodies.splice(idx1, 1);
    if (idx2 > -1) clownBodies.splice(idx2, 1);
    
    gameScene.clownGroup.remove(obj1);
    gameScene.clownGroup.remove(obj2);
    obj1.destroy();
    obj2.destroy();
    
    const newBall = gameScene.add.sprite(mergeX, mergeY, `clown-${newType}`);
    newBall.setDisplaySize(newClown.size, newClown.size);
    newBall.setDepth(5);
    
    gameScene.physics.add.existing(newBall);
    const radius = newClown.size / 2;
    
    // ⭐ USE CUSTOM HITBOX SCALE PER CLOWN TYPE (SAME AS dropClown)
    const hitboxRadius = radius * newClown.hitboxScale;
    newBall.body.setCircle(hitboxRadius);
    
    newBall.body.setBounce(0.9, 0.9);
    newBall.body.setFriction(0.5, 0.5);
    newBall.body.setAngularDrag(400);
    newBall.body.setDrag(0.3);
    newBall.body.setMaxVelocity(900, 1500);
    newBall.body.setVelocity(0, -100);
    
    newBall.clownType = newType;
    newBall.canMerge = true;
    newBall.dangerTimer = 0;
    
    gameScene.clownGroup.add(newBall);
    clownBodies.push(newBall);
}

function update() {
    if (gameOver) return;
    
    let dangerousClown = false;
    const dangerY = gameScene.dangerY || 120;
    
    clownBodies.forEach(ball => {
        if (!ball || !ball.active || !ball.body) return;
        
        const velocityY = Math.abs(ball.body.velocity.y);
        const topY = ball.y - ball.displayHeight / 2;
        
        if (topY < dangerY && velocityY < 15) {
            if (!ball.dangerTimer) {
                ball.dangerTimer = 0;
            }
            ball.dangerTimer++;
            
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