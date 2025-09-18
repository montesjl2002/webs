// ROBUST CONSOLE & SHORTCUT BLOCKER
(function() {
    // Block right-click context menu
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Block key combinations
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
            (e.ctrlKey && ['U', 'S'].includes(e.key.toUpperCase()))
        ) {
            e.preventDefault();
        }
    });

    // Aggressive DevTools blocking using a debugger loop
    const devToolsTrap = () => {
        debugger;
    };
    // Run the trap at a high frequency
    setInterval(devToolsTrap, 50);
})();

// MAIN APPLICATION LOGIC
document.addEventListener('DOMContentLoaded', function() {
    
    // Initial load animation
    setTimeout(() => {
        document.body.classList.remove("not-loaded");
    }, 1000);

    // ANIMATION OPTIMIZATION
    const particleContainer = document.getElementById('particle-container');
    const fallingContainer = document.getElementById('falling-flower-container');

    let lastParticleTime = 0;
    let lastFlowerTime = 0;
    const particleInterval = 100;
    const flowerInterval = 250;

    function animationLoop(timestamp) {
        if (timestamp - lastParticleTime > particleInterval) {
            createParticle(Math.random() * window.innerWidth, Math.random() * window.innerHeight);
            createParticle((window.innerWidth / 2) + (Math.random() - 0.5) * 400, (window.innerHeight / 3) + (Math.random() - 0.5) * 300);
            lastParticleTime = timestamp;
        }

        if (timestamp - lastFlowerTime > flowerInterval) {
            createFallingFlower();
            lastFlowerTime = timestamp;
        }
        
        requestAnimationFrame(animationLoop);
    }

    function createParticle(x, y) {
        if (!particleContainer) return;
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 6 + 2;
        particle.style.cssText = `width: ${size}px; height: ${size}px; left: ${x}px; top: ${y}px; animation-delay: ${Math.random() * 6}s;`;
        particleContainer.appendChild(particle);
        setTimeout(() => particle.remove(), (6 + parseFloat(particle.style.animationDelay)) * 1000);
    }

    function createFallingFlower() {
        if (!fallingContainer) return;
        const flowerWrapper = document.createElement('div');
        flowerWrapper.className = 'falling-flower-wrapper';
        const flower = document.createElement('div');
        flower.className = 'falling-flower';
        
        const animDuration = Math.random() * 8 + 7;
        const size = Math.random() * 30 + 10;

        flowerWrapper.style.left = Math.random() * 95 + 'vw';
        flowerWrapper.style.animationDuration = animDuration + 's';
        
        flower.style.animationDuration = (Math.random() * 2 + 3) + 's';
        flower.style.width = size + 'px';
        flower.style.height = size + 'px';
        flower.style.filter = `blur(${Math.random() * 2}px)`;
        flower.style.opacity = Math.random() * 0.5 + 0.5;

        flowerWrapper.appendChild(flower);
        fallingContainer.appendChild(flowerWrapper);

        setTimeout(() => flowerWrapper.remove(), animDuration * 1000 + 500);
    }

    // Start the optimized animation loop
    requestAnimationFrame(animationLoop);

    // MUSIC PLAYER LOGIC
    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    
    if (audioPlayer) {
        const showPlayIcon = () => { 
            playIcon.style.display = 'block'; 
            pauseIcon.style.display = 'none'; 
        };
        const showPauseIcon = () => { 
            playIcon.style.display = 'none'; 
            pauseIcon.style.display = 'block'; 
        };

        const togglePlayPause = () => {
            if (audioPlayer.paused) {
                audioPlayer.play().catch(e => console.error('Playback failed:', e));
            } else {
                audioPlayer.pause();
            }
        };
        
        // Auto-play functionality
        const startAutoPlay = () => {
            audioPlayer.play().catch(e => {
                console.log('Auto-play blocked by browser, waiting for user interaction');
                // If auto-play is blocked, add a one-time click listener to the document
                const enableAutoPlay = () => {
                    audioPlayer.play().catch(err => console.error('Failed to start audio:', err));
                    document.removeEventListener('click', enableAutoPlay);
                };
                document.addEventListener('click', enableAutoPlay);
            });
        };
        
        audioPlayer.addEventListener('play', showPauseIcon);
        audioPlayer.addEventListener('pause', showPlayIcon);
        
        // When audio ends, show play icon and don't restart
        audioPlayer.addEventListener('ended', () => {
            showPlayIcon();
            console.log('Audio finished playing');
        });

        audioPlayer.addEventListener('timeupdate', () => {
            if (audioPlayer.duration) {
                progressFill.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
                currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
            }
        });
         
        audioPlayer.addEventListener('loadedmetadata', () => {
             if (audioPlayer.duration) {
                totalTimeEl.textContent = formatTime(audioPlayer.duration);
             }
        });

        // Start auto-play when metadata is loaded
        audioPlayer.addEventListener('canplaythrough', startAutoPlay, { once: true });

        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        };

        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const newTime = ((e.clientX - rect.left) / rect.width) * audioPlayer.duration;
            audioPlayer.currentTime = newTime;
        });
        
        playPauseBtn.addEventListener('click', togglePlayPause);
    }
});