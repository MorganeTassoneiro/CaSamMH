document.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('game-board'); // Get the game board element
  let gameId, playerId;
  let selectedMonsterType = 'vampire'; // Default to vampire
  let selectedMonster = null; // To store the coordinates of the selected monster
  let hasPlacedMonster = false; // Track if the player has placed a monster

  const socket = io(); // Initialize Socket.io

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
      joinGame(gameId, `player${Math.floor(Math.random() * 4)}`); // Generate a random player ID
      fetchGameStats(); // Fetch and display updated game statistics
    });
  }

  // Function to join a game
  function joinGame(gameId, player) {
    fetch('/join_game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, playerId: player })
    }).then(response => response.json()).then(data => {
      if (data.success) {
        console.log('Joined game:', data);
        playerId = player;
        initializeBoard();
      } else {
        console.error('Failed to join game:', data.message);
      }
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
      if (event.target.textContent === '' && !hasPlacedMonster) {
        placeMonster(x, y); // Place a monster if the cell is empty and the player hasn't placed one yet
      } else if (event.target.textContent !== '') {
        selectMonster(x, y); // Select a monster for movement
      } else {
        alert("You can only place one monster per turn.");
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
        hasPlacedMonster = true; // Mark that the player has placed a monster
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
        hasPlacedMonster = false; // Reset the flag for the next turn
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
        cell.className = ''; // Clear previous classes
        cell.textContent = ''; // Clear previous content
        if (board[i][j]) {
          const monster = board[i][j];
          if (Array.isArray(monster)) {
            monster.forEach(m => {
              cell.classList.add(m.type); // Add the monster type as a class
              cell.textContent += m.type.charAt(0).toUpperCase(); // Set the cell content to the first letter of the monster type
            });
          } else {
            cell.classList.add(monster.type); // Add the monster type as a class
            cell.textContent = monster.type.charAt(0).toUpperCase(); // Set the cell content to the first letter of the monster type
          }
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

  // Handle update_turn event from the server to update the current player turn
  socket.on('update_turn', (data) => {
    document.getElementById('current-player').innerText = data.currentPlayer;
  });

  // Handle update_board event from the server to update the game board
  socket.on('update_board', (board) => {
    updateBoard(board);
  });

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
