/**
 * MLB Player Guessing Game - Refactored Version
 * Uses shared components and proper architecture
 */

// Import shared components (these would be loaded via script tags in production)
// <script src="../src/shared/components/SearchDropdown.js"></script>
// <script src="../src/shared/utils/csvParser.js"></script>

// Game configuration
const GAME_CONFIG = {
    MAX_GUESSES: 8,
    TEAM_HINT_THRESHOLD: 4,
    INITIAL_HINT_THRESHOLD: 6,
    DEBOUNCE_DELAY: 300,
    THRESHOLDS: {
        AGE: 3,
        RUNS: 10,
        STOLEN_BASES: 5,
        HOME_RUNS: 5,
        OPS: 0.050
    }
};

// Game state management
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.guesses = [];
        this.gameWon = false;
        this.gameOver = false;
        this.wrongGuesses = 0;
        this.teamHintUsed = false;
        this.initialHintUsed = false;
        this.selectedPlayer = null;
        this.targetPlayer = null;
    }

    addGuess(player) {
        this.guesses.push(player);
        if (player.Player !== this.targetPlayer.Player) {
            this.wrongGuesses++;
        }
    }

    isGuessAlreadyMade(playerName) {
        return this.guesses.some(guess => guess.Player === playerName);
    }

    canUseTeamHint() {
        return this.wrongGuesses >= GAME_CONFIG.TEAM_HINT_THRESHOLD && !this.teamHintUsed && !this.gameOver;
    }

    canUseInitialHint() {
        return this.wrongGuesses >= GAME_CONFIG.INITIAL_HINT_THRESHOLD && !this.initialHintUsed && !this.gameOver;
    }

    useTeamHint() {
        this.teamHintUsed = true;
    }

    useInitialHint() {
        this.initialHintUsed = true;
    }

    isGameWon() {
        return this.gameWon;
    }

    isGameOver() {
        return this.gameOver || this.guesses.length >= GAME_CONFIG.MAX_GUESSES;
    }

    setGameWon() {
        this.gameWon = true;
        this.gameOver = true;
    }

    setGameOver() {
        this.gameOver = true;
    }
}

// Data management
class DataManager {
    constructor() {
        this.playersData = [];
        this.isLoaded = false;
        this.csvParser = new CSVParser();
    }

