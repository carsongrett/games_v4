// Games list with validation
const games = [
    { id: "nfl-player-guess", name: "Guess the NFL Player", description: "Guess the NFL player based on 2024 stats" },
    { id: "mlb-player-guess", name: "Guess the MLB Player", description: "Guess the MLB player based on 2025 stats" },
    { id: "nba-player-guess", name: "Guess the NBA Player", description: "Guess the NBA player based on 2024 stats" },
    { id: "mlb-player-comparison", name: "MLB Player Comparison", description: "Head-to-head stat comparisons between MLB players" },
    { id: "mlb-standings-challenge", name: "MLB Standings Challenge", description: "Guess which team belongs in each league ranking position" },
    { id: "mlb-division-challenge", name: "MLB Division Challenge", description: "Guess teams by their division rankings (AL/NL East, Central, West)" }
];

// Validate game exists
function isValidGame(gameName) {
    return games.some(game => game.id === gameName);
}

// Navigation function for games with validation
function navigateToGame(gameName) {
    if (!isValidGame(gameName)) {
        console.error('Invalid game name:', gameName);
        return;
    }
    
    // Change URL to #/home/gamename format (hash routing)
    window.location.hash = `/home/${gameName}`;
}

// Handle back navigation and URL routing
window.addEventListener('hashchange', function(event) {
    handleRoute();
});

function handleRoute() {
    const hash = window.location.hash;
    
    // Check if we're on a game page
    if (hash.startsWith('#/home/') && hash !== '#/home/') {
        const gameName = hash.split('#/home/')[1];
        
        // Validate game name before loading
        if (!isValidGame(gameName)) {
            console.error('Invalid game in URL:', gameName);
            showGameError('Invalid game');
            return;
        }
        
        loadGame(gameName);
    } else if (hash === '' || hash === '#' || hash === '#/') {
        // Show homepage
        showHomepage();
    }
}

// Dynamic game loading system with proper error handling
function loadGame(gameName) {
    // Double-check if game exists
    const game = games.find(g => g.id === gameName);
    if (!game) {
        console.error('Game not found:', gameName);
        showGameError('Game not found');
        return;
    }
    
    // Show loading placeholder
    showGamePlaceholder(game);
    
    // Try to load game dynamically with error handling
    loadGameScript(gameName);
}

function showGamePlaceholder(game) {
    document.body.innerHTML = `
        <div class="container">
            <header>
                <h1>${game.name}</h1>
                <button id="back-to-home-btn" class="action-button secondary">
                    Back to Home
                </button>
            </header>
            <main style="display: flex; justify-content: center; align-items: center; min-height: 400px;">
                <div id="game-container" class="game-loading-container">
                    <div class="loading-spinner"></div>
                    <h2>Loading Game...</h2>
                    <p>The ${game.name} game is loading.</p>
                </div>
            </main>
        </div>
    `;
    
    // Add event listener for back button
    document.getElementById('back-to-home-btn').addEventListener('click', goHome);
}

function loadGameScript(gameName) {
    // Validate game name to prevent XSS
    if (!isValidGame(gameName)) {
        console.error('Invalid game name for script loading:', gameName);
        showGameError('Invalid game');
        return;
    }
    
    // Check if script already exists and remove it
    const existingScript = document.querySelector(`script[src*="${gameName}"]`);
    if (existingScript) {
        existingScript.remove();
    }
    
    // Load game script dynamically with proper error handling
    const script = document.createElement('script');
    script.src = `games/${gameName}.js`;
    
    // Set timeout for script loading
    const loadTimeout = setTimeout(() => {
        console.error(`Timeout loading game: ${gameName}`);
        showGameError(gameName);
    }, 10000); // 10 second timeout
    
    script.onload = () => {
        clearTimeout(loadTimeout);
        console.log(`${gameName} game loaded successfully`);
        
        // Call the game's initialization function
        if (typeof window.initializeGame === 'function') {
            try {
                window.initializeGame();
            } catch (error) {
                console.error('Error initializing game:', error);
                showGameError(gameName);
            }
        } else {
            console.error('window.initializeGame function not found');
            showGameError(gameName);
        }
    };
    
    script.onerror = () => {
        clearTimeout(loadTimeout);
        console.error(`Failed to load ${gameName} game`);
        showGameError(gameName);
    };
    
    document.head.appendChild(script);
}

function showGameError(gameName) {
    const game = games.find(g => g.id === gameName) || { name: gameName };
    
    document.getElementById('game-container').innerHTML = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h2>Game Coming Soon</h2>
            <p>The ${game.name} game is under development.</p>
            <p class="error-details">Please try another game or check back later.</p>
            <button id="error-back-home-btn" class="action-button primary">
                Back to Home
            </button>
        </div>
    `;
    
    // Add event listener for error back button
    document.getElementById('error-back-home-btn').addEventListener('click', goHome);
}

function goHome() {
    window.location.hash = '';
}

function showHomepage() {
    const gameCards = games.map(game => `
        <div class="game-card" data-game-id="${game.id}">
            <h2>${game.name}</h2>
            <p>${game.description}</p>
        </div>
    `).join('');
    
    document.body.innerHTML = `
        <div class="container">
            <header>
                <h1>Games</h1>
                <p>Choose your game</p>
            </header>
            
            <main>
                <div class="games-grid">
                    ${gameCards}
                </div>
            </main>
            
            <footer>
                <p>&copy; 2024 Games</p>
            </footer>
        </div>
    `;
    
    // Add event listeners for game cards
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            const gameId = card.getAttribute('data-game-id');
            navigateToGame(gameId);
        });
    });
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Show user-friendly error message
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.innerHTML = `
            <div class="error-container">
                <div class="error-icon">💥</div>
                <h2>Something went wrong</h2>
                <p>An unexpected error occurred. Please refresh the page.</p>
                <button onclick="location.reload()" class="action-button primary">
                    Refresh Page
                </button>
            </div>
        `;
    }
});

// Initialize routing when page loads
document.addEventListener('DOMContentLoaded', function() {
    handleRoute();
}); 