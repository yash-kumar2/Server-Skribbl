const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const { addUser, removeUser, getUser, getUsersInRoom,startGame,getGame } = require('./utils/users');
const { generateMessage } = require('./utils/messages');
const { getWordsUpToCount } = require('./Resources/Words');

const app = express();
const server = http.createServer(app);


const io = socketio(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://skribbl-client.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');


const allowedOrigins = [
  'http://localhost:5173',
  'https://skribbl-client.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.static(publicDirectoryPath));
app.get('/active', (req, res) => {
    res.status(200).json({
        status: 'active',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
function generateRandomWords(count) {
  const words = getWordsUpToCount(count);
  const selectedWords = [words[1],words[0],words[2]];
  
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

 

    socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    });
    socket.on('guess', (guessedWord) => {
      const game = getGame(user.room);  // Ensure game is retrieved based on socket's room
      if (!game || !game.currentWord) return;
  
      if (guessedWord === game.currentWord) {
        const player = game.players.find((p) => p.user.id === socket.id);
        if (player && !game.guessers.includes(socket.id)) {
          game.guessers.push(socket.id);
  
          io.to(game.room).emit("correctGuess", {
            message: `${player.user.username} has correctly guessed the word!`,
          });
          
  
          if (game.guessers.length === game.players.length - 1) {
            game.round++;
            game.turn++;
            clearTimeout(game.timer);
            pickWord(game);
            return;
          }
        }
      }
    });
    socket.on('draw', (data) => {
      // Broadcast draw data to other users in the same room
      socket.to(user.room).emit('draw', data);
    });
    socket.on('mouseup', (data) => {
        // Broadcast draw data to other users in the same room
        socket.to(user.room).emit('mouseup', data);
      });

      socket.on('colorChange', (data) => {
        // Broadcast draw data to other users in the same room
        socket.to(user.room).emit('colorChange', data);
      });

   
    socket.on('fill', (color) => {
      
      socket.to(user.room).emit('fill', color);
    });

   
   
    socket.on('gameStarted',(options)=>{
      
     
      if(user.owner==false){
        return;
      }

      socket.to(user.room).emit('gameStarted',options)
      console.log(user.room)
      startGame(user.room)
      const game=getGame(user.room)
      //game.options=options
    
      executeGame(game,options)
     
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



function startRound(chosenWord, game,playerSocket) {
  game.currentWord = chosenWord;
  game.guessers = [];
  const drawerId = game.players[game.turn % game.players.length].user.id;
  const startTime = Date.now();
  game.roundScores = {};

  const guessListener = (socket) => (guessedWord) => {
    const player = game.players.find(p => p.user.id === socket.id);
    console.log(player.user.id)
    console.log(drawerId)
    console.log("s")
    if (!player) return;
    if (socket.id === drawerId) return;

    if (game.guessers.includes(socket.id)) return;

    if (guessedWord === game.currentWord) {
      game.guessers.push(socket.id);
      const timeTaken = (Date.now() - startTime) / 1000;
      const points = Math.max(500 - Math.floor(timeTaken * 10), 50);

      const drawer = game.players.find(p => p.user.id === drawerId);

      player.score = (player.score || 0) + points;
      game.roundScores[player.user.username] = points;

      drawer.score = (drawer.score || 0) + 100;
      game.roundScores[drawer.user.username] = (game.roundScores[drawer.user.username] || 0) + 100;

      socket.emit('correctWordReveal', { word: game.currentWord });

      io.to(game.room).emit('message', {
        username: player.user.username,
        correct: true
      });

      if (game.guessers.length >= game.players.length - 1) {
        clearTimeout(game.timer);
        endRound(game);
      }
    } else {
      io.to(game.room).emit('message', {
        username: player.user.username,
        guess: guessedWord,
        correct: false
      });
    }
  };

  game.players.forEach(p => {
    if (p.user.id !== drawerId) {
      const socket = io.sockets.sockets.get(p.user.id);
      if (socket) {
        socket.removeAllListeners('guess');
        socket.on('guess', guessListener(socket));
      }
    }
  });

  game.timer = setTimeout(() => endRound(game), game.options.drawTime*1000);
}

function endRound(game) {
  const drawer = game.players[game.turn % game.players.length].user.username;

  io.to(game.room).emit('roundEnded', {
    drawer,
    word: game.currentWord,
    roundScores: game.roundScores,
    totalScores: game.players.map(p => ({
      username: p.user.username,
      score: p.score || 0
    })),
    round: game.round
  });

  game.turn++;

  if ((game.turn % game.players.length) === 0) {
    game.round++;
  }
  if(game.round==game.options.noOfRounds){
    clearTimeout(game.timer)

    displayResults(game)
    return;
  }

  game.timer=setTimeout(() => {
    pickWord(game);
  }, 8000);
}

function displayResults(game) {
  io.to(game.room).emit('gameEnded', {
    finalScores: game.players.map(p => ({
      username: p.user.username,
      score: p.score || 0
    }))
  });


  // Optional: Clean up game state
  clearTimeout(game.timer);
  game.ended = true;
  game.players.forEach(p => {
    const socket = io.sockets.sockets.get(p.user.id);
    if (socket) {
      socket.removeAllListeners('guess');
      socket.removeAllListeners('wordChosen');
    }
  });
}




async function pickWord(game){
  

  const words = generateRandomWords(game.options.wordCount);
  
  const playerSocket = io.sockets.sockets.get(game.players[game.turn%game.players.length].user.id);
  console.log(game.players[game.turn%game.players.length].user.id)
  console.log("da")
  io.to(game.room).except(playerSocket).emit('choosing',game.players[game.turn%game.players.length].user.username);
  if(!playerSocket)return;
  playerSocket.emit('chooseWord', words);
  playerSocket.once('wordChosen',(word)=>{
    clearTimeout(game.timer)
    //console.log("nxnx")
    io.to(game.room).except(playerSocket).emit('drawing',{time:game.options.drawTime,totalScores: game.players.map(p => ({
      username: p.user.username,
      score: p.score || 0
    })),wordLength:word.length});
    playerSocket.emit('startDraw',{word,time:game.options.drawTime,totalScores: game.players.map(p => ({
      username: p.user.username,
      score: p.score || 0
    }))})
    startRound(word,game,playerSocket)
    return;

  })
  game.timer=setTimeout(()=>{

    let word=words[0];
     io.to(game.room).except(playerSocket).emit('drawing',{time:game.options.drawTime,totalScores: game.players.map(p => ({
      username: p.user.username,
      score: p.score || 0
    })),wordLength:word.length});
    playerSocket.emit('startDraw',{word,time:game.options.drawTime,totalScores: game.players.map(p => ({
      username: p.user.username,
      score: p.score || 0,word
    }))}
    
     



    )
    startRound(word,game);
    return

  },25000)
  



   


}
async function executeGame(game,options){
  console.log(game,options);
  console.log('game is running')
  console.log(game.players)
  console.log(options)
  game.options=options
  await pickWord(game);

}


// Function to start the drawing phase
// function startDrawing(game, playerSocket, word) {
//   playerSocket.emit('startDrawing', { word });
  
//   setTimeout(() => {
//     // End drawing phase and proceed to next turn
//     playerSocket.emit('endDrawing');
//     io.to(game.room).emit('drawingEnd');
//   }, 25000); // Allow drawing for 25 seconds
// }
// function startTurn(game, playerId) {
//   const playerSocket = io.sockets.sockets.get(playerId);

//   if (playerSocket) {
//     // Generate three random words for the player
//     const words = generateRandomWords(3);
//     playerSocket.emit('chooseWord', words);

//     const wordSelectionTimeout = setTimeout(() => {
//       const chosenWord = words[Math.floor(Math.random() * words.length)];
//       io.to(game.room).emit('chosenWord', { chooser: playerSocket.id, word: chosenWord });
//       startDrawing(game, playerSocket, chosenWord);
//     }, 25000); // 25 seconds to choose a word

//     playerSocket.on('wordChosen', (word) => {
//       clearTimeout(wordSelectionTimeout); // Clear timeout if word is chosen within 25 seconds
//       io.to(game.room).emit('chosenWord', { chooser: playerSocket.id, word });
//       startDrawing(game, playerSocket, word);
//     });
//   }
// }

server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});

