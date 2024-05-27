document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('game-board'); // Get the game board element
    let gameId, playerId;
    
  // Function to create a game
  function createGame() {
    fetch('/create_game', {
      method: 'POST'
    }).then(response => response.json()).then(data => {
      console.log('Game created:', data);
      gameId = data.gameId; // Store the gameId for future requests
      joinGame(gameId);
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

     // Initialize the board with 10x10 grid
      for (let i = 0; i < 10; i++) {
    const row = document.createElement('tr'); // Create a row
    for (let j = 0; j < 10; j++) {
      const cell = document.createElement('td'); // Create a cell
      cell.dataset.x = i; // Set cell coordinates
      cell.dataset.y = j;
      cell.addEventListener('click', placeOrMoveMonster); // Add click event listener for placing or moving a monster
      row.appendChild(cell); // Append cell to the row
    }
      board.appendChild(row); // Append row to the board
    }

     // Function to handle placing or moving a monster
  function placeOrMoveMonster(event) {
    const x = event.target.dataset.x;
    const y = event.target.dataset.y;
    if (event.target.textContent === '') {
      placeMonster(x, y); // Place a monster if the cell is empty
    } else {
      moveMonster(x, y); // Move a monster if the cell is not empty
    }
  }
  // Function to place a monster
  function placeMonster(x, y) {
    fetch('/place_monster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, playerId, monsterType: 'vampire', x, y }) // Send request to place a vampire at the specified coordinates
    }).then(response => response.json()).then(data => {
      if (data.success) {
        updateBoard(data.game.board); // Update the board if placement is successful
      } else {
        alert(data.message); // Show an error message if placement is invalid
      }
    });
  }
   // Function to move a monster (NEXT TO IMPLEMET)
   function moveMonster(x, y) {
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

  });
  