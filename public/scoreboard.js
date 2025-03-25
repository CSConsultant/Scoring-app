document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const firstLegoTabBtn = document.getElementById('firstLegoTabBtn');
    const robofestTabBtn = document.getElementById('robofestTabBtn');
    const firstLegoSection = document.getElementById('firstLegoSection');
    const robofestSection = document.getElementById('robofestSection');
    
    // Create audio element for timer end sound
    const timerEndSound = new Audio('/oldCarHorn.mp3');
    
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
    
    // Timer display
    const timerDisplay = document.getElementById('timer');
    const timerStatus = document.getElementById('timer-status');
    
    let timerInterval;
    let currentRound = {
        firstLego: 'round1',
        robofest: 'round1'
    };
    
    // Round tabs
    const roundTabs = document.querySelectorAll('.round-tab');
    roundTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            if (tab.classList.contains('disabled')) return;
            
            const section = tab.closest('.competition-section');
            const competition = section.id === 'firstLegoSection' ? 'firstLego' : 'robofest';
            const round = tab.dataset.round;
            
            // Update active tab
            section.querySelectorAll('.round-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update current round and refresh display
            currentRound[competition] = round;
            refreshScoreboard();
        });
    });
    
    // Initial timer check and data load
    fetchTimerStatus();
    loadScoreData();
    
    // Refresh data periodically
    setInterval(loadScoreData, 5000);
    
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
    
    function updateTimerUI(endTime) {
        const now = Date.now();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = '00:00';
            timerStatus.textContent = 'Time\'s up!';
            
            // Play timer end sound
            timerEndSound.play();
            
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerStatus.textContent = 'Running';
    }
    
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
    
    function loadScoreData() {
        fetch('/api/scores')
            .then(response => response.json())
            .then(data => {
                scoreData = data;
                refreshScoreboard();
                fetchTimerStatus(); // Also refresh timer status
            })
            .catch(error => console.error('Error loading score data:', error));
    }
    
    function refreshScoreboard() {
        renderScoreboard('firstLego', document.getElementById('firstLegoScoreboard'), currentRound.firstLego);
        renderScoreboard('robofest', document.getElementById('robofestScoreboard'), currentRound.robofest);
    }
    
    function renderScoreboard(competition, tableElement, round) {
        const teams = scoreData[competition].teams;
        const rounds = scoreData[competition].rounds;
        const tbody = tableElement.querySelector('tbody');
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Create array of teams with scores for ranking
        const teamsWithScores = teams.map(team => {
            return {
                ...team,
                score: rounds[round] && rounds[round][team.id] ? rounds[round][team.id] : 0
            };
        });
        
        // Sort by score (descending)
        teamsWithScores.sort((a, b) => b.score - a.score);
        
        // Create table rows
        teamsWithScores.forEach((team, index) => {
            const row = document.createElement('tr');
            
            // Rank
            const rankCell = document.createElement('td');
            rankCell.textContent = index + 1;
            row.appendChild(rankCell);
            
            // Team name and number
            const teamCell = document.createElement('td');
            teamCell.textContent = `${team.name} (#${team.number})`;
            row.appendChild(teamCell);
            
            // Score
            const scoreCell = document.createElement('td');
            scoreCell.textContent = team.score;
            scoreCell.className = 'score';
            row.appendChild(scoreCell);
            
            tbody.appendChild(row);
        });
    }
});