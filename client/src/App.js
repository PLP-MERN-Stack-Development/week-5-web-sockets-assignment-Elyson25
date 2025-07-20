import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [rooms, setRooms] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [currentChat, setCurrentChat] = useState({ name: 'General', isPrivate: false });
  const [messages, setMessages] = useState({});
  const [typingIndicator, setTypingIndicator] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentChat]);

  const requestNotificationPermission = () => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => setNotificationPermission(permission));
    }
  };

  const showBrowserNotification = (title, options) => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(error => console.log("Audio play failed, user interaction needed.", error));

    if (notificationPermission === 'granted' && document.hidden) {
      new Notification(title, options);
    }
  };

  useEffect(() => {
    socket.on('initial_data', ({ rooms, currentRoom, usersInRoom, allOnlineUsers }) => {
      setRooms(rooms);
      setCurrentChat({ name: currentRoom, isPrivate: false });
      setUsersInRoom(usersInRoom);
      setAllUsers(allOnlineUsers);
      setMessages({ [currentRoom]: [] });
    });

    socket.on('user_list_update', (users) => setUsersInRoom(users));
    socket.on('full_user_list_update', (users) => setAllUsers(users));

    const handleNewMessage = (message, chatIdentifier, notificationTitle, notificationBody) => {
      setMessages(prev => ({
        ...prev,
        [chatIdentifier]: [...(prev[chatIdentifier] || []), message]
      }));
      if (currentChat.name !== chatIdentifier) {
        setUnreadCounts(prev => ({ ...prev, [chatIdentifier]: (prev[chatIdentifier] || 0) + 1 }));
        showBrowserNotification(notificationTitle, { body: notificationBody, icon: '/favicon.ico' });
      }
    };

    socket.on('receive_message', (message) => handleNewMessage(message, message.room, `New message in #${message.room}`, `${message.sender}: ${message.text}`));
    socket.on('receive_private_message', (message) => {
      const chatPartner = message.sender === username ? message.recipient : message.sender;
      handleNewMessage(message, chatPartner, `New message from @${message.sender}`, message.text);
    });
    
    const createNotificationMessage = (room, text) => {
        const id = `notif-${Date.now()}`;
        return {
            id,
            isNotification: true,
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
    };

    socket.on('user_joined', ({ room, username: joinedUsername }) => {
      if (username && username !== joinedUsername) {
        setMessages(prev => ({
          ...prev,
          [room]: [...(prev[room] || []), createNotificationMessage(room, `${joinedUsername} has joined.`)]
        }));
      }
    });

    socket.on('user_left', ({ room, username: leftUsername }) => {
      setMessages(prev => ({
        ...prev,
        [room]: [...(prev[room] || []), createNotificationMessage(room, `${leftUsername} has left.`)]
      }));
    });

    socket.on('user_typing', ({ username: typingUser, context }) => {
      if (context === currentChat.name) setTypingIndicator(`${typingUser} is typing...`);
    });

    socket.on('user_stopped_typing', ({ username: typingUser, context }) => {
      if (context === currentChat.name) setTypingIndicator('');
    });

    return () => {
      socket.off();
    };
  }, [username, currentChat.name, notificationPermission]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('login', username);
      setIsLoggedIn(true);
      requestNotificationPermission();
    }
  };

  const selectChat = (name, isPrivate) => {
    setTypingIndicator('');
    setCurrentChat({ name, isPrivate });
    if (!messages[name]) {
      setMessages(prev => ({ ...prev, [name]: [] }));
    }
    if (!isPrivate) {
      socket.emit('join_room', name);
    }
    setUnreadCounts(prev => ({ ...prev, [name]: 0 }));
    setIsSidebarVisible(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      const messageData = {
        text: currentMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const event = currentChat.isPrivate ? 'send_private_message' : 'send_room_message';
      const payload = currentChat.isPrivate ? { recipient: currentChat.name, message: messageData } : { room: currentChat.name, message: messageData };

      socket.emit(event, payload);
      socket.emit('typing_stop', { context: currentChat.name });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setCurrentMessage('');
    }
  };

  const handleTyping = (e) => {
    setCurrentMessage(e.target.value);
    socket.emit('typing_start', { context: currentChat.name, isPrivate: currentChat.isPrivate });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { context: currentChat.name });
    }, 2000);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin}>
          <h1>Join Real-Time Chat</h1>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" autoFocus />
          <button type="submit">Join</button>
        </form>
      </div>
    );
  }

  const currentMessages = messages[currentChat.name] || [];

  return (
    <div className="chat-wrapper">
      <div className={`sidebar ${isSidebarVisible ? 'visible' : ''}`}>
        <h2>Rooms</h2>
        <ul>
          {rooms.map(room => (
            <li key={room} onClick={() => selectChat(room, false)} className={currentChat.name === room ? 'active' : ''}>
              # {room} {unreadCounts[room] > 0 && <span className="unread-badge">{unreadCounts[room]}</span>}
            </li>
          ))}
        </ul>
        <h2>Direct Messages</h2>
        <ul>
          {allUsers.filter(u => u !== username).map(user => (
            <li key={user} onClick={() => selectChat(user, true)} className={currentChat.name === user ? 'active' : ''}>
              <span className="online-dot">●</span> {user} {unreadCounts[user] > 0 && <span className="unread-badge">{unreadCounts[user]}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-area">
        <div className="chat-header">
          <button className="menu-toggle" onClick={() => setIsSidebarVisible(!isSidebarVisible)}>☰</button>
          <h3>{currentChat.isPrivate ? `@ ${currentChat.name}` : `# ${currentChat.name}`}</h3>
          {!currentChat.isPrivate && <small>{usersInRoom.length} users online</small>}
        </div>
        <div className="message-list">
          {currentMessages.map((msg) => (
            msg.isNotification ? (
              <div key={msg.id} className="message-item notification">{msg.text}</div>
            ) : (
              <div key={msg.id} className={`message-item ${msg.sender === username ? 'sent' : 'received'}`}>
                <div className="message-content">
                  {msg.sender !== username && <strong>{msg.sender}</strong>}
                  <p>{msg.text}</p>
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            )
          ))}
          <div ref={messageEndRef} />
        </div>
        <div className="typing-indicator">{typingIndicator}</div>
        <form className="message-form" onSubmit={handleSendMessage}>
          <input type="text" value={currentMessage} onChange={handleTyping} placeholder={`Message ${currentChat.isPrivate ? '@' : '#'}${currentChat.name}`} />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;