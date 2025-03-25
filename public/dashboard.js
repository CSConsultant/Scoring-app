document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const firstLegoTabBtn = document.getElementById('firstLegoTabBtn');
    const robofestTabBtn = document.getElementById('robofestTabBtn');
    const firstLegoSection = document.getElementById('firstLegoSection');
    const robofestSection = document.getElementById('robofestSection');
    

    
    firstLegoTabBtn.addEventListener('click', function() {
        firstLegoSection.style.display = 'block';
        robofestSection.style.display = 'none';
        firstLegoTabBtn.classList.add('active');
        robofestTabBtn.classList.remove('active');
    });
    
    robofestTabBtn.addEventListener('click', function() {
        firstLegoSection.style.display = 'none';
        robofestSection.style.display = 'block';
        firstLegoTabBtn.classList.remove('active');
        robofestTabBtn.classList.add('active');
    });
    
    // Timer functionality
    const timerDisplay = document.getElementById('timer');
    const timerStatus = document.getElementById('timer-status');
    const timerInput = document.getElementById('timer-minutes');
    const startTimerBtn = document.getElementById('start-timer');
    const stopTimerBtn = document.getElementById('stop-timer');
    
    let timerInterval;
    
    // Initial timer check
    fetchTimerStatus();
    
    startTimerBtn.addEventListener('click', function() {
        const timeInput = timerInput.value.trim();
        let minutes = 0;
        let seconds = 0;
        
        // Parse the input for minutes:seconds format
        if (timeInput.includes(':')) {
            const timeParts = timeInput.split(':');
            minutes = parseInt(timeParts[0]) || 0;
            seconds = parseInt(timeParts[1]) || 0;
        } else {
            // If only a number is provided, treat it as minutes
            minutes = parseInt(timeInput) || 0;
        }
        
        // Calculate total seconds
        const totalSeconds = (minutes * 60) + seconds;
        
        if (totalSeconds <= 0) {
            alert('Please enter a valid time (minutes:seconds or minutes)');
            return;
        }
        
        // Start timer with total seconds
        startTimer(totalSeconds);
    });
    
    stopTimerBtn.addEventListener('click', function() {
        stopTimer();
    });
    
    function startTimer(totalSeconds) {
        fetch('/api/timer/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ seconds: totalSeconds })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateTimerUI(data.endTime);
                
                // Update timer every second
                clearInterval(timerInterval);
                timerInterval = setInterval(() => {
                    updateTimerUI(data.endTime);
                }, 1000);
            } else if (data.error) {
                alert(data.error);
            }
        })
        .catch(error => console.error('Error starting timer:', error));
    }
    
    function stopTimer() {
        fetch('/api/timer/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                clearInterval(timerInterval);
                timerStatus.textContent = 'Stopped';
                timerDisplay.textContent = '00:00';
            }
        })
        .catch(error => console.error('Error stopping timer:', error));
    }
    
    // Create audio element for timer end sound
    const timerEndSound = new Audio('/oldCarHorn.mp3');

    function updateTimerUI(endTime) {
        const now = Date.now();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = '00:00';
            timerStatus.textContent = 'Time\'s up!';
            
            // Play timer end sound
            timerEndSound.play().catch(error => {
                console.error('Audio playback failed:', error);
            });
            
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerStatus.textContent = 'Running';
    }
    
    function fetchTimerStatus() {
        fetch('/api/timer')
            .then(response => response.json())
            .then(data => {
                if (data.running) {
                    updateTimerUI(data.endTime);
                    
                    // Update timer every second if it's running
                    clearInterval(timerInterval);
                    timerInterval = setInterval(() => {
                        updateTimerUI(data.endTime);
                    }, 1000);
                } else {
                    timerDisplay.textContent = '00:00';
                    timerStatus.textContent = 'Not running';
                }
            })
            .catch(error => console.error('Error fetching timer status:', error));
    }
    
    // Team and score management
    const firstLegoTeamForm = document.getElementById('addFirstLegoTeam');
    const robofestTeamForm = document.getElementById('addRobofestTeam');
    const firstLegoScoresTable = document.getElementById('firstLegoScores');
    const robofestScoresTable = document.getElementById('robofestScores');
    
    let scoreData = {
        firstLego: {
            teams: [],
            rounds: {
                round1: {},
                round2: {},
                round3: {}
            }
        },
        robofest: {
            teams: [],
            rounds: {
                round1: {},
                round2: {},
                round3: {}
            }
        }
    };
    
    // Initial data load
    loadScoreData();
    
    // Periodically refresh data
    setInterval(loadScoreData, 10000);
    
    firstLegoTeamForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const teamName = document.getElementById('firstLegoTeamName').value;
        const teamNumber = document.getElementById('firstLegoTeamNumber').value;
        
        addTeam('firstLego', teamName, teamNumber);
    });
    
    robofestTeamForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const teamName = document.getElementById('robofestTeamName').value;
        const teamNumber = document.getElementById('robofestTeamNumber').value;
        
        addTeam('robofest', teamName, teamNumber);
    });
    
    function addTeam(competition, teamName, teamNumber) {
        fetch('/api/team', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                competition, 
                teamName, 
                teamNumber 
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Clear input fields
                document.getElementById(`${competition}TeamName`).value = '';
                document.getElementById(`${competition}TeamNumber`).value = '';
                
                // Reload data
                loadScoreData();
            } else {
                alert(data.error || 'Error adding team');
            }
        })
        .catch(error => console.error(`Error adding ${competition} team:`, error));
    }
    
    function loadScoreData() {
        fetch('/api/scores')
            .then(response => response.json())
            .then(data => {
                scoreData = data;
                renderScoreTables();
            })
            .catch(error => console.error('Error loading score data:', error));
    }
    
    function renderScoreTables() {
        renderTeamScores('firstLego', firstLegoScoresTable);
        renderTeamScores('robofest', robofestScoresTable);
    }
    
    function renderTeamScores(competition, tableElement) {
        const teams = scoreData[competition].teams;
        const rounds = scoreData[competition].rounds;
        const tbody = tableElement.querySelector('tbody');
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        teams.forEach(team => {
            const row = document.createElement('tr');
            
            // Team name and number
            const teamCell = document.createElement('td');
            teamCell.textContent = `${team.name} (#${team.number})`;
            row.appendChild(teamCell);
            
            // Round 1 score
            const round1Cell = createScoreCell(competition, team.id, 'round1', rounds.round1[team.id]);
            row.appendChild(round1Cell);
            
            // Round 2 score
            const round2Cell = createScoreCell(competition, team.id, 'round2', rounds.round2[team.id]);
            row.appendChild(round2Cell);
            
            // Round 3 score (hidden from viewers)
            const round3Cell = createScoreCell(competition, team.id, 'round3', rounds.round3[team.id]);
            row.appendChild(round3Cell);
            
            tbody.appendChild(row);
        });
    }
    
    function createScoreCell(competition, teamId, round, currentScore) {
        const cell = document.createElement('td');
        
        // Create input for score
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = currentScore || '';
        input.placeholder = 'Score';
        input.className = 'score-input';
        
        // Create save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'btn btn-small';
        
        saveBtn.addEventListener('click', function() {
            const score = input.value;
            
            if (score === '' || isNaN(parseInt(score))) {
                alert('Please enter a valid score');
                return;
            }
            
            updateScore(competition, teamId, round, score);
        });
        
        cell.appendChild(input);
        cell.appendChild(saveBtn);
        
        return cell;
    }
    
    function updateScore(competition, teamId, round, score) {
        fetch('/api/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                competition,
                teamId,
                round,
                score: parseInt(score)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update local data
                scoreData[competition].rounds = data.rounds;
                console.log('Score updated successfully');
            } else {
                alert(data.error || 'Error updating score');
            }
        })
        .catch(error => console.error('Error updating score:', error));
    }
});