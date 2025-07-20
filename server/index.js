const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- State Management ---
const users = {};
const socketToRoom = {};
const allRooms = ['General', 'Technology', 'Gaming', 'Random'];

// Helper Functions
const findSocketIdByUsername = (username) => {
    return Object.keys(users).find(socketId => users[socketId] === username);
};

const getUsersInRoom = (room) => {
    const userList = [];
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    if (clientsInRoom) {
        clientsInRoom.forEach(socketId => {
            if (users[socketId]) userList.push(users[socketId]);
        });
    }
    return userList;
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('login', (username) => {
    users[socket.id] = username;
    const defaultRoom = 'General';
    socket.join(defaultRoom);
    socketToRoom[socket.id] = defaultRoom;

    socket.emit('initial_data', {
        rooms: allRooms,
        currentRoom: defaultRoom,
        usersInRoom: getUsersInRoom(defaultRoom),
        allOnlineUsers: Object.values(users)
    });

    socket.to(defaultRoom).emit('user_joined', { room: defaultRoom, username });
    socket.to(defaultRoom).emit('user_list_update', getUsersInRoom(defaultRoom));
    io.emit('full_user_list_update', Object.values(users));
  });

  socket.on('join_room', (newRoom) => {
    const oldRoom = socketToRoom[socket.id];
    const username = users[socket.id];

    if (oldRoom && oldRoom !== newRoom) {
        socket.leave(oldRoom);
        socket.to(oldRoom).emit('user_left', { room: oldRoom, username });
        socket.to(oldRoom).emit('user_list_update', getUsersInRoom(oldRoom));
    }

    if (oldRoom !== newRoom) {
        socket.join(newRoom);
        socketToRoom[socket.id] = newRoom;
        socket.to(newRoom).emit('user_joined', { room: newRoom, username });
        socket.emit('user_list_update', getUsersInRoom(newRoom));
        socket.to(newRoom).emit('user_list_update', getUsersInRoom(newRoom));
    }
  });

  socket.on('send_room_message', ({ room, message }, callback) => {
    const messageData = {
      id: uuidv4(),
      sender: users[socket.id],
      room,
      ...message
    };
    io.to(room).emit('receive_message', messageData);
    if (callback) callback({ success: true });
  });

  socket.on('send_private_message', ({ recipient, message }) => {
    const recipientSocketId = findSocketIdByUsername(recipient);
    if (recipientSocketId) {
        const messageData = {
            id: uuidv4(),
            sender: users[socket.id],
            recipient,
            ...message
        };
        io.to(recipientSocketId).emit('receive_private_message', messageData);
        socket.emit('receive_private_message', messageData);
    }
  });

  socket.on('typing_start', ({ context, isPrivate }) => {
    const username = users[socket.id];
    if (isPrivate) {
        const recipientSocketId = findSocketIdByUsername(context);
        if (recipientSocketId) io.to(recipientSocketId).emit('user_typing', { username, context });
    } else {
        socket.to(context).emit('user_typing', { username, context });
    }
  });

  socket.on('typing_stop', ({ context }) => {
    const username = users[socket.id];
    socket.broadcast.emit('user_stopped_typing', { username, context });
  });

  socket.on('disconnect', () => {
    const username = users[socket.id];
    const room = socketToRoom[socket.id];

    if (username) {
        console.log(`${username} (${socket.id}) disconnected.`);
        delete users[socket.id];
        delete socketToRoom[socket.id];

        if (room) {
            io.to(room).emit('user_left', { room, username });
            io.to(room).emit('user_list_update', getUsersInRoom(room));
        }
        io.emit('full_user_list_update', Object.values(users));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});