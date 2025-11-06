
//board
let board;
let boardWidth = 480; //increased from 360 for easier gameplay
let boardHeight = 720; //increased from 640 for more space
let context;

//bird
let birdWidth = 60; //increased size for better visibility
let birdHeight = 60;
let birdX = boardWidth/8;
let birdY = boardHeight/2;
let birdImg;
let birdRotation = 0;

// Bird animation
let birdImages = [];
let birdFrame = 0;
let frameCount = 0;

let bird = {
    x : birdX,
    y : birdY,
    width : birdWidth,
    height : birdHeight
}

//pipes
let pipeArray = [];
let pipeWidth = 80; //increased width for Diluc pillar
let pipeHeight = 400; //height for Diluc pillar without stretching
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//game over image
let youLostImg;

//physics
let velocityX = -0.6; //pipes moving left speed (very slow for easy gameplay)
let baseVelocityX = -0.6; //base speed for difficulty scaling
let velocityY = 0; //bird jump speed
let gravity = 0.12; //very low gravity for easy control

let gameOver = false;
let score = 0;
let highScore = 0;

//game state
let gameStarted = false;

//visual effects
let scoreFlash = 0; // For score animation

//audio
let audioContext;
let soundEnabled = true;
let bgMusic;
let dieSound;

window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d"); //used for drawing on the board

    //draw flappy bird
    // context.fillStyle = "green";
    // context.fillRect(bird.x, bird.y, bird.width, bird.height);

    //load bird image (wink character)
    birdImg = new Image();
    birdImg.src = "./wink_flappy.png";
    birdImg.onload = function() {
        context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    }

    topPipeImg = new Image();
    topPipeImg.src = "./diluc_pillar.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./diluc_pillar.png";

    youLostImg = new Image();
    youLostImg.src = "./you_lost.png";

    requestAnimationFrame(update);
    setInterval(placePipes, 2200); //every 2.2 seconds (much more time between pipes)

    // Desktop controls
    document.addEventListener("keydown", moveBird);

    // Mobile/Touch controls - prevent default to avoid scrolling
    document.addEventListener("touchstart", function(e) {
        e.preventDefault();
        moveBird(e);
    }, { passive: false });

    // Click controls
    document.addEventListener("click", moveBird);

    // Load high score from localStorage
    highScore = localStorage.getItem("flappyBirdHighScore") || 0;

    // Initialize audio context
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log("Web Audio API not supported");
        soundEnabled = false;
    }

    // Load background music and die sound
    bgMusic = new Audio("./bg_sound.wav");
    bgMusic.loop = true; // Enable looping
    bgMusic.volume = 0.3; // Set volume to 30%

    dieSound = new Audio("./die_sound.wav");
    dieSound.loop = true; // Loop the meme song
    dieSound.volume = 0.4; // Set volume to 40%
}

