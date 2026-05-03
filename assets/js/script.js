/** =============================================================================
 *
 *  Project    : Google IO Experience
 *  File       : Game Engine (script.js)
 *  Created    : May 1, 2026
 *  Maintainer : Shubham Darda
 *  Purpose    : The central game engine governing the "Vibe & Shine" interactive
 *               experience, including physics, level generation, and game states.
 *
 * ============================================================================= **/

(function() {
    "use strict";

const canvas = document.getElementById('flowCanvas');
const ctx = canvas.getContext('2d');
const scoreValEl = document.getElementById('score-val');
const chancesValEl = document.getElementById('chances-val');
const uiEl = document.getElementById('hud');
const uiTextEl = document.getElementById('ui-text');

/** Global State Variables */
let width, height;
let blocks = [];
let shards = [];
let currentNumber = 10;
let remainingBlocksCount = 0;
let isTransitioning = false;
let consecutiveHits = 0;
let time = 0;
let score = 0;
let totalMisses = 0;
let gameStartTime = null;
let lastElapsedTotal = 0; // Integrity check
let launchReady = false;   // Gate to prevent accidental launch on first touch
let isGameOver = false;
let ballColor = '#ffffff';

/** Ball Configuration: Visual radius and physics state */
const ball = {
    x: 0, y: 0, vx: 0, vy: 0, radius: 12, active: false
};

const paddle = {
    width: 180, height: 12, x: 0, y: 0, baseWidth: 180
};

// Official Google I/O Palette (Blue, Red, Yellow, Green)
const palette = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

/**
 * Block Class: Represents the individual "beads" forming the countdown numbers.
 * Features modern glass-morphism and iridescent animation.
 */
class Block {
    constructor(x, y, size, isHard = false) {
        this.x = x;
        this.y = y;
        this.w = size;
        this.h = size;
        this.destroyed = false;
        this.isHard = isHard;
        // Distribute colors based on screen position for a mesh-gradient effect
        if (isHard) {
            this.colorIndex = -1;
            this.color = '#555'; // Darker grey for indestructible blocks
        } else {
            const index = Math.min(Math.floor((x / width) * palette.length), palette.length - 1);
            this.colorIndex = index >= 0 ? index : 0;
            this.color = palette[this.colorIndex];
        }
    }

    draw() {
        if (this.destroyed) return;
        // Using a high corner radius (almost a circle) for a modern "bead" look
        const x = this.x, y = this.y, w = this.w - 1, h = this.h - 1, r = w / 2;

        // 1. Base Body - Diagonal Gradient for a "mesh" depth look
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);

        const grad = ctx.createLinearGradient(x, y, x + w, y + h);

        if (this.isHard) {
            grad.addColorStop(0, this.color);
            grad.addColorStop(1, '#222');
        } else {
            // Gemini Iridescence: Blend with the next color in the palette
            const nextColor = palette[(this.colorIndex + 1) % palette.length];
            const shift = Math.sin(time + (this.x + this.y) * 0.01) * 0.5 + 0.5;

            grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)'); // Simplified Sheen
            grad.addColorStop(0.2, this.color);
            grad.addColorStop(shift, nextColor); // Shifting "AI energy" stop
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.3)'); // Depth
        }

        ctx.fillStyle = grad;
        ctx.fill();
    }
}

/**
 * Shard Class: Particle effect for block destruction.
 * Mimics glowing liquid energy when a block is "scratched".
 */
class Shard {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.color = color;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life * 0.8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

/**
 * Responsive Adjustment Logic:
 * Handles resizing of the drawing buffer and recalculates game object positions.
 */
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    // Dynamically scale paddle width to maintain a consistent challenge
    paddle.width = width < 600 ? width * 0.35 : width * 0.2;
    const minPaddleWidth = width < 600 ? 130 : 90;
    if (paddle.width < minPaddleWidth) paddle.width = minPaddleWidth;
    if (paddle.width > 220) paddle.width = 220; // Maximum size to keep desktop play challenging

    paddle.y = height - 50;
    // Center the paddle horizontally on refresh or resize
    paddle.x = (width - paddle.width) / 2;

