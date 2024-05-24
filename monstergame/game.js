document.addEventListener("DOMContentLoaded", function () {
    const gameBoard = document.getElementById('game-board');

    // Create the board
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i; // Store the index in the cell for easy access
        gameBoard.appendChild(cell);
    }

    // Define players
    const players = [
        { id: 1, name: 'Player 1', class: 'player1', monsters: [] },
        { id: 2, name: 'Player 2', class: 'player2', monsters: [] },
        { id: 3, name: 'Player 3', class: 'player3', monsters: [] },
        { id: 4, name: 'Player 4', class: 'player4', monsters: [] }
    ];

    let currentPlayerIndex = 0;
    let currentTurnStage = 'place'; // 'place' or 'move'
    let placedMonsterIndex = null;

    function renderBoard() {
        // Clear the board
        document.querySelectorAll('.player').forEach(el => el.remove());

        // Place the monsters on the board
        players.forEach(player => {
            player.monsters.forEach(position => {
                const monsterElement = document.createElement('div');
                monsterElement.classList.add('player', player.class);
                gameBoard.children[position].appendChild(monsterElement);
            });
        });
    }

    function handleCellClick(event) {
        const cellIndex = parseInt(event.target.dataset.index);
        const currentPlayer = players[currentPlayerIndex];

        if (currentTurnStage === 'place') {
            if (!currentPlayer.monsters.includes(cellIndex)) {
                currentPlayer.monsters.push(cellIndex);
                placedMonsterIndex = cellIndex;
                currentTurnStage = 'move';
                renderBoard();
            }
        } else if (currentTurnStage === 'move') {
            if (currentPlayer.monsters.includes(cellIndex)) {
                const newPosition = prompt("Enter new position (0-99):", cellIndex);
                if (newPosition !== null && newPosition >= 0 && newPosition < 100) {
                    if (cellIndex !== placedMonsterIndex) {
                        const index = currentPlayer.monsters.indexOf(cellIndex);
                        currentPlayer.monsters[index] = parseInt(newPosition);
                        renderBoard();
                    } else {
                        alert("You cannot move the monster you just placed.");
                    }
                }
            } else {
                alert("You can only move your own monsters.");
            }
        }
    }

    function nextTurn() {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        currentTurnStage = 'place';
        placedMonsterIndex = null;
        alert(`It's now ${players[currentPlayerIndex].name}'s turn!`);
    }

    gameBoard.addEventListener('click', handleCellClick);

    document.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            nextTurn();
        }
    });

    renderBoard();
    alert(`It's now ${players[currentPlayerIndex].name}'s turn!`);
});
