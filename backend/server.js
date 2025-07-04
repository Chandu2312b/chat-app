const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage for rooms and users
const rooms = {};

// Helper to generate a random 6-character room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// API to create a room
app.post('/api/create-room', (req, res) => {
  let roomCode;
  do {
    roomCode = generateRoomCode();
  } while (rooms[roomCode]);
  rooms[roomCode] = { users: [] };
  res.json({ roomCode });
});

// API to check if a room exists
app.get('/api/room-exists/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  res.json({ exists: !!rooms[roomCode] });
});

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomCode, username }) => {
    if (!rooms[roomCode]) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    socket.join(roomCode);
    rooms[roomCode].users.push({ id: socket.id, username });
    io.to(roomCode).emit('user_joined', { username });
  });

  socket.on('send_message', ({ roomCode, username, message }) => {
    io.to(roomCode).emit('receive_message', { username, message });
  });

  socket.on('disconnecting', () => {
    for (const roomCode of socket.rooms) {
      if (rooms[roomCode]) {
        rooms[roomCode].users = rooms[roomCode].users.filter(u => u.id !== socket.id);
        io.to(roomCode).emit('user_left', { id: socket.id });
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 