    resetBall();
    generateGameLevel();
}

/** Resets the ball to the "sticky" launch position on the paddle */
function resetBall() {
    ball.active = false;
    launchReady = false;
    paddle.x = (width - paddle.width) / 2; // Center the paddle horizontally
    ball.x = width / 2;                   // Center the ball on the screen
    ball.y = paddle.y - ball.radius;
    ball.vx = 0;
    ball.vy = 0;
}

/**
 * Level Generator:
 * Uses a hidden canvas to sample the geometry of the current number/glyph
 * and populates the scene with exactly 2026 blocks.
 */
function generateGameLevel() {
    // Prevent re-generating blocks if the game has already concluded (e.g., on mobile resize)
    if (isGameOver) return;

    const offscreen = document.createElement('canvas');
    const octx = offscreen.getContext('2d');
    offscreen.width = width;
    offscreen.height = height;
    octx.fillStyle = 'white';

    // Responsive font size: use more horizontal space on mobile screens
    const isNarrow = width < 900;
    const fontSize = isNarrow ? Math.min(width * 0.7, height * 0.4) : Math.min(width * 0.4, height * 0.6);

    octx.font = `900 ${fontSize}px Arial`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText(currentNumber, width / 2, height / 2); // Center properly for better visibility

    const data = octx.getImageData(0, 0, width, height).data;
    const candidates = [];
    const targetCount = 2026; // Google I/O 2026 Theme
    blocks = [];
    const step = Math.floor(fontSize / 55); // Adjusted step to balance density and count

    // Grid-based scan to prevent overlapping
    // Centering the scan area to improve performance and clarity
    const startX = Math.max(0, width / 2 - fontSize * 0.6);
    const endX = Math.min(width, width / 2 + fontSize * 0.6);
    const startY = Math.max(0, height / 2 - fontSize * 0.6);
    const endY = Math.min(height, height / 2 + fontSize * 0.6);

    for (let y = startY; y < endY; y += step) {
        for (let x = startX; x < endX; x += step) {
            const pixelX = Math.floor(x);
            const pixelY = Math.floor(y);
            if (data[(pixelY * width + pixelX) * 4] > 128) {
                candidates.push({ x, y });
            }
        }
    }

    // Shuffle grid cells and pick 2026 unique ones
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const count = Math.min(candidates.length, targetCount);
    for (let i = 0; i < count; i++) {
        const p = candidates[i];
        blocks.push(new Block(p.x - step / 2, p.y - step / 2, step));
    }

    remainingBlocksCount = blocks.length;
    isTransitioning = false;
}

/** Fetches theme-aware colors from CSS variables */
function updateThemeColors() {
    ballColor = getComputedStyle(document.documentElement).getPropertyValue('--ball-color').trim() || '#ffffff';
}

/** Updates the UI Stat cards for Score and Chances */
function updateStatsDisplay() {
    // Display the cumulative dynamic score
    scoreValEl.textContent = Math.floor(score);

    // Timer Logic: Only update if the game is still running
    if (!isGameOver) {
        const elapsed = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;

        // Anti-Cheat: Detect if the time has been rolled back or jumped unnaturally
        if (elapsed < lastElapsedTotal) {
            location.reload(); // Force reset if tampering detected
        }
        lastElapsedTotal = elapsed;

        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        chancesValEl.textContent = `${mins}:${secs}`;
    }
}

/** State Transition: Progresses through the countdown sequence from 10 to 1, then Trophy */
function nextNumber() {
    isTransitioning = true;
    setTimeout(() => {
        if (currentNumber === 1) {
            currentNumber = "🏆";
            uiTextEl.textContent = "Shine the Trophy!";
            resetBall();
            generateGameLevel();
        } else if (currentNumber === "🏆") {
            // Final Victory State: Center message and hide game objects
            isGameOver = true;
            uiTextEl.textContent = "Welcome to I/O!";
            uiEl.classList.add('final-screen');
            blocks = [];
            remainingBlocksCount = 0;
            // We don't call generateGameLevel(), so isTransitioning remains true,
            // which disables further ball launches.
        } else {
            currentNumber--;
            uiTextEl.textContent = "Ignite Number " + currentNumber;
            resetBall();
            generateGameLevel();
        }
    }, 1000);
}