// Sound effect functions
function playJumpSound() {
    if (!soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 400;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playScoreSound() {
    if (!soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

function playGameOverSound() {
    // Stop background music immediately
    if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
        bgMusic.currentTime = 0; // Reset to start
    }

    // Play die sound (meme song) instantly
    if (dieSound) {
        dieSound.currentTime = 0; // Start from beginning
        // Use promise to ensure it plays immediately
        dieSound.play().then(() => {
            console.log("Die sound playing");
        }).catch(e => {
            console.log("Die sound play failed:", e);
            // Try again after a tiny delay if failed
            setTimeout(() => dieSound.play(), 10);
        });
    }
}

function update() {
    requestAnimationFrame(update);
    if (gameOver) {
        return;
    }
    context.clearRect(0, 0, board.width, board.height);

    //bird - only apply physics if game has started
    if (gameStarted) {
        velocityY += gravity;
        bird.y = Math.max(bird.y + velocityY, 0); //apply gravity to current bird.y, limit the bird.y to top of the canvas
    }

    // Calculate bird rotation based on velocity
    birdRotation = Math.min(Math.max(velocityY * 3, -25), 90); // Clamp rotation between -25 and 90 degrees

    // Draw bird with rotation
    context.save();
    context.translate(bird.x + bird.width/2, bird.y + bird.height/2);
    context.rotate(birdRotation * Math.PI / 180);
    context.drawImage(birdImg, -bird.width/2, -bird.height/2, bird.width, bird.height);
    context.restore();

    if (bird.y > board.height) {
        gameOver = true;
        playGameOverSound();
    }

    //pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5; //0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
            pipe.passed = true;
            scoreFlash = 10; // Trigger score flash animation

            // Play score sound (only on full points, not 0.5)
            if (score % 1 === 0) {
                playScoreSound();
            }

            // Increase difficulty every 10 points (changed from 5 for gentler progression)
            if (score % 10 === 0 && score > 0) {
                velocityX = baseVelocityX * (1 + score * 0.01); // Speed increases by 1% per 10 points (reduced from 2%)
            }
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
            playGameOverSound();
        }
    }

    //clear pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift(); //removes first element from the array
    }

    //score with animation
    if (scoreFlash > 0) {
        context.fillStyle = "yellow";
        context.font = (45 + scoreFlash) + "px sans-serif";
        scoreFlash--;
    } else {
        context.fillStyle = "white";
        context.font = "45px sans-serif";
    }
    context.fillText(score, 5, 45);

    //high score
    context.fillStyle = "white";
    context.font="20px sans-serif";
    context.fillText("Best: " + highScore, 5, 70);

    if (gameOver) {
        // Update high score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("flappyBirdHighScore", highScore);
        }

        // Draw semi-transparent overlay
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        context.fillRect(0, 0, boardWidth, boardHeight);

        // Draw you_lost.png image in the center
        let imgWidth = 200;
        let imgHeight = 200;
        context.drawImage(youLostImg, boardWidth/2 - imgWidth/2, boardHeight/2 - 200, imgWidth, imgHeight);

        // Draw "U r useless" text
        context.fillStyle = "#ff4444";
        context.font="bold 40px sans-serif";
        context.textAlign = "center";
        context.fillText("U r useless", boardWidth/2, boardHeight/2 + 30);

        // Draw score
        context.fillStyle = "white";
        context.font="30px sans-serif";
        context.fillText("Score: " + score, boardWidth/2, boardHeight/2 + 80);
        context.fillText("Best: " + highScore, boardWidth/2, boardHeight/2 + 115);

        // Draw try again message
        context.fillStyle = "#ffff00";
        context.font="25px sans-serif";
        context.fillText("Try Again!", boardWidth/2, boardHeight/2 + 160);

        context.fillStyle = "white";
        context.font="18px sans-serif";
        context.fillText("Press Space/Click to Restart", boardWidth/2, boardHeight/2 + 190);

        // Reset text align
        context.textAlign = "left";
    }

    // Show start message
    if (!gameStarted && !gameOver) {
        context.fillStyle = "white";
        context.font="25px sans-serif";
        context.fillText("Press Space/Click to Start", boardWidth/2 - 140, boardHeight/2);
    }
}

function placePipes() {
    if (gameOver || !gameStarted) {
        return;
    }

    // Randomize pipe position
    let openingSpace = board.height/2.5; // Very large opening for easy gameplay

    // Random Y position for the gap (opening) - much more variation
    let minGapY = 150;
    let maxGapY = boardHeight - openingSpace - 150;
    let gapY = Math.random() * (maxGapY - minGapY) + minGapY;

    // Top pipe - extends from top of screen (0) down to gap
    let topPipe = {
        img : topPipeImg,
        x : pipeX,
        y : 0, // Start from top of screen
        width : pipeWidth,
        height : gapY, // Extend down to the gap
        passed : false
    }
    pipeArray.push(topPipe);

    // Bottom pipe - starts at bottom of gap and extends down
    let bottomPipe = {
        img : bottomPipeImg,
        x : pipeX,
        y : gapY + openingSpace, // Start at bottom of gap
        width : pipeWidth,
        height : boardHeight - (gapY + openingSpace), // Extend to bottom of screen
        passed : false
    }
    pipeArray.push(bottomPipe);
}

function moveBird(e) {
    // Check for keyboard events
    if (e.code && !(e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX")) {
        return;
    }

    // Start game if not started
    if (!gameStarted && !gameOver) {
        gameStarted = true;

        // Start background music when game starts
        if (bgMusic && bgMusic.paused) {
            bgMusic.play().catch(e => console.log("Background music play failed:", e));
        }
    }

    //reset game
    if (gameOver) {
        bird.y = birdY;
        pipeArray = [];
        score = 0;
        gameOver = false;
        velocityX = baseVelocityX; // Reset difficulty
        gameStarted = false;

        // Stop die sound
        if (dieSound && !dieSound.paused) {
            dieSound.pause();
            dieSound.currentTime = 0;
        }

        // Don't start bg music yet, wait for next jump
        return; // Don't jump on restart, just reset
    }

    //jump (reduced for easier control)
    velocityY = -4.5;

    // Play jump sound
    playJumpSound();
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&   //a's top left corner doesn't reach b's top right corner
           a.x + a.width > b.x &&   //a's top right corner passes b's top left corner
           a.y < b.y + b.height &&  //a's top left corner doesn't reach b's bottom left corner
           a.y + a.height > b.y;    //a's bottom left corner passes b's top left corner
}