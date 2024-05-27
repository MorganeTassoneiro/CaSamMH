const express = require('express'); // Import Express framework
const { v4: uuidv4 } = require('uuid'); // Import UUID library to generate unique IDs
const path = require('path'); // Import path module for handling file paths
const http = require('http');
const socketIo = require('socket.io');

const app = express(); // Create an instance of Express
const server = http.createServer(app); // Create an HTTP server
const io = socketIo(server); // Attach socket.io to the server
const port = 3000; // Define the port on which the server will run

let games = {}; // Object to store game states
let totalGamesPlayed = 0; // Track the total number of games played
let playerWinStats = {}; // Track the number of games won and lost by each player

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Middleware to serve static files from the 'public' directory

// Initialize player statistics if they don't exist
function initializePlayerStats(playerId) {
  if (!playerWinStats[playerId]) {
    playerWinStats[playerId] = { wins: 0, losses: 0 };
  }
}

// Route to create a new game
app.post('/create_game', (req, res) => {
  let newGameId = uuidv4(); // Generate a unique ID for the new game
  games[newGameId] = {
    board: Array.from({ length: 10 }, () => Array(10).fill(null)), // Initialize a 10x10 game board
    players: {}, // Object to store player data
    turnOrder: [], // Array to store the order of players' turns
    currentPlayerIndex: 0, // Track the current player's index in the turn order
    turnsTaken: {}, // Track turns taken by each player in the current round
    eliminatedPlayers: {}, // Track eliminated players
    playerLosses: {} // Track the number of monsters each player has lost
  };
  totalGamesPlayed++; // Increment the total number of games played
  console.log(`Game created with ID: ${newGameId}. Total games played: ${totalGamesPlayed}`);
  res.json({ gameId: newGameId, totalGamesPlayed }); // Respond with the new game ID and total games played
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
    games[gameId].turnsTaken[playerId] = false; // Initialize turn taken to false for the player
    games[gameId].eliminatedPlayers[playerId] = false; // Initialize player as not eliminated
    games[gameId].playerLosses[playerId] = 0; // Initialize player loss count
    console.log(`Player ${playerId} joined game ${gameId}`);
    res.json({ success: true });
  } else {
    console.log(`Game not found: ${gameId}`);
    res.json({ success: false, message: "Game not found" });
  }
});

// Route to place a monster on the board
app.post('/place_monster', (req, res) => {
  const { gameId, playerId, monsterType, x, y } = req.body; // Extract data from the request body
  let game = games[gameId]; // Get the game state
  console.log(`Player ${playerId} attempting to place ${monsterType} at (${x}, ${y}) in game ${gameId}`);
  if (game && game.turnOrder[game.currentPlayerIndex] === playerId && isValidPlacement(game, playerId, x, y)) {
    game.board[x][y] = { type: monsterType, player: playerId }; // Place the monster on the board
    game.players[playerId].monsters.push({ type: monsterType, x, y }); // Add the monster to the player's list of monsters
    console.log(`Monster placed by ${playerId} at (${x}, ${y})`);
    res.json({ success: true, game });
  } else {
    console.log(`Invalid placement or not ${playerId}'s turn`);
    res.json({ success: false, message: "Invalid placement or not your turn" });
  }
});