/** Input Handlers: Unified logic for Mouse and Touch interaction */
const handleMove = (clientX) => {
    paddle.x = Math.max(0, Math.min(width - paddle.width, clientX - paddle.width / 2));
    if (!ball.active) {
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - ball.radius;
    }
};

const handleAction = (isTouch = false) => {
    // Launches the ball if it is currently docked on the paddle
    if (!ball.active && !isTransitioning) {
        // UX Improvement: Only require a second tap on touch devices to allow positioning.
        // Mouse users can position without clicking, so they don't need this gate.
        if (isTouch && !launchReady) {
            launchReady = true;
            if (currentNumber !== "🏆") {
                uiTextEl.textContent = "Paddle Set. Tap to Ignite!";
            }
            return;
        }

        if (!gameStartTime) gameStartTime = Date.now();
        ball.active = true;
        launchReady = false;

        if (currentNumber !== "🏆") {
            uiTextEl.textContent = "Vibe & Shine: " + currentNumber;
        }

        ball.vx = (Math.random() - 0.5) * 8;
        ball.vy = -12 * (1 + consecutiveHits * 0.05); // Increased dynamic launch speed
    }
};

window.addEventListener('mousemove', e => handleMove(e.clientX));
window.addEventListener('touchmove', e => {
    handleMove(e.touches[0].clientX);
    if (e.cancelable) e.preventDefault();
}, { passive: false });

window.addEventListener('mousedown', () => handleAction(false));
window.addEventListener('touchstart', () => handleAction(true));

// Anti-fraud measures: Prevent right-click, selection events, and dragging
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('selectstart', e => e.preventDefault());
window.addEventListener('dragstart', e => e.preventDefault());

// Disable common DevTools shortcuts (F12, Ctrl+Shift+I, etc.)
window.addEventListener('keydown', e => {
    if (e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
        (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
    }
});

/** Initialization Routine */
function init() {
    updateThemeColors();
    // Listen for system theme changes in real-time
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', updateThemeColors);
    resize();
    animate();
}

/** Renders the I/O Prismatic Paddle */
function drawPaddle() {
    // Prismatic Google Gradient for the paddle
    const grad = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.width, 0);
    grad.addColorStop(0, palette[0]);    // Blue
    grad.addColorStop(0.33, palette[1]); // Red
    grad.addColorStop(0.66, palette[2]); // Yellow
    grad.addColorStop(1, palette[3]);    // Green

    ctx.fillStyle = grad;
    ctx.shadowBlur = 25;
    ctx.shadowColor = 'rgba(66, 133, 244, 0.4)';
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
}

/** Renders the ambient shifting mesh background */
function drawAmbientGlow() {
    // Create a slow-moving background mesh effect using I/O colors
    const centerX = width / 2 + Math.sin(time * 0.5) * 100;
    const centerY = height / 2 + Math.cos(time * 0.5) * 100;

    const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width);
    bgGrad.addColorStop(0, 'rgba(66, 133, 244, 0.08)'); // Blue
    bgGrad.addColorStop(0.33, 'rgba(234, 67, 53, 0.05)'); // Red
    bgGrad.addColorStop(0.66, 'rgba(251, 188, 5, 0.03)'); // Yellow
    bgGrad.addColorStop(1, 'rgba(52, 168, 83, 0)'); // Green (Fade to dark)

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
}

/**
 * Main Game Loop:
 * 1. Clears frame
 * 2. Updates physics (Ball & Shards)
 * 3. Handles Collision Detection (Paddle & Blocks)
 */
