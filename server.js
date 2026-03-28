'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// In-memory store
const channels = ['general', 'random', 'off-topic'];
// Map of channelName -> array of { id, username, text, timestamp }
const messages = {};
channels.forEach((ch) => (messages[ch] = []));

const MAX_HISTORY = 100;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  let currentChannel = 'general';
  let username = 'Anonymous';

  // Send channel list and initial history on connect
  socket.emit('init', { channels, messages: messages[currentChannel] });

  socket.on('set_username', (name) => {
    if (typeof name === 'string') {
      username = name.trim().slice(0, 32) || 'Anonymous';
    }
  });

  socket.on('join_channel', (channel) => {
    if (!channels.includes(channel)) return;
    socket.leave(currentChannel);
    currentChannel = channel;
    socket.join(currentChannel);
    socket.emit('channel_history', { channel, messages: messages[channel] });
  });

  socket.on('send_message', (text) => {
    if (typeof text !== 'string') return;
    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed) return;

    const msg = {
      id: Date.now() + Math.random().toString(36).slice(2),
      username,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    messages[currentChannel].push(msg);
    if (messages[currentChannel].length > MAX_HISTORY) {
      messages[currentChannel].shift();
    }

    io.to(currentChannel).emit('new_message', { channel: currentChannel, msg });
  });

  socket.join(currentChannel);
});

server.listen(PORT, () => {
  console.log(`Mesages running at http://localhost:${PORT}`);
});