// Route to move a monster on the board
app.post('/move_monster', (req, res) => {
  const { gameId, playerId, fromX, fromY, toX, toY } = req.body; // Extract data from the request body
  let game = games[gameId]; // Get the game state
  console.log(`Player ${playerId} attempting to move monster from (${fromX}, ${fromY}) to (${toX}, ${toY}) in game ${gameId}`);
  if (game && game.turnOrder[game.currentPlayerIndex] === playerId && isValidMove(game, playerId, fromX, fromY, toX, toY)) {
    let monster = game.board[fromX][fromY]; // Get the monster to be moved
    game.board[fromX][fromY] = null; // Remove the monster from its original position

    // If the destination cell is not empty, it means a conflict needs to be resolved
    if (game.board[toX][toY] !== null) {
      if (!Array.isArray(game.board[toX][toY])) {
        game.board[toX][toY] = [game.board[toX][toY]]; // Convert to array if not already an array
      }
      game.board[toX][toY].push(monster); // Add the moving monster to the destination cell
    } else {
      game.board[toX][toY] = monster; // Place the monster at the new position if the cell is empty
    }

    monster.x = toX; // Update the monster's coordinates
    monster.y = toY;
    resolveConflict(game, toX, toY); // Resolve any conflicts at the new position
    console.log(`Monster moved by ${playerId} from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    res.json({ success: true, game });
  } else {
    console.log(`Invalid move or not ${playerId}'s turn`);
    res.json({ success: false, message: "Invalid move or not your turn" });
  }
});

// Route to end the player's turn
app.post('/end_turn', (req, res) => {
  const { gameId, playerId } = req.body;
  let game = games[gameId];
  if (game && game.turnOrder[game.currentPlayerIndex] === playerId) {
    game.turnsTaken[playerId] = true; // Mark turn as taken
    console.log(`Player ${playerId} ended their turn in game ${gameId}`);
    checkEndRound(game); // Check if the round should end
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Invalid request or not your turn" });
  }
});

// Route to check if the turn should end automatically
app.get('/check_end_turn', (req, res) => {
  const { gameId, playerId } = req.query;
  let game = games[gameId];
  if (game && game.turnOrder[game.currentPlayerIndex] === playerId) {
    if (hasNoMovesLeft(game, playerId)) {
      res.json({ endTurn: true });
    } else {
      res.json({ endTurn: false });
    }
  } else {
    res.json({ endTurn: false });
  }
});

// Route to get game statistics
app.get('/game_stats', (req, res) => {
  res.json({ totalGamesPlayed, playerWinStats });
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
  // Ensure the move is within the board limits
  if (toX < 0 || toX >= 10 || toY < 0 || toY >= 10) {
    return false;
  }

  // Check if the move is valid based on the movement rules
  if (
    (Math.abs(toX - fromX) <= 2 && Math.abs(toY - fromY) <= 2) && // Move up to 2 squares diagonally
    (Math.abs(toX - fromX) === Math.abs(toY - fromY) || toX === fromX || toY === fromY) && // Move horizontally, vertically, or diagonally
    !isBlocked(game, fromX, fromY, toX, toY) // Check if the path is blocked
  ) {
    return true;
  }
  return false;
}

// Function to check if the path is blocked by other players' monsters
function isBlocked(game, fromX, fromY, toX, toY) {
  const dx = Math.sign(toX - fromX);
  const dy = Math.sign(toY - fromY);
  let x = fromX + dx;
  let y = fromY + dy;
  while (x !== toX || y !== toY) {
    if (game.board[x][y] && game.board[x][y].player !== game.board[fromX][fromY].player) {
      return true; // Path is blocked by another player's monster
    }
    x += dx;
    y += dy;
  }
  return false;
}

// Function to resolve conflicts when monsters end up on the same square
function resolveConflict(game, x, y) {
  let monsters = game.board[x][y]; // Get the monsters at the given position

  if (Array.isArray(monsters) && monsters.length > 1) {
    let types = monsters.map(m => m.type); // Get the types of the monsters
    let remainingMonster = null; // To store the monster that will remain

    // Handle conflicts based on monster types
    if (types.includes('vampire') && types.includes('werewolf')) {
      remainingMonster = monsters.find(m => m.type === 'vampire');
      removeMonster(game, x, y, 'werewolf'); // Remove the werewolf if there's a vampire and a werewolf
    } else if (types.includes('werewolf') && types.includes('ghost')) {
      remainingMonster = monsters.find(m => m.type === 'werewolf');
      removeMonster(game, x, y, 'ghost'); // Remove the ghost if there's a werewolf and a ghost
    } else if (types.includes('ghost') && types.includes('vampire')) {
      remainingMonster = monsters.find(m => m.type === 'ghost');
      removeMonster(game, x, y, 'vampire'); // Remove the vampire if there's a ghost and a vampire
    } else if (types.filter(type => type === 'vampire').length > 1) {
      removeAllOfType(game, x, y, 'vampire'); // Remove both vampires if there are two vampires
    } else if (types.filter(type => type === 'werewolf').length > 1) {
      removeAllOfType(game, x, y, 'werewolf'); // Remove both werewolves if there are two werewolves
    } else if (types.filter(type => type === 'ghost').length > 1) {
      removeAllOfType(game, x, y, 'ghost'); // Remove both ghosts if there are two ghosts
    }

    // After resolving the conflict, ensure only one monster remains
    if (remainingMonster) {
      game.board[x][y] = remainingMonster;
    }
  }
}

// Function to remove a specific type of monster from the board and track losses
function removeMonster(game, x, y, type) {
  let index = game.board[x][y].findIndex(m => m.type === type); // Find the index of the monster to be removed
  if (index > -1) {
    const playerId = game.board[x][y][index].player; // Get the player ID of the monster
    game.board[x][y].splice(index, 1); // Remove the monster from the board
    game.playerLosses[playerId]++; // Increment the player's loss count
    console.log(`Removed ${type} from (${x}, ${y}) by player ${playerId}`);
    if (game.playerLosses[playerId] >= 10) {
      eliminatePlayer(game, playerId); // Eliminate the player if they have lost 10 monsters
    }
  }
}

// Function to remove all monsters of a specific type from the board and track losses
function removeAllOfType(game, x, y, type) {
  while (game.board[x][y].some(m => m.type === type)) {
    removeMonster(game, x, y, type); // Remove each monster of the given type
  }
}

// Function to eliminate a player
function eliminatePlayer(game, playerId) {
  game.eliminatedPlayers[playerId] = true; // Mark the player as eliminated
  console.log(`Player ${playerId} has been eliminated`);
  checkForWinner(game); // Check if there's a winner
}

// Function to check if there's a winner
function checkForWinner(game) {
  const remainingPlayers = Object.keys(game.eliminatedPlayers).filter(playerId => !game.eliminatedPlayers[playerId]);
  if (remainingPlayers.length === 1) {
    const winner = remainingPlayers[0];
    console.log(`Player ${winner} wins the game!`);

    // Update player statistics
    initializePlayerStats(winner);
    playerWinStats[winner].wins++;

    Object.keys(game.players).forEach(playerId => {
      if (playerId !== winner) {
        initializePlayerStats(playerId);
        playerWinStats[playerId].losses++;
      }
    });

    // Emit game over event
    io.emit('game_over', { winner, playerWinStats, totalGamesPlayed });
  }
}

// Function to check if a player has no more moves left
function hasNoMovesLeft(game, playerId) {
  const playerMonsters = game.players[playerId].monsters;
  for (let monster of playerMonsters) {
    const { x, y } = monster;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (isValidMove(game, playerId, x, y, x + dx, y + dy)) {
          return false;
        }
      }
    }
  }
  return true;
}