function animate() {
    // Completely clear the canvas for a crisp background without motion trails
    ctx.clearRect(0, 0, width, height);

    // Draw subtle background energy
    drawAmbientGlow();

    // Draw Blocks
    blocks.forEach(b => b.draw());

    // Shards
    shards = shards.filter(s => s.life > 0);
    shards.forEach(s => { s.update(); s.draw(); });

    if (!isGameOver) {
        drawPaddle();

        // Ball
        if (ball.active) {
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall collisions
            if (ball.x <= 0 || ball.x >= width) ball.vx *= -1; // Left/Right walls
            if (ball.y <= 0) { // Top wall
                ball.vy = Math.abs(ball.vy); // Ensure it bounces down
            }

            // Paddle collision
            if (ball.y + ball.radius >= paddle.y &&
                ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.vy > 0) {
                consecutiveHits++;
                // Increase speed factor by 5% per successful catch
                const speedFactor = 1 + (consecutiveHits * 0.05);
                ball.vy = -Math.abs(ball.vy) * 1.05; // Incremental speed boost
                ball.vx = (ball.x - (paddle.x + paddle.width / 2)) * 0.2 * speedFactor;
                ball.y = paddle.y - ball.radius - 1; // Prevent multi-collision sticking
            }

            // Speed cap to keep the game from getting too frantic
            const dynamicMaxSpeed = 18 + (consecutiveHits * 0.5);
            if (Math.abs(ball.vx) > dynamicMaxSpeed) ball.vx = dynamicMaxSpeed * Math.sign(ball.vx);
            if (Math.abs(ball.vy) > dynamicMaxSpeed) ball.vy = dynamicMaxSpeed * Math.sign(ball.vy);

            // Block collisions
            // Iterate over blocks in reverse to safely remove/modify elements
            for (let i = blocks.length - 1; i >= 0; i--) {
                let b = blocks[i];
                // Check for collision with a proximity buffer to "scratch" nearby blocks
                const proximityBuffer = 6; // Reduced for more precise hit detection
                if (!b.destroyed &&
                    ball.x + ball.radius + proximityBuffer > b.x && ball.x - ball.radius - proximityBuffer < b.x + b.w &&
                    ball.y + ball.radius + proximityBuffer > b.y && ball.y - ball.radius - proximityBuffer < b.y + b.h) {

                    // Penetrating Logic: Ball destroys blocks but keeps its trajectory
                    // Scaled blast radius based on screen width to ensure consistent gameplay across devices
                    const baseBlast = width * 0.07; // Significantly reduced to prolong gameplay
                    let blastRadius = baseBlast;
                    if (remainingBlocksCount < blocks.length * 0.3) blastRadius = baseBlast * 1.6; // Reduced late-game boost
                    if (remainingBlocksCount <= 10) blastRadius = width * 0.4; // Controlled finisher

                    const hitX = b.x + b.w / 2;
                    const hitY = b.y + b.h / 2;

                    // Scratch multiple blocks in the vicinity
                    blocks.forEach(other => {
                        if (!other.destroyed) {
                            const dx = (other.x + other.w / 2) - hitX;
                            const dy = (other.y + other.h / 2) - hitY;
                            const distSq = dx * dx + dy * dy;

                            if (distSq < blastRadius * blastRadius) {
                                other.destroyed = true;
                                remainingBlocksCount--;

                                // Performance Scoring: 1 mark per block + small streak bonus
                                score += 1 + Math.floor(consecutiveHits / 10);

                                // Create visual shards for each collateral block
                                for (let k = 0; k < 2; k++) shards.push(new Shard(other.x, other.y, other.color));
                            }
                        }
                    });
                    updateStatsDisplay();

                    // Notice: No ball.vy flip here! The ball continues its path.
                    // No 'break' either, allowing the ball to hit multiple blocks in one frame.
                }
            }

            // Ball lost
            if (ball.y > height) {
                totalMisses++;
                // Scaling Penalty: The penalty increases by 20 for every miss (20, 40, 60...)
                const currentPenalty = 20 * totalMisses;
                score = Math.max(0, score - currentPenalty);
                consecutiveHits = 0; // Streak reset is the primary penalty for missing
                resetBall();
            }
        }

        // Draw Ball
        ctx.fillStyle = ballColor;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Win condition
    if (blocks.length > 0 && remainingBlocksCount <= 0 && !isTransitioning) {
        nextNumber();
    }

    // Refresh HUD metrics every frame to keep the timer ticking smoothly
    updateStatsDisplay();

    time += 0.02; // Drive the iridescent shimmer
    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
init();

})();
