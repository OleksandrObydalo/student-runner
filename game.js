// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_HEIGHT = 30;
const OBSTACLE_SPEED_INITIAL = 6;
const OBSTACLE_INTERVAL_MIN = 800;
const OBSTACLE_INTERVAL_MAX = 2000;
const EXAM_SESSION_DURATION = 10000; // 10 seconds
const EXAM_SESSION_INTERVAL = 30000; // 30 seconds

// Game state
let canvas, ctx;
let gameRunning = false;
let score = 0;
let knowledge = 0;
let semester = 1;
let speedMultiplier = 1;
let lastObstacleTime = 0;
let nextObstacleTime = 0;
let lastFrameTime = 0;
let examSessionActive = false;
let examSessionTimeout;
let examSessionInterval;
let selectedCharacter = 'stem';

// Game objects
let player;
let obstacles = [];
let bonuses = [];
let ground;
let backgrounds = [];

// Sounds
let jumpSound;
let collisionSound;
let bonusSound;
let examSessionSound;
let bgMusic;

class Player {
    constructor() {
        this.width = 30;
        this.height = 50;
        this.x = 50;
        this.y = canvas.height - GROUND_HEIGHT - this.height;
        this.vy = 0;
        this.jumping = false;
        this.crouching = false;
        this.invulnerable = false;
        this.invulnerableTime = 0;

        // Character-specific attributes
        switch (selectedCharacter) {
            case 'stem':
                this.jumpForceMultiplier = 1.2;
                this.recoverySpeed = 1;
                this.maxStamina = 1;
                break;
            case 'humanities':
                this.jumpForceMultiplier = 1;
                this.recoverySpeed = 1.5;
                this.maxStamina = 1;
                break;
            case 'medical':
                this.jumpForceMultiplier = 1;
                this.recoverySpeed = 1;
                this.maxStamina = 1.5;
                break;
            default:
                this.jumpForceMultiplier = 1;
                this.recoverySpeed = 1;
                this.maxStamina = 1;
        }
    }

    jump() {
        if (!this.jumping) {
            this.vy = JUMP_FORCE * this.jumpForceMultiplier;
            this.jumping = true;
            this.crouching = false;
            playSound(jumpSound);
        }
    }

    crouch() {
        if (!this.jumping) {
            this.crouching = true;
            this.height = 25; // Reduce height when crouching
        }
    }

    standUp() {
        if (this.crouching) {
            this.crouching = false;
            this.height = 50; // Restore original height
        }
    }

    update(deltaTime) {
        // Apply gravity
        this.vy += GRAVITY;
        this.y += this.vy;

        // Check ground collision
        if (this.y > canvas.height - GROUND_HEIGHT - this.height) {
            this.y = canvas.height - GROUND_HEIGHT - this.height;
            this.vy = 0;
            this.jumping = false;
        }

        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerableTime -= deltaTime;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
            }
        }
    }

    draw() {
        ctx.save();
        
        // Draw player with blinking effect when invulnerable
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Draw different sprites based on character type
        let color;
        switch (selectedCharacter) {
            case 'stem':
                color = 'blue';
                break;
            case 'humanities':
                color = 'purple';
                break;
            case 'medical':
                color = 'green';
                break;
            default:
                color = 'blue';
        }
        
        ctx.fillStyle = color;
        
        // Draw different pose based on state
        if (this.crouching) {
            // Crouching pose
            ctx.fillRect(this.x, this.y + 25, this.width, this.height);
        } else if (this.jumping) {
            // Jumping pose
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else {
            // Running pose - basic animation
            const legOffset = Math.sin(Date.now() / 100) * 5;
            ctx.fillRect(this.x, this.y, this.width, this.height - 10);
            ctx.fillRect(this.x + 5, this.y + this.height - 10, 8, 10 + legOffset);
            ctx.fillRect(this.x + 18, this.y + this.height - 10, 8, 10 - legOffset);
        }
        
        ctx.restore();
    }
}

