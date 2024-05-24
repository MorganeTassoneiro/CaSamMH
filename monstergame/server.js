const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let games = {};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        handleClientMessage(ws, data);
    });

    ws.on('close', () => {
        // Handle client disconnection
    });
});

function handleClientMessage(ws, data) {
    switch (data.type) {
        case 'CREATE_GAME':
            createGame(ws);
            break;
        case 'JOIN_GAME':
            joinGame(ws, data.gameId, data.playerName);
            break;
        case 'PLAYER_ACTION':
            handlePlayerAction(data.gameId, data.action);
            break;
        // Add more case handlers as needed
    }
}

function createGame(ws) {
    const gameId = uuidv4();
    games[gameId] = {
        id: gameId,
        players: [],
        state: initializeGameState()
    };
    ws.send(JSON.stringify({ type: 'GAME_CREATED', gameId }));
}

function joinGame(ws, gameId, playerName) {
    const game = games[gameId];
    if (game) {
        game.players.push({ ws, name: playerName, eliminated: false, losses: 0 });
        if (game.players.length === 4) {
            startGame(gameId);
        }
        ws.send(JSON.stringify({ type: 'JOINED_GAME', gameId, playerName }));
    } else {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Game not found' }));
    }
}

function initializeGameState() {
    return {
        board: Array(100).fill(null),
        currentPlayerIndex: 0,
        currentTurnStage: 'place',
        currentRound: 0,
        placedMonsterIndex: null
    };
}

function startGame(gameId) {
    const game = games[gameId];
    game.state.currentPlayerIndex = 0; // Start with the first player
    game.players.forEach(player => {
        player.ws.send(JSON.stringify({ type: 'GAME_STARTED', state: game.state }));
    });
}

function handlePlayerAction(gameId, action) {
    const game = games[gameId];
    if (game) {
        // Handle the player's action and update the game state
        // Broadcast the updated state to all players in the game
        game.players.forEach(player => {
            player.ws.send(JSON.stringify({ type: 'GAME_STATE_UPDATED', state: game.state }));
        });
    }
}

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
});
