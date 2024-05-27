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
  
  // Route to place a monster on the board
app.post('/place_monster', (req, res) => {
    const { gameId, playerId, monsterType, x, y } = req.body; // Extract data from the request body
    let game = games[gameId]; // Get the game state
    if (game && isValidPlacement(game, playerId, x, y)) {
      game.board[x][y] = { type: monsterType, player: playerId }; // Place the monster on the board
      game.players[playerId].monsters.push({ type: monsterType, x, y }); // Add the monster to the player's list of monsters
      res.json({ success: true, game }); // Respond with the updated game state
    } else {
      res.json({ success: false, message: "Invalid placement" }); // Respond with an error if the placement is invalid
    }
  });
  
  // Route to move a monster on the board
app.post('/move_monster', (req, res) => {
    const { gameId, playerId, fromX, fromY, toX, toY } = req.body; // Extract data from the request body
    let game = games[gameId]; // Get the game state
    if (game && isValidMove(game, playerId, fromX, fromY, toX, toY)) {
      let monster = game.board[fromX][fromY]; // Get the monster to be moved
      game.board[fromX][fromY] = null; // Remove the monster from its original position
      game.board[toX][toY] = monster; // Place the monster at the new position
      monster.x = toX; // Update the monster's coordinates
      monster.y = toY;
      resolveConflict(game, toX, toY); // Resolve any conflicts at the new position
      res.json({ success: true, game }); // Respond with the updated game state
    } else {
      res.json({ success: false, message: "Invalid move" }); // Respond with an error if the move is invalid
    }
  });
  // Function to determine the player's edge based on the number of players
function determinePlayerEdge(playerIndex) {
  const edges = ['top', 'right', 'bottom', 'left']; // Define the edges
  return edges[playerIndex % edges.length]; // Return the corresponding edge for the player
}
// Function to validate if a monster placement is valid
function isValidPlacement(game, playerId, x, y) {
  let playerEdge = game.players[playerId].edge; // Get the player's edge
  if (playerEdge === 'top' && x === 0) return true; // Validate placement based on the player's edge
  if (playerEdge === 'right' && y === 9) return true;
  if (playerEdge === 'bottom' && x === 9) return true;
  if (playerEdge === 'left' && y === 0) return true;
  return false;
}
// Function to validate if a monster move is valid
function isValidMove(game, playerId, fromX, fromY, toX, toY) {
  // Check if the move is valid based on the movement rules
  if (Math.abs(toX - fromX) <= 1 && Math.abs(toY - fromY) <= 1) {
    return true;
  }
  return false;
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
