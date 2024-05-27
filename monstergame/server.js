const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

let games = {};
let playerStats = {};

app.use(express.json());

// Route to create a new game
app.post('/create_game', (req, res) => {
  let newGameId = uuidv4();
  games[newGameId] = { /* initial game state */ };
  res.json({ gameId: newGameId });
});

// Route to get the total number of games
app.get('/total_games', (req, res) => {
  res.json({ totalGames: Object.keys(games).length });
});

// Route to get player statistics
app.get('/player_stats/:playerId', (req, res) => {
  let playerId = req.params.playerId;
  res.json(playerStats[playerId] || { wins: 0, losses: 0 });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
