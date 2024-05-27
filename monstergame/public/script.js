document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('game-board');
    for (let i = 0; i < 10; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < 10; j++) {
        const cell = document.createElement('td');
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
  });
  