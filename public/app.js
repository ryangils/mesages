'use strict';

const socket = io();

// ---- State ----
let username = '';
let currentChannel = 'general';
const AVATAR_COLORS = [
  '#7289da','#43b581','#faa61a','#f04747',
  '#1abc9c','#3498db','#e91e63','#9b59b6',
];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ---- Elements ----
const modalOverlay   = document.getElementById('modal-overlay');
const usernameInput  = document.getElementById('username-input');
const usernameBtn    = document.getElementById('username-btn');
const channelList    = document.getElementById('channel-list');
const messagesEl     = document.getElementById('messages');
const msgInput       = document.getElementById('msg-input');
const sendBtn        = document.getElementById('send-btn');
const userDisplay    = document.getElementById('user-display');
const userAvatar     = document.getElementById('user-avatar');
const channelHeader  = document.getElementById('channel-name-display');

// ---- Username setup ----
function joinChat() {
  const name = usernameInput.value.trim().slice(0, 32);
  if (!name) { usernameInput.focus(); return; }
  username = name;
  socket.emit('set_username', username);
  userDisplay.textContent = username;
  userAvatar.textContent = username[0].toUpperCase();
  userAvatar.style.background = avatarColor(username);
  modalOverlay.classList.add('hidden');
  msgInput.disabled = false;
  sendBtn.disabled = false;
  msgInput.focus();
}

usernameBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinChat(); });

// ---- Channels ----
function renderChannels(channels) {
  channelList.innerHTML = '';
  channels.forEach((ch) => {
    const li = document.createElement('li');
    li.textContent = ch;
    li.dataset.channel = ch;
    if (ch === currentChannel) li.classList.add('active');
    li.addEventListener('click', () => switchChannel(ch));
    channelList.appendChild(li);
  });
}

function switchChannel(channel) {
  if (channel === currentChannel) return;
  currentChannel = channel;
  messagesEl.innerHTML = '';
  channelHeader.textContent = `# ${channel}`;
  msgInput.placeholder = `Message #${channel}`;
  document.querySelectorAll('#channel-list li').forEach((li) => {
    li.classList.toggle('active', li.dataset.channel === channel);
  });
  socket.emit('join_channel', channel);
}

// ---- Messages ----
function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Today at ${formatTime(isoString)}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${formatTime(isoString)}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${formatTime(isoString)}`;
}

function appendMessage(msg) {
  const group = document.createElement('div');
  group.className = 'msg-group';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.textContent = msg.username[0].toUpperCase();
  avatarEl.style.background = avatarColor(msg.username);

  const body = document.createElement('div');
  body.className = 'msg-body';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const nameEl = document.createElement('span');
  nameEl.className = 'msg-username';
  nameEl.textContent = msg.username;

  const tsEl = document.createElement('span');
  tsEl.className = 'msg-timestamp';
  tsEl.textContent = formatDate(msg.timestamp);

  const textEl = document.createElement('div');
  textEl.className = 'msg-text';
  textEl.textContent = msg.text;

  meta.appendChild(nameEl);
  meta.appendChild(tsEl);
  body.appendChild(meta);
  body.appendChild(textEl);
  group.appendChild(avatarEl);
  group.appendChild(body);

  messagesEl.appendChild(group);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function loadHistory(msgs) {
  messagesEl.innerHTML = '';
  if (msgs.length === 0) {
    const sys = document.createElement('div');
    sys.className = 'msg-system';
    sys.textContent = `This is the beginning of #${currentChannel}`;
    messagesEl.appendChild(sys);
  }
  msgs.forEach(appendMessage);
}

// ---- Send message ----
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !username) return;
  socket.emit('send_message', text);
  msgInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

// ---- Socket events ----
socket.on('init', ({ channels, messages }) => {
  renderChannels(channels);
  loadHistory(messages);
  channelHeader.textContent = `# ${currentChannel}`;
  msgInput.placeholder = `Message #${currentChannel}`;
});

socket.on('channel_history', ({ messages }) => {
  loadHistory(messages);
});

socket.on('new_message', ({ channel, msg }) => {
  if (channel === currentChannel) {
    appendMessage(msg);
  }
});
