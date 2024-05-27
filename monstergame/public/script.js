document.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('game-board'); // Get the game board element
  let gameId, playerId;
  let selectedMonsterType = 'vampire'; // Default to vampire
  let selectedMonster = null; // To store the coordinates of the selected monster

  // Function to fetch and display game statistics
  function fetchGameStats() {
    fetch('/game_stats')
      .then(response => response.json())
      .then(data => {
        displayGameStats(data);
      });
  }

  // Function to display game statistics
  function displayGameStats(stats) {
    const statsContainer = document.getElementById('stats');
    statsContainer.innerHTML = `
      <p>Total Games Played: ${stats.totalGamesPlayed}</p>
      <h3>Player Win/Loss Statistics:</h3>
      <ul>
        ${Object.entries(stats.playerWinStats).map(([playerId, stats]) => `
          <li>${playerId} - Wins: ${stats.wins}, Losses: ${stats.losses}</li>
        `).join('')}
      </ul>
    `;
  }

  // Function to select the monster type
  function selectMonsterType(type) {
    selectedMonsterType = type;
    console.log(`Selected monster type: ${selectedMonsterType}`);
  }

  // Make selectMonsterType function available globally
  window.selectMonsterType = selectMonsterType;

  // Function to create a game
  function createGame() {
    fetch('/create_game', {
      method: 'POST'
    }).then(response => response.json()).then(data => {
      console.log('Game created:', data);
      gameId = data.gameId; // Store the gameId for future requests
      joinGame(gameId);
      fetchGameStats(); // Fetch and display updated game statistics
    });
  }

  // Function to join a game
  function joinGame(gameId) {
    fetch('/join_game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: gameId, playerId: 'player1' })
    }).then(response => response.json()).then(data => {
      console.log('Joined game:', data);
      playerId = 'player1'; // Store the playerId for future requests
      initializeBoard();
    });
  }

  // Function to initialize the board with 10x10 grid
  function initializeBoard() {
    for (let i = 0; i < 10; i++) {
      const row = document.createElement('tr'); // Create a row
      for (let j = 0; j < 10; j++) {
        const cell = document.createElement('td'); // Create a cell
        cell.dataset.x = i; // Set cell coordinates
        cell.dataset.y = j;
        cell.addEventListener('click', handleCellClick); // Add click event listener for placing or moving a monster
        row.appendChild(cell); // Append cell to the row
      }
      board.appendChild(row); // Append row to the board
    }
  }

  // Function to handle placing or moving a monster
  function handleCellClick(event) {
    const x = parseInt(event.target.dataset.x, 10);
    const y = parseInt(event.target.dataset.y, 10);
    if (selectedMonster) {
      moveMonster(selectedMonster.x, selectedMonster.y, x, y); // Move the selected monster
    } else {
      if (event.target.textContent === '') {
        placeMonster(x, y); // Place a monster if the cell is empty
      } else {
        selectMonster(x, y); // Select a monster for movement
      }
    }
  }

  // Function to place a monster
  function placeMonster(x, y) {
    console.log(`Placing ${selectedMonsterType} at (${x}, ${y})`);
    fetch('/place_monster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, playerId, monsterType: selectedMonsterType, x, y }) // Send request to place the selected monster type at the specified coordinates
    }).then(response => response.json()).then(data => {
      if (data.success) {
        updateBoard(data.game.board); // Update the board if placement is successful
        checkEndTurn(); // Check if the turn should end automatically
      } else {
        alert(data.message); // Show an error message if placement is invalid
      }
    });
  }

  // Function to select a monster for movement
  function selectMonster(x, y) {
    console.log(`Selected monster at (${x}, ${y}) for movement`);
    selectedMonster = { x, y };
  }

  // Function to move a monster
  function moveMonster(fromX, fromY, toX, toY) {
    console.log(`Moving monster from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    fetch('/move_monster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, playerId, fromX, fromY, toX, toY }) // Send request to move the monster
    }).then(response => response.json()).then(data => {
      if (data.success) {
        updateBoard(data.game.board); // Update the board if move is successful
        selectedMonster = null; // Clear the selected monster
        checkEndTurn(); // Check if the turn should end automatically
      } else {
        alert(data.message); // Show an error message if move is invalid
      }
    });
  }

  // Function to end the player's turn
  function endTurn() {
    console.log('Ending turn');
    fetch('/end_turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, playerId }) // Send request to end the turn
    }).then(response => response.json()).then(data => {
      if (data.success) {
        console.log('Turn ended');
        checkEndRound(); // Check if the round should end
      } else {
        alert(data.message); // Show an error message if ending the turn fails
      }
    });
  }

  // Make endTurn function available globally
  window.endTurn = endTurn;

  // Function to check if the turn should end automatically
  function checkEndTurn() {
    fetch(`/check_end_turn?gameId=${gameId}&playerId=${playerId}`, {
      method: 'GET'
    }).then(response => response.json()).then(data => {
      if (data.endTurn) {
        console.log('No more moves left. Ending turn automatically.');
        endTurn(); // End the turn automatically if there are no moves left
      }
    });
  }

  // Function to update the board with the current game state
  function updateBoard(board) {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const cell = document.querySelector(`td[data-x="${i}"][data-y="${j}"]`);
        if (board[i][j]) {
          cell.textContent = board[i][j].type; // Display the monster type in the cell
        } else {
          cell.textContent = ''; // Clear the cell if there's no monster
        }
      }
    }
  }

  // Function to check if the round should end
  function checkEndRound() {
    fetch(`/check_end_round?gameId=${gameId}`)
      .then(response => response.json())
      .then(data => {
        if (data.endRound) {
          console.log('Ending round automatically.');
          fetchGameStats(); // Fetch and display updated game statistics
        }
      });
  }

  // Function to handle game over event
  function handleGameOver(event) {
    const data = event.detail;
    alert(`Game Over! Player ${data.winner} wins!`);
    displayGameStats({ totalGamesPlayed: data.totalGamesPlayed, playerWinStats: data.playerWinStats });
  }

  // Listen for game over event
  window.addEventListener('game_over', handleGameOver);

  // Start by creating a game
  createGame();
  fetchGameStats(); // Fetch and display initial game statistics
});
