const express = require('express'); // Import Express framework
const { v4: uuidv4 } = require('uuid'); // Import UUID library to generate unique IDs
const path = require('path'); // Import path module for handling file paths

const app = express(); // Create an instance of Express
const port = 3000; // Define the port on which the server will run

let games = {}; // Object to store game states
let playerStats = {}; // Object to store player statistics

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
    games[gameId].turnOrder.push(playerId);
    if (!games[gameId].currentPlayer) {
      games[gameId].currentPlayer = playerId;
    }
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Game not found" }); // Respond with an error if the game doesn't exist
  }
});

// Route to place a monster on the board
app.post('/place_monster', (req, res) => {
  const { gameId, playerId, monsterType, x, y } = req.body;
  let game = games[gameId];
  if (game && game.currentPlayer === playerId && isValidPlacement(game, playerId, x, y)) {
    game.board[x][y] = { type: monsterType, player: playerId };
    game.players[playerId].monsters.push({ type: monsterType, x, y });
    game.currentPlayer = getNextPlayer(game);
    res.json({ success: true, game });
  } else {
    res.json({ success: false, message: "Invalid placement" }); // Respond with an error if the placement is invalid
  }
});

// Route to move a monster on the board
app.post('/move_monster', (req, res) => {
  const { gameId, playerId, fromX, fromY, toX, toY } = req.body;
  let game = games[gameId];
  if (game && game.currentPlayer === playerId && isValidMove(game, playerId, fromX, fromY, toX, toY)) {
    let monster = game.board[fromX][fromY];
    game.board[fromX][fromY] = null;
    game.board[toX][toY] = monster;
    monster.x = toX;
    monster.y = toY;
    resolveConflict(game, toX, toY);
    game.currentPlayer = getNextPlayer(game);
    res.json({ success: true, game });
  } else {
    res.json({ success: false, message: "Invalid move or not your turn" });
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
  let isEdgeValid = false;
  if (playerEdge === 'top' && x === 0) isEdgeValid = true;
  if (playerEdge === 'right' && y === 9) isEdgeValid = true;
  if (playerEdge === 'bottom' && x === 9) isEdgeValid = true;
  if (playerEdge === 'left' && y === 0) isEdgeValid = true;

  if (isEdgeValid && game.board[x][y] === null) {
    return true;
  }
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

// Function to resolve conflicts when monsters end up on the same square
function resolveConflict(game, x, y) {
  let monsters = game.board[x][y]; // Get the monsters at the given position
  if (Array.isArray(monsters) && monsters.length > 1) {
    let types = monsters.map(m => m.type); // Get the types of the monsters
    if (types.includes('vampire') && types.includes('werewolf')) {
      removeMonster(game, x, y, 'werewolf'); // Remove the werewolf if there's a vampire and a werewolf
    } else if (types.includes('werewolf') && types.includes('ghost')) {
      removeMonster(game, x, y, 'ghost'); // Remove the ghost if there's a werewolf and a ghost
    } else if (types.includes('ghost') && types.includes('vampire')) {
      removeMonster(game, x, y, 'vampire'); // Remove the vampire if there's a ghost and a vampire
    } else if (types[0] === types[1]) {
      game.board[x][y] = null; // Remove both monsters if they are of the same type
    }
  }
}

// Function to remove a monster from the board
function removeMonster(game, x, y, type) {
  let index = game.board[x][y].findIndex(m => m.type === type); // Find the index of the monster to be removed
  if (index > -1) {
    game.board[x][y].splice(index, 1); // Remove the monster from the board
  }
}

// Start the server and listen on the defined port
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
