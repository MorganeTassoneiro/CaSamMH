document.addEventListener("DOMContentLoaded", function () {
    const gameBoard = document.getElementById('game-board');

    // Create the board
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i; // Store the index in the cell for easy access
        gameBoard.appendChild(cell);
    }

    // Define players and their territories
    const players = [
        { id: 1, name: 'Player 1', class: 'player1', monsters: [], territory: [...Array(20).keys()] },
        { id: 2, name: 'Player 2', class: 'player2', monsters: [], territory: [...Array(20).keys()].map(i => i + 80) },
        { id: 3, name: 'Player 3', class: 'player3', monsters: [], territory: [...Array(10).keys()].flatMap(i => [i * 10, i * 10 + 1]) },
        { id: 4, name: 'Player 4', class: 'player4', monsters: [], territory: [...Array(10).keys()].flatMap(i => [i * 10 + 8, i * 10 + 9]) }
    ];

    let currentPlayerIndex = 0;
    let currentTurnStage = 'place'; // 'place' or 'move'
    let placedMonsterIndex = null;

    function renderBoard() {
        // Clear the board
        document.querySelectorAll('.player').forEach(el => el.remove());

        // Place the monsters on the board
        players.forEach(player => {
            player.monsters.forEach(monster => {
                const monsterElement = document.createElement('div');
                monsterElement.classList.add('player', player.class, monster.type);
                gameBoard.children[monster.position].appendChild(monsterElement);
            });
        });
    }

    function handleCellClick(event) {
        const cellIndex = parseInt(event.target.dataset.index);
        const currentPlayer = players[currentPlayerIndex];

        if (currentTurnStage === 'place') {
            if (currentPlayer.territory.includes(cellIndex)) {
                const monsterType = prompt("Enter monster type (vampire, werewolf, ghost):");
                if (['vampire', 'werewolf', 'ghost'].includes(monsterType)) {
                    currentPlayer.monsters.push({ position: cellIndex, type: monsterType });
                    placedMonsterIndex = cellIndex;
                    currentTurnStage = 'move';
                    renderBoard();
                } else {
                    alert("Invalid monster type. Please enter vampire, werewolf, or ghost.");
                }
            } else {
                alert("You can only place monsters in your territory.");
            }
        } else if (currentTurnStage === 'move') {
            const monster = currentPlayer.monsters.find(m => m.position === cellIndex);
            if (monster) {
                const newPosition = parseInt(prompt("Enter new position (0-99):", cellIndex));
                if (newPosition >= 0 && newPosition < 100 && currentPlayer.territory.includes(newPosition) && isValidMove(cellIndex, newPosition)) {
                    if (cellIndex !== placedMonsterIndex) {
                        monster.position = newPosition;
                        resolveConflicts();
                        renderBoard();
                    } else {
                        alert("You cannot move the monster you just placed.");
                    }
                } else {
                    alert("Invalid move. You can only move to a position within your territory.");
                }
            } else {
                alert("You can only move your own monsters.");
            }
        }
    }

    function isValidMove(start, end) {
        const startRow = Math.floor(start / 10);
        const startCol = start % 10;
        const endRow = Math.floor(end / 10);
        const endCol = end % 10;

        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);

        // Check horizontal or vertical move
        if (rowDiff === 0 || colDiff === 0) {
            return true;
        }

        // Check diagonal move
        if (rowDiff <= 2 && colDiff <= 2) {
            return true;
        }

        return false;
    }

    function resolveConflicts() {
        const positions = {};

        // Gather all monsters by their positions
        players.forEach(player => {
            player.monsters.forEach(monster => {
                if (!positions[monster.position]) {
                    positions[monster.position] = [];
                }
                positions[monster.position].push({ player, monster });
            });
        });

        // Resolve conflicts at each position
        Object.keys(positions).forEach(position => {
            if (positions[position].length > 1) {
                const conflictMonsters = positions[position];

                // If there are exactly two monsters, resolve based on the type rules
                if (conflictMonsters.length === 2) {
                    const [first, second] = conflictMonsters;
                    let toRemove = null;

                    if ((first.monster.type === 'vampire' && second.monster.type === 'werewolf') ||
                        (first.monster.type === 'werewolf' && second.monster.type === 'ghost') ||
                        (first.monster.type === 'ghost' && second.monster.type === 'vampire')) {
                        toRemove = second;
                    } else if ((second.monster.type === 'vampire' && first.monster.type === 'werewolf') ||
                               (second.monster.type === 'werewolf' && first.monster.type === 'ghost') ||
                               (second.monster.type === 'ghost' && first.monster.type === 'vampire')) {
                        toRemove = first;
                    } else if (first.monster.type === second.monster.type) {
                        // If the same type, remove both
                        first.player.monsters = first.player.monsters.filter(m => m !== first.monster);
                        second.player.monsters = second.player.monsters.filter(m => m !== second.monster);
                        return;
                    }

                    if (toRemove) {
                        toRemove.player.monsters = toRemove.player.monsters.filter(m => m !== toRemove.monster);
                    }
                } else {
                    // If more than two monsters, remove all of them
                    conflictMonsters.forEach(({ player, monster }) => {
                        player.monsters = player.monsters.filter(m => m !== monster);
                    });
                }
            }
        });
    }

    function getPlayerWithFewestMonsters() {
        const minMonsters = Math.min(...players.map(player => player.monsters.length));
        const playersWithMinMonsters = players.filter(player => player.monsters.length === minMonsters);
        if (playersWithMinMonsters.length > 1) {
            return playersWithMinMonsters[Math.floor(Math.random() * playersWithMinMonsters.length)].id - 1;
        }
        return playersWithMinMonsters[0].id - 1;
    }

    function nextTurn() {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        if (currentPlayerIndex === 0) {
            currentPlayerIndex = getPlayerWithFewestMonsters();
        }
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
    currentPlayerIndex = getPlayerWithFewestMonsters();
    alert(`It's now ${players[currentPlayerIndex].name}'s turn!`);
});