class Obstacle {
    constructor(type) {
        this.type = type;
        this.x = canvas.width;
        
        // Set dimensions based on obstacle type
        switch (type) {
            case 'lab':
                this.width = 30;
                this.height = 30;
                this.y = canvas.height - GROUND_HEIGHT - this.height;
                this.flying = false;
                break;
            case 'test':
                this.width = 25;
                this.height = 40;
                this.y = canvas.height - GROUND_HEIGHT - this.height;
                this.flying = false;
                break;
            case 'project':
                this.width = 20;
                this.height = 60;
                this.y = canvas.height - GROUND_HEIGHT - this.height;
                this.flying = false;
                break;
            case 'exam':
                this.width = 30;
                this.height = 70;
                this.y = canvas.height - GROUND_HEIGHT - this.height;
                this.flying = false;
                break;
            case 'flying':
                this.width = 40;
                this.height = 20;
                this.y = canvas.height - GROUND_HEIGHT - 40 - this.height; // Flying obstacle
                this.flying = true;
                break;
        }
    }

    update(deltaTime) {
        const speed = OBSTACLE_SPEED_INITIAL * speedMultiplier * (examSessionActive ? 1.5 : 1);
        this.x -= speed;
    }

    draw() {
        ctx.fillStyle = this.getColor();
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add some details based on obstacle type
        switch (this.type) {
            case 'lab':
                // Lab equipment details
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x + 10, this.y + 10, 10, 5);
                // Add label
                ctx.fillStyle = 'black';
                ctx.font = '7px Arial';
                ctx.fillText('LAB', this.x + 5, this.y - 5);
                break;
            case 'test':
                // Test paper details
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x + 5, this.y + 5, 15, 20);
                ctx.fillStyle = 'black';
                ctx.fillRect(this.x + 8, this.y + 8, 9, 2);
                ctx.fillRect(this.x + 8, this.y + 12, 9, 2);
                // Add label
                ctx.font = '7px Arial';
                ctx.fillText('TEST', this.x + 2, this.y - 5);
                break;
            case 'project':
                // Project folder details
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x + 3, this.y + 10, 14, 40);
                // Add label
                ctx.fillStyle = 'black';
                ctx.font = '7px Arial';
                ctx.fillText('PROJECT', this.x - 3, this.y - 5);
                break;
            case 'exam':
                // Exam booklet details
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x + 5, this.y + 5, 20, 60);
                ctx.fillStyle = 'black';
                for (let i = 0; i < 10; i++) {
                    ctx.fillRect(this.x + 8, this.y + 10 + (i * 6), 14, 1);
                }
                // Add label
                ctx.font = '7px Arial';
                ctx.fillText('EXAM', this.x + 2, this.y - 5);
                break;
            case 'flying':
                // Flying object (professor or textbook)
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x + 5, this.y + 5, 30, 10);
                // Add label
                ctx.fillStyle = 'black';
                ctx.font = '7px Arial';
                ctx.fillText('CHEAT SHEET', this.x - 5, this.y - 5);
                break;
        }
    }

    getColor() {
        switch (this.type) {
            case 'lab': return 'green';
            case 'test': return 'yellow';
            case 'project': return 'orange';
            case 'exam': return 'red';
            case 'flying': return 'purple';
            default: return 'gray';
        }
    }

    checkCollision(player) {
        // Skip collision check if player is invulnerable
        if (player.invulnerable) return false;
        
        // Adjust hitbox for crouching
        const playerHitboxY = player.y;
        const playerHitboxHeight = player.height;
        
        // Check if this obstacle overlaps with player
        return (
            this.x < player.x + player.width &&
            this.x + this.width > player.x &&
            this.y < playerHitboxY + playerHitboxHeight &&
            this.y + this.height > playerHitboxY
        );
    }
}

class Bonus {
    constructor(type) {
        this.type = type;
        this.width = 20;
        this.height = 20;
        this.x = canvas.width;
        this.y = canvas.height - GROUND_HEIGHT - this.height - Math.random() * 100;
        
        // Set attributes based on bonus type
        switch (type) {
            case 'coffee':
                this.color = 'brown';
                this.duration = 5000; // 5 seconds of speed boost
                break;
            case 'cheatsheet':
                this.color = 'gold';
                this.duration = 8000; // 8 seconds of invulnerability
                break;
            case 'notes':
                this.color = 'cyan';
                this.value = 50; // Points to add
                break;
        }
    }

