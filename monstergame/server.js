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
    currentPlayer: null // Track the current player
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
    if (!games[gameId].currentPlayer) {
      games[gameId].currentPlayer = playerId; // Set the current player if not already set
    }
    res.json({ success: true }); // Respond with success
  } else {
    res.json({ success: false, message: "Game not found" }); // Respond with an error if the game doesn't exist
  }
});

// Route to place a monster on the board
app.post('/place_monster', (req, res) => {
  const { gameId, playerId, monsterType, x, y } = req.body; // Extract data from the request body
  let game = games[gameId]; // Get the game state
  if (game && game.currentPlayer === playerId && isValidPlacement(game, playerId, x, y)) {
    game.board[x][y] = { type: monsterType, player: playerId }; // Place the monster on the board
    game.players[playerId].monsters.push({ type: monsterType, x, y }); // Add the monster to the player's list of monsters
    game.currentPlayer = getNextPlayer(game); // Determine the next player
    res.json({ success: true, game }); // Respond with the updated game state
  } else {
    res.json({ success: false, message: "Invalid placement or not your turn" }); // Respond with an error if the placement is invalid or not the player's turn
  }
});

// Route to move a monster on the board
app.post('/move_monster', (req, res) => {
  const { gameId, playerId, fromX, fromY, toX, toY } = req.body; // Extract data from the request body
  let game = games[gameId]; // Get the game state
  if (game && game.currentPlayer === playerId && isValidMove(game, playerId, fromX, fromY, toX, toY)) {
    let monster = game.board[fromX][fromY]; // Get the monster to be moved
    game.board[fromX][fromY] = null; // Remove the monster from its original position
    game.board[toX][toY] = monster; // Place the monster at the new position
    monster.x = toX; // Update the monster's coordinates
    monster.y = toY;
    resolveConflict(game, toX, toY); // Resolve any conflicts at the new position
    game.currentPlayer = getNextPlayer(game); // Determine the next player
    res.json({ success: true, game }); // Respond with the updated game state
  } else {
    res.json({ success: false, message: "Invalid move or not your turn" }); // Respond with an error if the move is invalid or not the player's turn
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

  // Check if the placement is on the player's edge
  if (playerEdge === 'top' && x === 0 && y >= 0 && y < 10) isEdgeValid = true; // Top edge
  if (playerEdge === 'right' && y === 9 && x >= 0 && x < 10) isEdgeValid = true; // Right edge
  if (playerEdge === 'bottom' && x === 9 && y >= 0 && y < 10) isEdgeValid = true; // Bottom edge
  if (playerEdge === 'left' && y === 0 && x >= 0 && x < 10) isEdgeValid = true; // Left edge

  // Ensure the placement is within the grid and the target cell is empty
  if (isEdgeValid && game.board[x][y] === null) {
    return true;
  }
  return false;
}

// Function to validate if a monster move is valid
function isValidMove(game, playerId, fromX, fromY, toX, toY) {
  // Check if the move is valid based on the movement rules
  if (Math.abs(toX - fromX) <= 2 && Math.abs(toY - fromY) <= 2 && 
      (Math.abs(toX - fromX) === Math.abs(toY - fromY) || 
      toX === fromX || 
      toY === fromY)) {
    // Ensure the destination is not occupied by another player's monster
    if (game.board[toX][toY] === null || game.board[toX][toY].player === playerId) {
      return true;
    }
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

// Function to determine the next player based on the fewest monsters
function getNextPlayer(game) {
  let playerIds = Object.keys(game.players);
  let minMonsters = Math.min(...playerIds.map(id => game.players[id].monsters.length));
  let eligiblePlayers = playerIds.filter(id => game.players[id].monsters.length === minMonsters);
  return eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
}

// Start the server and listen on the defined port
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
