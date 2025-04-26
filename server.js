// Required dependencies
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express(); // Initialize Express app

// ----------------------------
// Middleware Configuration
// ----------------------------

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware configuration
app.use(session({
    secret: 'secret',         // Secret key for session encryption (should be stored securely in production)
    resave: true,             // Force session to be saved even when unmodified
    saveUninitialized: true   // Save uninitialized sessions (useful for login sessions)
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------
// Global Timer Variables
// ----------------------------

// These will be used for a countdown timer feature
global.timerRunning = false;   // Whether the timer is active
global.timerEndTime = 0;       // Timestamp of when the timer should end
global.timerDuration = 0;      // Duration the timer should run

// ----------------------------
// In-Memory Score Storage (Simulating a database)
// ----------------------------

let scoreData = {
    firstLego: {
        teams: [], // List of teams
        rounds: {
            round1: {}, // Scores keyed by teamId
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

// Load saved data from file, if exists
try {
    if (fs.existsSync('scoreData.json')) {
        const data = fs.readFileSync('scoreData.json', 'utf8');
        scoreData = JSON.parse(data);
    }
} catch (err) {
    console.error('Error loading score data:', err);
}

// Save current scoreData to disk
function saveScoreData() {
    fs.writeFileSync('scoreData.json', JSON.stringify(scoreData, null, 2));
}

// ----------------------------
// Routes
// ----------------------------

// Home route - renders login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin login route (with hardcoded password)
app.post('/login', (req, res) => {
    if (req.body.password === "yeet") {
        req.session.loggedin = true;
        req.session.isAdmin = true;
        console.log("Admin logged in");
        res.redirect('/dashboard');
    } else {
        res.redirect('/?error=Invalid password');
    }
});

// Viewer login route (no password needed)
app.post('/view', (req, res) => {
    req.session.loggedin = true;
    req.session.isAdmin = false;
    res.redirect('/scoreboard');
});

// Admin-only dashboard
app.get('/dashboard', (req, res) => {
    if (req.session.loggedin && req.session.isAdmin) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/');
    }
});

// Scoreboard page (available to both admins and viewers)
app.get('/scoreboard', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'));
    } else {
        res.redirect('/');
    }
});

// ----------------------------
// API Endpoints
// ----------------------------

/**
 * GET /api/scores
 * Returns all score data.
 * For viewers, hides round 3 scores.
 */
app.get('/api/scores', (req, res) => {
    if (!req.session.isAdmin) {
        const viewerData = JSON.parse(JSON.stringify(scoreData)); // Deep copy to modify safely
        Object.keys(viewerData).forEach(competition => {
            viewerData[competition].rounds.round3 = {}; // Hide round 3
        });
        return res.json(viewerData);
    }

    // Admins get full data
    res.json(scoreData);
});

/**
 * POST /api/team
 * Admin-only. Adds a new team to the specified competition.
 */
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

    // Prevent duplicate teams by name or number
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

/**
 * POST /api/score
 * Admin-only. Records or updates a team's score for a specific round.
 */
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

    // Record score
    scoreData[competition].rounds[round][teamId] = parseInt(score);

    saveScoreData();
    res.json({ success: true, rounds: scoreData[competition].rounds });
});

/**
 * GET /api/timer
 * Returns current timer status and end time.
 */
app.get('/api/timer', (req, res) => {
    // Auto-stop timer if expired
    if (global.timerRunning && Date.now() > global.timerEndTime) {
        global.timerRunning = false;
    }

    res.json({
        running: global.timerRunning,
        endTime: global.timerEndTime
    });
});

/**
 * POST /api/timer/start
 * Admin-only. Starts a countdown timer in seconds.
 */
app.post('/api/timer/start', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    const { seconds } = req.body;

    if (!seconds || isNaN(parseInt(seconds))) {
        return res.status(400).json({ error: 'Invalid timer duration' });
    }

    const duration = parseInt(seconds) * 1000;
    const endTime = Date.now() + duration;

    global.timerRunning = true;
    global.timerEndTime = endTime;
    global.timerDuration = duration;

    res.json({ success: true, endTime, duration });
});

/**
 * POST /api/timer/stop
 * Admin-only. Stops the current timer.
 */
app.post('/api/timer/stop', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    global.timerRunning = false;

    res.json({ success: true });
});

/**
 * GET /logout
 * Destroys user session and redirects to login.
 */
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ----------------------------
// Server Startup
// ----------------------------

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});
