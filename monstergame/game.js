document.addEventListener("DOMContentLoaded", function () {
    const gameBoard = document.getElementById('game-board');

    // Create the board
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        gameBoard.appendChild(cell);
    }

    // Define players
    const players = [
        { id: 1, name: 'Player 1', class: 'player1', position: 0 },
        { id: 2, name: 'Player 2', class: 'player2', position: 1 },
        { id: 3, name: 'Player 3', class: 'player3', position: 2 },
        { id: 4, name: 'Player 4', class: 'player4', position: 3 }
    ];

    // Place players on the board
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.classList.add('player', player.class);
        const initialCell = gameBoard.children[player.position];
        initialCell.appendChild(playerElement);
    });
});
