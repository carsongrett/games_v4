// MLB Pitcher Comparison Game
(function() {
    // Initialize the game when this script loads
    window.initializeGame = function() {
        showMLBComparisonGame();
    };

    function showMLBComparisonGame() {
        document.getElementById('game-container').innerHTML = `
            <div style="text-align: center; max-width: 1000px; margin: 0 auto;" id="mlb-comparison-container">
                <h2>MLB Pitcher Comparison Challenge</h2>
                <p style="margin-bottom: 20px; color: #666;">Compare two pitchers and guess who has the better stat. 10 questions using 2025 season data!</p>
                
                <div style="margin-bottom: 20px; display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px solid #ddd;">
                        <strong>Question: <span id="mlb-comparison-question-number">1</span> / 10</strong>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px solid #ddd;">
                        <strong>Score: <span id="mlb-comparison-score">0</span> / 10</strong>
                    </div>
                </div>

                <div id="mlb-comparison-message" class="game-message" style="display: none; margin-bottom: 20px;"></div>

                <div id="mlb-comparison-question-container" style="margin-bottom: 30px;">
                    <!-- Game content will be loaded here -->
                </div>

                <div style="margin-top: 20px;">
                    <button id="mlb-comparison-new-game" onclick="newMLBComparisonGame()" style="padding: 10px 20px; background: white; border: 2px solid black; cursor: pointer; margin-right: 10px; font-size: 16px;">
                        New Game
                    </button>
                    <button onclick="goHome()" style="padding: 10px 20px; background: white; border: 2px solid black; cursor: pointer; font-size: 16px;">
                        Back to Home
                    </button>
                </div>

                <div style="margin-top: 20px; font-size: 0.9rem; color: #666;">
                    <p><strong>How to play:</strong> Read the question and click on the pitcher who has the better stat.</p>
                    <p>🟢 <strong>Green:</strong> Correct answer | 🔴 <strong>Red:</strong> Wrong answer</p>
                    <p>Game uses real 2025 MLB pitcher data!</p>
                </div>
            </div>
        `;
        
        // Initialize the game
        initializeMLBComparisonGame();
    }

class MLBComparisonGame {
    constructor() {
        this.pitchersData = [];
        this.currentQuestion = 1;
        this.score = 0;
        this.maxQuestions = 10;
        this.gameOver = false;
        this.currentPlayerA = null;
        this.currentPlayerB = null;
        this.currentStat = null;
        this.currentStatName = null;
        this.currentQuestionType = null; // 'lower', 'higher', or 'more'
        this.currentQuestionText = null;
        this.answeredCurrentQuestion = false;
        
        // Available stats to compare with question phrasing
        this.availableStats = [
            { key: 'ERA', name: 'ERA', question: 'Who has a lower ERA?', better: 'lower' },
            { key: 'InningsPitched', name: 'Innings Pitched', question: 'Who has more innings pitched?', better: 'higher' },
            { key: 'EarnedRuns', name: 'Earned Runs', question: 'Who has fewer earned runs allowed?', better: 'lower' },
            { key: 'Walks', name: 'Walks', question: 'Who has fewer walks allowed?', better: 'lower' },
            { key: 'Strikeouts', name: 'Strikeouts', question: 'Who has more strikeouts?', better: 'higher' },
            { key: 'SOBBRatio', name: 'SO/BB Ratio', question: 'Who has a higher SO/BB ratio?', better: 'higher' }
        ];
    }

    async initialize() {
        this.showMessage('Loading 2025 MLB pitcher data...', 'info');
        await this.loadPitchersData();
    }

    async loadPitchersData() {
        try {
            console.log('Fetching pitcher data CSV...');
            const response = await fetch('./data/pitcher_data.csv');
            console.log('Fetch response:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`Failed to load pitcher data CSV: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log('CSV text length:', csvText.length);
            
            const lines = csvText.trim().split('\n');
            console.log('CSV lines:', lines.length);
            
            // Parse CSV data
            this.pitchersData = lines.slice(1).map((line, index) => {
                try {
                    const values = this.parseCSVLine(line);
                    console.log(`Parsing line ${index + 1}:`, values);
                    
                    return {
                        Player: values[0],
                        Team: values[1],
                        ERA: parseFloat(values[2]),
                        InningsPitched: parseFloat(values[3]),
                        EarnedRuns: parseInt(values[4]),
                        Walks: parseInt(values[5]),
                        Strikeouts: parseInt(values[6]),
                        SOBBRatio: parseFloat(values[7])
                    };
                } catch (parseError) {
                    console.error(`Error parsing line ${index + 1}:`, line, parseError);
                    return null;
                }
            }).filter(pitcher => pitcher !== null);

            console.log(`Successfully loaded ${this.pitchersData.length} pitchers from CSV`);
            console.log('Sample pitcher data:', this.pitchersData[0]);
            
            if (this.pitchersData.length < 10) {
                throw new Error(`Not enough pitchers found (${this.pitchersData.length}). Need at least 10 to play.`);
            }
            
            this.showMessage(`Successfully loaded ${this.pitchersData.length} MLB pitchers!`, 'success');
            setTimeout(() => {
                this.hideMessage();
                this.startGame();
            }, 2000);
            
        } catch (error) {
            console.error('Error loading pitcher data:', error);
            this.showMessage(`Failed to load pitcher data: ${error.message}`, 'error');
            throw error; // Re-throw to be caught by initializeMLBComparisonGame
        }
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }



    startGame() {
        this.currentQuestion = 1;
        this.score = 0;
        this.gameOver = false;
        this.updateDisplay();
        this.generateQuestion();
    }

    generateQuestion() {
        if (this.gameOver || this.currentQuestion > this.maxQuestions) {
            this.endGame();
            return;
        }
        
        // Reset answered flag
        this.answeredCurrentQuestion = false;
        
        // Select two random pitchers
        const playerAIndex = Math.floor(Math.random() * this.pitchersData.length);
        let playerBIndex;
        do {
            playerBIndex = Math.floor(Math.random() * this.pitchersData.length);
        } while (playerBIndex === playerAIndex);
        
        this.currentPlayerA = this.pitchersData[playerAIndex];
        this.currentPlayerB = this.pitchersData[playerBIndex];
        
        // Select a random stat to compare
        const statIndex = Math.floor(Math.random() * this.availableStats.length);
        const selectedStat = this.availableStats[statIndex];
        this.currentStat = selectedStat.key;
        this.currentStatName = selectedStat.name;
        this.currentQuestionType = selectedStat.better;
        this.currentQuestionText = selectedStat.question;
        
        this.renderQuestion();
    }

    renderQuestion() {
        const container = document.getElementById('mlb-comparison-question-container');
        
        const playerAValue = this.currentPlayerA[this.currentStat];
        const playerBValue = this.currentPlayerB[this.currentStat];
        
        // Format the stat value for display
        const formatStat = (value) => {
            if (this.currentStat === 'ERA' || this.currentStat === 'SOBBRatio') {
                return value.toFixed(2);
            } else if (this.currentStat === 'InningsPitched') {
                return value.toFixed(1);
            }
            return value.toString();
        };
        
        container.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #333; margin-bottom: 20px;">${this.currentQuestionText}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 800px; margin: 0 auto;">
                    <div id="player-a-card" class="player-card" onclick="selectPlayer('A')" style="
                        background: white;
                        border: 3px solid #ddd;
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    ">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 1.3rem;">${this.currentPlayerA.Player}</h4>
                        <p style="margin: 5px 0; color: #666; font-size: 1rem;">${this.currentPlayerA.Team}</p>
                        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">2025 Season Stats:</p>
                            <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #888;">
                                ${this.currentPlayerA.InningsPitched} IP, ${this.currentPlayerA.Strikeouts} K
                            </p>
                        </div>
                    </div>
                    
                    <div id="player-b-card" class="player-card" onclick="selectPlayer('B')" style="
                        background: white;
                        border: 3px solid #ddd;
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    ">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 1.3rem;">${this.currentPlayerB.Player}</h4>
                        <p style="margin: 5px 0; color: #666; font-size: 1rem;">${this.currentPlayerB.Team}</p>
                        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">2025 Season Stats:</p>
                            <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #888;">
                                ${this.currentPlayerB.InningsPitched} IP, ${this.currentPlayerB.Strikeouts} K
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .player-card:hover {
                    border-color: #007cba !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                }
                
                @media (max-width: 600px) {
                    #mlb-comparison-question-container > div > div {
                        grid-template-columns: 1fr !important;
                        gap: 15px !important;
                    }
                }
            </style>
        `;
    }

    selectPlayer(choice) {
        if (this.answeredCurrentQuestion || this.gameOver) return;
        
        const playerAValue = this.currentPlayerA[this.currentStat];
        const playerBValue = this.currentPlayerB[this.currentStat];
        
        // Determine correct choice based on whether we want higher or lower values
        let correctChoice;
        if (this.currentQuestionType === 'higher') {
            correctChoice = playerAValue >= playerBValue ? 'A' : 'B';
        } else { // 'lower'
            correctChoice = playerAValue <= playerBValue ? 'A' : 'B';
        }
        
        const isCorrect = choice === correctChoice;
        
        this.answeredCurrentQuestion = true;
        
        if (isCorrect) {
            this.score++;
        }
        
        // Update display to show the answer
        this.showAnswer(choice, correctChoice, playerAValue, playerBValue);
        
        // Move to next question after a delay
        setTimeout(() => {
            this.currentQuestion++;
            this.updateDisplay();
            this.generateQuestion();
        }, 3000);
    }

    showAnswer(userChoice, correctChoice, valueA, valueB) {
        const cardA = document.getElementById('player-a-card');
        const cardB = document.getElementById('player-b-card');
        
        // Format the stat values for display
        const formatStat = (value) => {
            if (this.currentStat === 'ERA' || this.currentStat === 'SOBBRatio') {
                return value.toFixed(2);
            } else if (this.currentStat === 'InningsPitched') {
                return value.toFixed(1);
            }
            return value.toString();
        };
        
        // Remove hover effects
        cardA.style.cursor = 'default';
        cardB.style.cursor = 'default';
        cardA.classList.remove('player-card');
        cardB.classList.remove('player-card');
        
        // Show the actual stat values
        const statsDisplayA = `<div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 6px; border: 2px solid #1976d2;">
            <strong style="color: #1976d2; font-size: 1.2rem;">${this.currentStatName}: ${formatStat(valueA)}</strong>
        </div>`;
        
        const statsDisplayB = `<div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 6px; border: 2px solid #1976d2;">
            <strong style="color: #1976d2; font-size: 1.2rem;">${this.currentStatName}: ${formatStat(valueB)}</strong>
        </div>`;
        
        cardA.innerHTML += statsDisplayA;
        cardB.innerHTML += statsDisplayB;
        
        // Color code the results
        if (correctChoice === 'A') {
            cardA.style.borderColor = '#4caf50';
            cardA.style.background = '#f1f8e9';
            if (userChoice !== 'A') {
                cardB.style.borderColor = '#f44336';
                cardB.style.background = '#ffebee';
            }
        } else {
            cardB.style.borderColor = '#4caf50';
            cardB.style.background = '#f1f8e9';
            if (userChoice !== 'B') {
                cardA.style.borderColor = '#f44336';
                cardA.style.background = '#ffebee';
            }
        }
        
        // Show result message
        const isCorrect = userChoice === correctChoice;
        this.showMessage(
            isCorrect ? '✓ Correct!' : '✗ Incorrect!',
            isCorrect ? 'success' : 'error'
        );
    }

    endGame() {
        this.gameOver = true;
        const container = document.getElementById('mlb-comparison-question-container');
        
        const percentage = Math.round((this.score / this.maxQuestions) * 100);
        let performanceMessage = '';
        
        if (percentage >= 80) {
            performanceMessage = 'Excellent work! You really know your baseball stats! 🏆';
        } else if (percentage >= 60) {
            performanceMessage = 'Good job! You have solid knowledge of player stats! ⚾';
        } else if (percentage >= 40) {
            performanceMessage = 'Not bad! Keep following the stats to improve! 📊';
        } else {
            performanceMessage = 'Room for improvement! Try watching more games! 🤔';
        }
        
        container.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <h3 style="color: #333; margin-bottom: 20px;">Game Complete!</h3>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin: 20px 0; max-width: 500px; margin-left: auto; margin-right: auto;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Final Score</h4>
                    <p style="font-size: 2rem; font-weight: bold; margin: 10px 0; color: #007cba;">${this.score} / ${this.maxQuestions}</p>
                    <p style="font-size: 1.2rem; margin: 10px 0; color: #666;">${percentage}%</p>
                    <p style="margin: 20px 0 0 0; color: #555; font-style: italic;">${performanceMessage}</p>
                </div>
                
                <button onclick="newMLBComparisonGame()" style="
                    padding: 12px 24px; 
                    background: #007cba; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    font-size: 1.1rem; 
                    cursor: pointer;
                    margin-right: 10px;
                ">
                    Play Again
                </button>
            </div>
        `;
    }

    updateDisplay() {
        document.getElementById('mlb-comparison-question-number').textContent = this.currentQuestion;
        document.getElementById('mlb-comparison-score').textContent = this.score;
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('mlb-comparison-message');
        messageEl.textContent = message;
        messageEl.className = `game-message ${type}`;
        messageEl.style.display = 'block';
        
        // Style the message based on type
        if (type === 'error') {
            messageEl.style.background = '#ffebee';
            messageEl.style.color = '#c62828';
            messageEl.style.border = '1px solid #e57373';
        } else if (type === 'success') {
            messageEl.style.background = '#e8f5e8';
            messageEl.style.color = '#2e7d32';
            messageEl.style.border = '1px solid #81c784';
        } else {
            messageEl.style.background = '#e3f2fd';
            messageEl.style.color = '#1565c0';
            messageEl.style.border = '1px solid #64b5f6';
        }
        
        messageEl.style.padding = '10px';
        messageEl.style.borderRadius = '4px';
        messageEl.style.marginBottom = '15px';
    }

    hideMessage() {
        document.getElementById('mlb-comparison-message').style.display = 'none';
    }

    newGame() {
        this.currentQuestion = 1;
        this.score = 0;
        this.gameOver = false;
        this.answeredCurrentQuestion = false;
        this.updateDisplay();
        this.generateQuestion();
    }
}

// Global game instance
let mlbComparisonGame = null;

// Global functions for onclick handlers
window.selectPlayer = function(choice) {
    if (mlbComparisonGame) {
        mlbComparisonGame.selectPlayer(choice);
    }
};

window.newMLBComparisonGame = function() {
    if (mlbComparisonGame) {
        mlbComparisonGame.newGame();
    }
};

async function initializeMLBComparisonGame() {
    try {
        console.log('Initializing MLB Comparison Game...');
        mlbComparisonGame = new MLBComparisonGame();
        console.log('Game instance created');
        await mlbComparisonGame.initialize();
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Failed to initialize MLB Comparison Game:', error);
        const container = document.getElementById('mlb-comparison-question-container');
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #d32f2f;">
                <h3>Unable to Load Game</h3>
                <p>Failed to load 2025 MLB pitcher data.</p>
                <p style="font-size: 0.9rem; color: #666; margin-top: 20px;">Error: ${error.message}</p>
            </div>
        `;
    }
}

})(); 