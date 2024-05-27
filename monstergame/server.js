const express = require('express'); // Import Express framework
const { v4: uuidv4 } = require('uuid'); // Import UUID library to generate unique IDs
const path = require('path'); // Import path module for handling file paths

const app = express(); // Create an instance of Express
const port = 3000; // Define the port on which the server will run

let games = {};
let playerStats = {};

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Middleware to serve static files from the 'public' directory

// Route to create a new game
app.post('/create_game', (req, res) => {
  let newGameId = uuidv4(); // Generate a unique ID for the new game
  games[newGameId] = {
    board: Array.from({ length: 10 }, () => Array(10).fill(null)), // Initialize a 10x10 game board
    players: {}, // Object to store player data
    turnOrder: [], // Array to store the order of players' turns
    currentPlayerIndex: 0 // Index to track the current player
  };
  res.json({ gameId: newGameId }); // Respond with the new game ID
});

// Route for a player to join a game
app.post('/join_game', (req, res) => {
    const { gameId, playerId } = req.body; // Extract gameId and playerId from the request body
    if (games[gameId]) {
      games[gameId].players[playerId] = {
        monsters: [], // Array to store the player's monsters
        edge: determinePlayerEdge(Object.keys(games[gameId].players).length) // Determine the player's edge based on the number of players
      };
      games[gameId].turnOrder.push(playerId); // Add the player to the turn order
      res.json({ success: true }); // Respond with success
    } else {
      res.json({ success: false, message: "Game not found" }); // Respond with an error if the game doesn't exist
    }
  });
  
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