    update(deltaTime) {
        const speed = OBSTACLE_SPEED_INITIAL * speedMultiplier;
        this.x -= speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add some details based on bonus type
        switch (this.type) {
            case 'coffee':
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x + 12, this.y + 5, 4, 8);
                break;
            case 'cheatsheet':
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x + 5, this.y + 5, 10, 10);
                break;
            case 'notes':
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x + 5, this.y + 5, 10, 2);
                ctx.fillRect(this.x + 5, this.y + 9, 10, 2);
                ctx.fillRect(this.x + 5, this.y + 13, 10, 2);
                break;
        }
    }

    checkCollision(player) {
        return (
            this.x < player.x + player.width &&
            this.x + this.width > player.x &&
            this.y < player.y + player.height &&
            this.y + this.height > player.y
        );
    }

    applyEffect(player) {
        playSound(bonusSound);
        
        switch (this.type) {
            case 'coffee':
                speedMultiplier *= 1.5;
                setTimeout(() => {
                    speedMultiplier /= 1.5;
                }, this.duration);
                break;
            case 'cheatsheet':
                player.invulnerable = true;
                player.invulnerableTime = this.duration;
                break;
            case 'notes':
                score += this.value;
                knowledge += 5;
                updateUI();
                break;
        }
    }
}

class Background {
    constructor(level) {
        this.level = level;
        this.width = canvas.width;
        this.height = canvas.height;
        this.x = 0;
        this.elements = this.generateElements();
    }
    
    generateElements() {
        const elements = [];
        
        // Add different elements based on semester level
        switch (this.level) {
            case 1: // First semester - Classrooms
                for (let i = 0; i < 3; i++) {
                    elements.push({
                        type: 'window',
                        x: 100 + i * 200,
                        y: 50,
                        width: 50,
                        height: 50
                    });
                }
                break;
            case 2: // Second semester - Library
                for (let i = 0; i < 5; i++) {
                    elements.push({
                        type: 'bookshelf',
                        x: 80 + i * 150,
                        y: 40,
                        width: 80,
                        height: 120
                    });
                }
                break;
            case 3: // Third semester - Dormitories
                for (let i = 0; i < 3; i++) {
                    elements.push({
                        type: 'bed',
                        x: 120 + i * 250,
                        y: 160,
                        width: 80,
                        height: 30
                    });
                    elements.push({
                        type: 'desk',
                        x: 220 + i * 250,
                        y: 150,
                        width: 60,
                        height: 40
                    });
                }
                break;
            default: // Higher semesters - Mix of environments
                for (let i = 0; i < 4; i++) {
                    elements.push({
                        type: i % 2 === 0 ? 'computer' : 'plant',
                        x: 100 + i * 180,
                        y: i % 2 === 0 ? 140 : 160,
                        width: 40,
                        height: i % 2 === 0 ? 30 : 50
                    });
                }
        }
        
        return elements;
    }
    
    update(deltaTime) {
        // Move background at half the speed of obstacles
        const speed = OBSTACLE_SPEED_INITIAL * speedMultiplier * 0.5;
        this.x -= speed;
        
        // Reset position when it's fully off-screen
        if (this.x <= -this.width) {
            this.x = 0;
            // Regenerate elements when background loops
            this.elements = this.generateElements();
        }
    }
    
    draw() {
        // Draw background color based on semester
        switch (this.level) {
            case 1:
                ctx.fillStyle = '#e8e8e8'; // Classroom - light gray
                break;
            case 2:
                ctx.fillStyle = '#d8c9aa'; // Library - beige
                break;
            case 3:
                ctx.fillStyle = '#b8d0e8'; // Dormitory - light blue
                break;
            default:
                ctx.fillStyle = '#d8e8d8'; // Higher semesters - light green
        }
        
        // Draw two copies of the background for seamless scrolling
        ctx.fillRect(this.x, 0, this.width, this.height);
        ctx.fillRect(this.x + this.width, 0, this.width, this.height);
        
        // Draw background elements
        for (const element of this.elements) {
            this.drawElement(element, this.x);
            this.drawElement(element, this.x + this.width);
        }
    }
    
