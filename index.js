const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const { addUser, removeUser, getUser, getUsersInRoom,startGame } = require('./utils/users');
const { generateMessage } = require('./utils/messages');

const app = express();
const server = http.createServer(app);

// Apply CORS directly to Socket.io
const io = socketio(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

// CORS middleware for Express
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.static(publicDirectoryPath));
function generateRandomWords(count) {
  const words = ["apple", "tree", "mountain", "river", "car", "phone", "book", "house", "flower"]; // Add more words as needed
  const selectedWords = [];
  while (selectedWords.length < count) {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    if (!selectedWords.includes(randomWord)) {
      selectedWords.push(randomWord);
    }
  }
  return selectedWords;
}

io.on('connection', (socket) => {
  console.log('New WebSocket connection');
  
  socket.on('join', (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    // Send welcome message and notify room about the new user
    socket.emit('message', generateMessage('Admin', 'Welcome!'));
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    // Handle whiteboard draw event
    socket.on('draw', (data) => {
      // Broadcast draw data to other users in the same room
      socket.to(user.room).emit('draw', data);
    });
    socket.on('mouseup', (data) => {
        // Broadcast draw data to other users in the same room
        socket.to(user.room).emit('mouseup', data);
      });

    // Handle whiteboard fill event
    socket.on('fill', (color) => {
      // Broadcast fill color to other users in the same room
      socket.to(user.room).emit('fill', color);
    });
    socket.on('gameStarted',(options)=>{
      if(user.owner==false){
        return;
      }

      socket.to(user.room).emit('gameStarted',options)
      startGame(user.room)
      const game=getGame(user.room)
      game.players.forEach((player, index) => {
        setTimeout(() => {
          startTurn(game, player.user.id);
        }, index * options.turnDuration * 1000); // Set time delay for each player's turn
      });
    });

    callback();

    //callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`));
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});
function startTurn(game, playerId) {
  const playerSocket = io.sockets.sockets.get(playerId);

  if (playerSocket) {
    // Generate three random words for the player
    const words = generateRandomWords(3);
    playerSocket.emit('chooseWord', words);

    const wordSelectionTimeout = setTimeout(() => {
      const chosenWord = words[Math.floor(Math.random() * words.length)];
      io.to(game.room).emit('chosenWord', { chooser: playerSocket.id, word: chosenWord });
      startDrawing(game, playerSocket, chosenWord);
    }, 25000); // 25 seconds to choose a word

    playerSocket.on('wordChosen', (word) => {
      clearTimeout(wordSelectionTimeout); // Clear timeout if word is chosen within 25 seconds
      io.to(game.room).emit('chosenWord', { chooser: playerSocket.id, word });
      startDrawing(game, playerSocket, word);
    });
  }
}

// Function to start the drawing phase
function startDrawing(game, playerSocket, word) {
  playerSocket.emit('startDrawing', { word });
  
  setTimeout(() => {
    // End drawing phase and proceed to next turn
    playerSocket.emit('endDrawing');
    io.to(game.room).emit('drawingEnd');
  }, 25000); // Allow drawing for 25 seconds
}


server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
