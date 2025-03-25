const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize global timer variables
global.timerRunning = false;
global.timerEndTime = 0;
global.timerDuration = 0;

// Data store for scores (in a real app, this would be a database)
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

// Load data if exists
try {
    if (fs.existsSync('scoreData.json')) {
        const data = fs.readFileSync('scoreData.json', 'utf8');
        scoreData = JSON.parse(data);
    }
} catch (err) {
    console.error('Error loading score data:', err);
}

// Save data function
function saveScoreData() {
    fs.writeFileSync('scoreData.json', JSON.stringify(scoreData, null, 2));
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    if (req.body.password === "yeet") {
        // Admin login
        req.session.loggedin = true;
        req.session.isAdmin = true;
        console.log("Admin logged in");
        res.redirect('/dashboard');
    } else {
        res.redirect('/?error=Invalid password');
    }
});

app.post('/view', (req, res) => {
    // Viewer login (no password required)
    req.session.loggedin = true;
    req.session.isAdmin = false;
    res.redirect('/scoreboard');
});

app.get('/dashboard', (req, res) => {
    if (req.session.loggedin && req.session.isAdmin) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/');
    }
});

app.get('/scoreboard', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'));
    } else {
        res.redirect('/');
    }
});

// API Endpoints
app.get('/api/scores', (req, res) => {
    // For viewers, hide round 3 data
    if (!req.session.isAdmin) {
        const viewerData = JSON.parse(JSON.stringify(scoreData));
        
        // Remove round 3 data for non-admins
        Object.keys(viewerData).forEach(competition => {
            viewerData[competition].rounds.round3 = {};
        });
        
        return res.json(viewerData);
    }
    
    // Send all data for admins
    res.json(scoreData);
});

app.post('/api/team', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { competition, teamName, teamNumber } = req.body;
    
    if (!competition || !teamName || !teamNumber) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!scoreData[competition]) {
        return res.status(400).json({ error: 'Invalid competition' });
    }
    
    // Check if team already exists
    const existingTeam = scoreData[competition].teams.find(team => 
        team.number === teamNumber || team.name === teamName
    );
    
    if (existingTeam) {
        return res.status(400).json({ error: 'Team already exists' });
    }
    
    // Add team
    const newTeam = {
        id: Date.now().toString(),
        name: teamName,
        number: teamNumber
    };
    
    scoreData[competition].teams.push(newTeam);
    
    saveScoreData();
    res.json({ success: true, teams: scoreData[competition].teams });
});

app.post('/api/score', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { competition, teamId, round, score } = req.body;
    
    if (!competition || !teamId || !round || score === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!scoreData[competition]) {
        return res.status(400).json({ error: 'Invalid competition' });
    }
    
    if (!['round1', 'round2', 'round3'].includes(round)) {
        return res.status(400).json({ error: 'Invalid round' });
    }
    
    // Update score
    scoreData[competition].rounds[round][teamId] = parseInt(score);
    
    saveScoreData();
    res.json({ success: true, rounds: scoreData[competition].rounds });
});

app.get('/api/timer', (req, res) => {
    // Automatically stop timer if expired
    if (global.timerRunning && Date.now() > global.timerEndTime) {
        global.timerRunning = false;
    }

    res.json({
        running: global.timerRunning,
        endTime: global.timerEndTime
    });
});

app.post('/api/timer/start', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { seconds } = req.body; // Change from minutes to seconds
    if (!seconds || isNaN(parseInt(seconds))) {
        return res.status(400).json({ error: 'Invalid timer duration' });
    }
    
    const duration = parseInt(seconds) * 1000; // Convert seconds to milliseconds
    const endTime = Date.now() + duration;
    
    global.timerRunning = true;
    global.timerEndTime = endTime;
    global.timerDuration = duration;
    
    res.json({ success: true, endTime, duration });
});

app.post('/api/timer/stop', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    
    global.timerRunning = false;
    
    res.json({ success: true });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});