    drawElement(element, offsetX) {
        switch (element.type) {
            case 'window':
                ctx.fillStyle = '#87ceeb';
                ctx.fillRect(offsetX + element.x, element.y, element.width, element.height);
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 3;
                ctx.strokeRect(offsetX + element.x, element.y, element.width, element.height);
                ctx.strokeRect(offsetX + element.x, element.y, element.width/2, element.height/2);
                ctx.strokeRect(offsetX + element.x + element.width/2, element.y, element.width/2, element.height/2);
                break;
            case 'bookshelf':
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(offsetX + element.x, element.y, element.width, element.height);
                // Draw books
                for (let i = 0; i < 5; i++) {
                    for (let j = 0; j < 3; j++) {
                        ctx.fillStyle = ['#f00', '#0f0', '#00f', '#ff0', '#f0f'][Math.floor(Math.random() * 5)];
                        ctx.fillRect(offsetX + element.x + 5 + j * 25, element.y + 5 + i * 23, 20, 18);
                    }
                }
                break;
            case 'bed':
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(offsetX + element.x, element.y, element.width, element.height);
                ctx.fillStyle = '#fff';
                ctx.fillRect(offsetX + element.x + 5, element.y - 10, element.width - 10, 10);
                break;
            case 'desk':
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(offsetX + element.x, element.y, element.width, element.height);
                ctx.fillStyle = '#ddd';
                ctx.fillRect(offsetX + element.x + 10, element.y - 5, 20, 5);
                break;
            case 'computer':
                ctx.fillStyle = '#333';
                ctx.fillRect(offsetX + element.x, element.y, element.width, element.height);
                ctx.fillStyle = '#6cf';
                ctx.fillRect(offsetX + element.x + 5, element.y + 5, element.width - 10, element.height - 10);
                break;
            case 'plant':
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(offsetX + element.x + 15, element.y + 30, 10, 20);
                ctx.fillStyle = '#0a0';
                ctx.beginPath();
                ctx.arc(offsetX + element.x + 20, element.y + 20, 20, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
}

// Game initialization
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 300;
    
    // Load sounds
    jumpSound = new Audio('https://assets.codepen.io/21542/howler-push.mp3');
    collisionSound = new Audio('https://assets.codepen.io/21542/howler-sfx.mp3');
    bonusSound = new Audio('https://assets.codepen.io/21542/howler-coin.mp3');
    examSessionSound = new Audio('https://assets.codepen.io/21542/howler-power-up.mp3');
    bgMusic = new Audio('https://assets.codepen.io/21542/howler-bling.mp3');
    bgMusic.loop = true;
    
    // Menu and UI setup
    setupEventListeners();
    document.querySelectorAll('.character').forEach(char => {
        if (!char.classList.contains('locked')) {
            char.addEventListener('click', () => {
                document.querySelector('.character.selected').classList.remove('selected');
                char.classList.add('selected');
                selectedCharacter = char.dataset.type;
            });
        }
    });
    
    // Button for using cheatsheet to continue
    document.getElementById('use-cheatsheet').addEventListener('click', () => {
        if (knowledge >= 50) {
            knowledge -= 50;
            continueGame();
        }
    });
    
    // Show the menu screen
    document.getElementById('menu').classList.remove('hidden');
}

function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            if (!gameRunning) {
                startGame();
            } else {
                player.jump();
            }
        } else if (e.code === 'ArrowDown') {
            if (gameRunning) {
                player.crouch();
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowDown') {
            if (gameRunning) {
                player.standUp();
            }
        }
    });
    
    // Touch controls
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameRunning) {
            startGame();
        } else {
            const touch = e.touches[0];
            const touchY = touch.clientY;
            if (touchY > canvas.height / 2) {
                player.crouch();
            } else {
                player.jump();
            }
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (gameRunning) {
            player.standUp();
        }
    });
}

function startGame() {
    // Reset game state
    gameRunning = true;
    score = 0;
    semester = 1;
    speedMultiplier = 1;
    obstacles = [];
    bonuses = [];
    lastObstacleTime = 0;
    nextObstacleTime = 0;
    examSessionActive = false;
    
    // Create player
    player = new Player();
    
    // Create ground
    ground = {
        x: 0,
        y: canvas.height - GROUND_HEIGHT,
        width: canvas.width,
        height: GROUND_HEIGHT
    };
    
    // Create backgrounds for different semesters
    backgrounds = [
        new Background(1),
        new Background(2),
        new Background(3),
        new Background(4)
    ];
    
    // Start exam session timer
    examSessionInterval = setInterval(startExamSession, EXAM_SESSION_INTERVAL);
    
    // Hide menu, show game UI
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    
    // Start background music
    bgMusic.play();
    
    // Start game loop
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    // Calculate delta time
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw background
    backgrounds[semester - 1].update(deltaTime);
    backgrounds[semester - 1].draw();
    
    // Update and draw ground
    drawGround();
    
    // Spawn obstacles
    if (timestamp - lastObstacleTime > nextObstacleTime) {
        spawnObstacle();
        lastObstacleTime = timestamp;
        nextObstacleTime = getRandomInterval();
    }
    
    // Random chance to spawn bonus
    if (Math.random() < 0.002) {
        spawnBonus();
    }
    
    // Update and draw player
    player.update(deltaTime);
    player.draw();
    
    // Update and draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.update(deltaTime);
        obstacle.draw();
        
        // Check collision with player
        if (obstacle.checkCollision(player)) {
            gameOver();
            return;
        }
        
        // Remove obstacles that are off-screen
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
        }
    }
    
    // Update and draw bonuses
    for (let i = bonuses.length - 1; i >= 0; i--) {
        const bonus = bonuses[i];
        bonus.update(deltaTime);
        bonus.draw();
        
        // Check collision with player
        if (bonus.checkCollision(player)) {
            bonus.applyEffect(player);
            bonuses.splice(i, 1);
        }
        
        // Remove bonuses that are off-screen
        if (bonus.x + bonus.width < 0) {
            bonuses.splice(i, 1);
        }
    }
    
    // Update score
    score += speedMultiplier * 0.1;
    
    // Check for semester advancement
    if (score > semester * 1000) {
        advanceSemester();
    }
    
    // Update UI
    updateUI();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