// Function to determine the next player
function getNextPlayer(game) {
  do {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
  } while (game.eliminatedPlayers[game.turnOrder[game.currentPlayerIndex]]);
  return game.turnOrder[game.currentPlayerIndex];
}

// Check if the turn should end automatically
function checkEndTurn(game, playerId) {
  if (hasNoMovesLeft(game, playerId)) {
    console.log(`Player ${playerId} has no more moves. Ending turn automatically.`);
    game.turnsTaken[playerId] = true; // Mark turn as taken
    checkEndRound(game); // Check if the round should end
  }
}

// Function to check if the round should end and handle end of round logic
function checkEndRound(game) {
  if (Object.values(game.turnsTaken).every(taken => taken)) {
    console.log(`All players have taken their turns. Ending round.`);
    // Reset turnsTaken for the next round
    Object.keys(game.turnsTaken).forEach(playerId => game.turnsTaken[playerId] = false);
    // Start the next round with the player with the fewest monsters
    game.currentPlayerIndex = 0;
  } else {
    // Set the next player for the current round
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
    while (game.turnsTaken[game.turnOrder[game.currentPlayerIndex]] || game.eliminatedPlayers[game.turnOrder[game.currentPlayerIndex]]) {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
    }
  }
  game.currentPlayer = game.turnOrder[game.currentPlayerIndex];
}

// Start the server and listen on the defined port
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