    async loadPlayersData() {
        try {
            this.showLoading('Loading player data...');
            
            const response = await fetch('./data/mlb_players.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            this.playersData = await this.csvParser.parse(csvText, CSV_SCHEMAS.MLB_PLAYER);
            this.isLoaded = true;
            
            this.hideLoading();
            return this.playersData;
        } catch (error) {
            this.hideLoading();
            console.error('Error loading players data:', error);
            this.showError('Failed to load player data. Please try again.');
            throw error;
        }
    }

    getRandomPlayer() {
        if (!this.isLoaded || this.playersData.length === 0) {
            throw new Error('Player data not loaded');
        }
        
        const randomIndex = Math.floor(Math.random() * this.playersData.length);
        return this.playersData[randomIndex];
    }

    filterPlayers(searchTerm) {
        if (!searchTerm || !this.isLoaded) return [];
        
        const term = searchTerm.toLowerCase();
        return this.playersData.filter(player => 
            player.Player.toLowerCase().includes(term) ||
            player.Team.toLowerCase().includes(term) ||
            player.League.toLowerCase().includes(term)
        ).sort((a, b) => a.Player.localeCompare(b.Player));
    }

    showLoading(message) {
        const gameStatus = document.getElementById('gameStatus');
        if (gameStatus) {
            gameStatus.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>${message}</span>
                </div>
            `;
        }
    }

    hideLoading() {
        const gameStatus = document.getElementById('gameStatus');
        if (gameStatus) {
            gameStatus.innerHTML = '';
        }
    }

    showError(message) {
        const gameStatus = document.getElementById('gameStatus');
        if (gameStatus) {
            gameStatus.innerHTML = `
                <div class="error-state">
                    <span class="error-icon">⚠️</span>
                    <span>${message}</span>
                    <button onclick="location.reload()" class="action-button primary">Retry</button>
                </div>
            `;
        }
    }
}

// UI Management
class UIManager {
    constructor() {
        this.elements = {};
        this.cacheElements();
    }

    cacheElements() {
        const selectors = {
            playerInput: '#playerInput',
            playerDropdown: '#playerDropdown',
            teamHintButton: '#teamHintButton',
            initialHintButton: '#initialHintButton',
            guessButton: '#guessButton',
            guessCount: '#guessCount',
            gameStatus: '#gameStatus',
            guessesHeader: '#guessesHeader',
            guessesList: '#guessesList',
            newGameButton: '#newGameButton',
            homeButton: '#homeButton'
        };

        for (const [key, selector] of Object.entries(selectors)) {
            this.elements[key] = document.querySelector(selector);
        }
    }

    updateGuessCount(current, max) {
        if (this.elements.guessCount) {
            this.elements.guessCount.textContent = current;
        }
    }

    updateGameStatus(message, type = '') {
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = message;
            this.elements.gameStatus.className = `game-message ${type}`;
        }
    }

    updateGuessButton(enabled) {
        if (this.elements.guessButton) {
            this.elements.guessButton.disabled = !enabled;
        }
    }

    updateHintButton(type, enabled, text = null) {
        const button = this.elements[`${type}HintButton`];
        if (button) {
            button.disabled = !enabled;
            if (text) {
                button.textContent = text;
                button.classList.add('used');
            }
        }
    }

    updateNewGameButton(gameOver) {
        if (this.elements.newGameButton) {
            this.elements.newGameButton.className = gameOver ? 'action-button success' : 'action-button secondary';
        }
    }

    clearInput() {
        if (this.elements.playerInput) {
            this.elements.playerInput.value = '';
        }
    }

    showGuessesHeader() {
        if (this.elements.guessesHeader) {
            this.elements.guessesHeader.hidden = false;
        }
    }

    updateGuessesDisplay(guesses, targetPlayer) {
        if (!this.elements.guessesList) return;

        this.elements.guessesList.innerHTML = guesses.map(guess => {
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.setAttribute('role', 'row');

            const cells = [
                { value: guess.Player, className: 'player-name' },
                { value: guess.League, className: this.getMatchClass(guess.League, targetPlayer.League) },
                { value: guess.Team, className: this.getMatchClass(guess.Team, targetPlayer.Team) },
                { value: guess.Age + this.getArrow(guess.Age, targetPlayer.Age, GAME_CONFIG.THRESHOLDS.AGE), 
                  className: this.getNumericMatchClass(guess.Age, targetPlayer.Age, GAME_CONFIG.THRESHOLDS.AGE) },
                { value: guess.Runs + this.getArrow(guess.Runs, targetPlayer.Runs, GAME_CONFIG.THRESHOLDS.RUNS), 
                  className: this.getNumericMatchClass(guess.Runs, targetPlayer.Runs, GAME_CONFIG.THRESHOLDS.RUNS) },
                { value: guess.SB + this.getArrow(guess.SB, targetPlayer.SB, GAME_CONFIG.THRESHOLDS.STOLEN_BASES), 
                  className: this.getNumericMatchClass(guess.SB, targetPlayer.SB, GAME_CONFIG.THRESHOLDS.STOLEN_BASES) },
                { value: guess.HR + this.getArrow(guess.HR, targetPlayer.HR, GAME_CONFIG.THRESHOLDS.HOME_RUNS), 
                  className: this.getNumericMatchClass(guess.HR, targetPlayer.HR, GAME_CONFIG.THRESHOLDS.HOME_RUNS) },
                { value: guess.OPS.toFixed(3) + this.getArrow(guess.OPS, targetPlayer.OPS, GAME_CONFIG.THRESHOLDS.OPS), 
                  className: this.getNumericMatchClass(guess.OPS, targetPlayer.OPS, GAME_CONFIG.THRESHOLDS.OPS) }
            ];

            cells.forEach(cell => {
                const cellElement = document.createElement('div');
                cellElement.className = `guess-cell ${cell.className}`;
                cellElement.textContent = cell.value;
                cellElement.setAttribute('role', 'cell');
                row.appendChild(cellElement);
            });

            return row;
        }).forEach(row => this.elements.guessesList.appendChild(row));
    }

    getMatchClass(guessValue, targetValue) {
        return guessValue === targetValue ? 'correct' : 'wrong';
    }

    getNumericMatchClass(guessValue, targetValue, threshold) {
        if (guessValue === targetValue) return 'correct';
        if (Math.abs(guessValue - targetValue) <= threshold) return 'close';
        return 'wrong';
    }

    getArrow(guessValue, targetValue, threshold) {
        if (guessValue === targetValue) return '';
        if (Math.abs(guessValue - targetValue) <= threshold) {
            return guessValue < targetValue ? ' ↑' : ' ↓';
        }
        return guessValue < targetValue ? ' ↑' : ' ↓';
    }

    resetGame() {
        this.clearInput();
        this.updateGuessCount(0, GAME_CONFIG.MAX_GUESSES);
        this.updateGameStatus('');
        this.updateGuessButton(false);
        this.updateNewGameButton(false);
        
        // Reset hint buttons
        this.updateHintButton('team', false);
        this.updateHintButton('initial', false);
        
        // Reset guesses display
        if (this.elements.guessesList) {
            this.elements.guessesList.innerHTML = '';
        }
        if (this.elements.guessesHeader) {
            this.elements.guessesHeader.hidden = true;
        }
    }
}

// Main game class
class MLBPlayerGuessGame {
    constructor() {
        this.gameState = new GameState();
        this.dataManager = new DataManager();
        this.uiManager = new UIManager();
        this.searchDropdown = null;
    }

    async init() {
        try {
            await this.dataManager.loadPlayersData();
            this.setupEventListeners();
            this.setupSearchDropdown();
            this.startNewGame();
        } catch (error) {
            console.error('Game initialization error:', error);
        }
    }

    setupEventListeners() {
        // Guess button
        if (this.uiManager.elements.guessButton) {
            this.uiManager.elements.guessButton.addEventListener('click', () => this.makeGuess());
        }

        // Hint buttons
        if (this.uiManager.elements.teamHintButton) {
            this.uiManager.elements.teamHintButton.addEventListener('click', () => this.useTeamHint());
        }
        if (this.uiManager.elements.initialHintButton) {
            this.uiManager.elements.initialHintButton.addEventListener('click', () => this.useInitialHint());
        }

        // New game button
        if (this.uiManager.elements.newGameButton) {
            this.uiManager.elements.newGameButton.addEventListener('click', () => this.startNewGame());
        }

        // Home button
        if (this.uiManager.elements.homeButton) {
            this.uiManager.elements.homeButton.addEventListener('click', () => this.goHome());
        }
    }

    setupSearchDropdown() {
        this.searchDropdown = new SearchDropdown({
            inputId: 'playerInput',
            dropdownId: 'playerDropdown',
            placeholder: 'Type player name, team, or league...',
            onSelect: (player) => {
                this.gameState.selectedPlayer = player;
                this.uiManager.updateGuessButton(true);
            },
            onFilter: (query) => {
                return this.dataManager.filterPlayers(query);
            },
            formatItem: (player) => {
                return `${player.Player} (${player.Team} ${player.League})`;
            },
            getDisplayValue: (player) => {
                return player.Player;
            }
        });
    }

    startNewGame() {
        this.gameState.reset();
        this.uiManager.resetGame();
        
        try {
            this.gameState.targetPlayer = this.dataManager.getRandomPlayer();
            console.log('Target player:', this.gameState.targetPlayer.Player); // For debugging
        } catch (error) {
            this.uiManager.updateGameStatus('Error starting new game. Please try again.', 'error');
            console.error('Error starting new game:', error);
        }
    }

    makeGuess() {
        const selectedPlayer = this.gameState.selectedPlayer;
        if (!selectedPlayer || this.gameState.isGameOver()) return;

        // Check if already guessed
        if (this.gameState.isGuessAlreadyMade(selectedPlayer.Player)) {
            alert('You already guessed that player!');
            return;
        }

        // Add guess to game state
        this.gameState.addGuess(selectedPlayer);
        
        // Update UI
        this.updateGameDisplay();
        
        // Check win condition
        if (selectedPlayer.Player === this.gameState.targetPlayer.Player) {
            this.gameState.setGameWon();
            this.uiManager.updateGameStatus(`🎉 Congratulations! You guessed ${this.gameState.targetPlayer.Player}!`, 'success');
            this.uiManager.updateNewGameButton(true);
        } else if (this.gameState.isGameOver()) {
            this.gameState.setGameOver();
            this.uiManager.updateGameStatus(`😔 Game Over! The answer was ${this.gameState.targetPlayer.Player} (${this.gameState.targetPlayer.Team} ${this.gameState.targetPlayer.League})`, 'error');
            this.uiManager.updateNewGameButton(true);
        }

        // Update hint buttons
        this.updateHintButtons();
        
        // Reset search
        this.searchDropdown.clear();
        this.gameState.selectedPlayer = null;
    }

    updateGameDisplay() {
        this.uiManager.updateGuessCount(this.gameState.guesses.length, GAME_CONFIG.MAX_GUESSES);
        
        if (this.gameState.guesses.length > 0) {
            this.uiManager.showGuessesHeader();
            this.uiManager.updateGuessesDisplay(this.gameState.guesses, this.gameState.targetPlayer);
        }
    }

    updateHintButtons() {
        // Team hint
        if (this.gameState.canUseTeamHint()) {
            this.uiManager.updateHintButton('team', true);
        }

        // Initial hint
        if (this.gameState.canUseInitialHint()) {
            this.uiManager.updateHintButton('initial', true);
        }
    }

    useTeamHint() {
        if (!this.gameState.canUseTeamHint()) return;
        
        this.gameState.useTeamHint();
        this.uiManager.updateHintButton('team', false, this.gameState.targetPlayer.Team);
    }

    useInitialHint() {
        if (!this.gameState.canUseInitialHint()) return;
        
        this.gameState.useInitialHint();
        const firstName = this.gameState.targetPlayer.Player.split(' ')[0];
        const initial = firstName.charAt(0).toUpperCase();
        this.uiManager.updateHintButton('initial', false, initial);
    }

    goHome() {
        window.location.href = '../index.html';
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new MLBPlayerGuessGame();
    game.init().catch(error => {
        console.error('Failed to initialize game:', error);
    });
});

// Export for testing or external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MLBPlayerGuessGame, GameState, DataManager, UIManager };
} 