function drawGround() {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
    // Draw ground details
    ctx.fillStyle = '#0a0';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 5);
    
    // Draw ground tiling pattern
    ctx.fillStyle = '#765432';
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.fillRect(i, canvas.height - GROUND_HEIGHT + 10, 10, 3);
    }
}

function spawnObstacle() {
    const obstacleTypes = ['lab', 'test', 'project', 'exam', 'flying'];
    let typeIndex;
    
    // Higher chance of difficult obstacles during exam session
    if (examSessionActive) {
        typeIndex = Math.floor(Math.random() * 5);
    } else {
        typeIndex = Math.floor(Math.random() * 3); // Normal gameplay focuses on easier obstacles
    }
    
    obstacles.push(new Obstacle(obstacleTypes[typeIndex]));
}

function spawnBonus() {
    const bonusTypes = ['coffee', 'cheatsheet', 'notes'];
    const typeIndex = Math.floor(Math.random() * bonusTypes.length);
    bonuses.push(new Bonus(bonusTypes[typeIndex]));
}

function getRandomInterval() {
    const baseInterval = Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN) + OBSTACLE_INTERVAL_MIN;
    // During exam session, obstacles appear more frequently
    return examSessionActive ? baseInterval * 0.6 : baseInterval;
}

function startExamSession() {
    if (!gameRunning) return;
    
    examSessionActive = true;
    playSound(examSessionSound);
    
    // Show exam session alert
    const alertElement = document.getElementById('exam-session-alert');
    alertElement.classList.remove('hidden');
    
    // Hide alert after 2 seconds
    setTimeout(() => {
        alertElement.classList.add('hidden');
    }, 2000);
    
    // End exam session after duration
    examSessionTimeout = setTimeout(() => {
        examSessionActive = false;
    }, EXAM_SESSION_DURATION);
}

function advanceSemester() {
    semester++;
    if (semester > 4) semester = 4; // Max 4 semesters
    
    // Increase difficulty
    speedMultiplier += 0.2;
}

function updateUI() {
    document.getElementById('score').textContent = Math.floor(score);
    document.getElementById('knowledge').textContent = knowledge;
    document.getElementById('semester').textContent = semester;
}

function gameOver() {
    gameRunning = false;
    playSound(collisionSound);
    bgMusic.pause();
    bgMusic.currentTime = 0;
    
    // Stop exam session timers
    clearTimeout(examSessionTimeout);
    clearInterval(examSessionInterval);
    
    // Show game over screen
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = Math.floor(score);
    
    // Update the continue button based on available knowledge
    const continueButton = document.getElementById('use-cheatsheet');
    if (knowledge >= 50) {
        continueButton.classList.remove('disabled');
    } else {
        continueButton.classList.add('disabled');
    }
}

function continueGame() {
    // Resume game from where it left off
    gameRunning = true;
    
    // Make player temporarily invulnerable
    player.invulnerable = true;
    player.invulnerableTime = 3000;
    
    // Restart exam session timer
    examSessionInterval = setInterval(startExamSession, EXAM_SESSION_INTERVAL);
    
    // Hide game over screen, show game UI
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    
    // Resume background music
    bgMusic.play();
    
    // Continue game loop
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function playSound(sound) {
    // Reset sound to beginning and play
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Sound play failed:", e));
}

// Initialize game when the page loads
window.onload = init;