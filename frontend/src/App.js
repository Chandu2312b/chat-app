import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const SERVER_URL = 'http://localhost:5000';

function App() {
  const [step, setStep] = useState('lobby'); // lobby, chat
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [inputUsername, setInputUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (step === 'chat' && !socketRef.current) {
      socketRef.current = io(SERVER_URL);
      socketRef.current.emit('join_room', { roomCode, username });
      socketRef.current.on('receive_message', (data) => {
        setMessages((msgs) => [...msgs, { user: data.username, text: data.message }]);
      });
      socketRef.current.on('user_joined', (data) => {
        setMessages((msgs) => [...msgs, { user: 'System', text: `${data.username} joined the room.` }]);
      });
      socketRef.current.on('user_left', (data) => {
        setMessages((msgs) => [...msgs, { user: 'System', text: `A user left the room.` }]);
      });
      socketRef.current.on('error', (msg) => {
        setError(msg);
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [step]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleCreateRoom = async () => {
    if (!inputUsername) return setError('Enter a username');
    setError('');
    const res = await fetch(`${SERVER_URL}/api/create-room`, { method: 'POST' });
    const data = await res.json();
    setRoomCode(data.roomCode);
    setUsername(inputUsername);
    setStep('chat');
  };

  const handleJoinRoom = async () => {
    if (!inputRoomCode || !inputUsername) return setError('Enter room code and username');
    setError('');
    const res = await fetch(`${SERVER_URL}/api/room-exists/${inputRoomCode}`);
    const data = await res.json();
    if (!data.exists) return setError('Room does not exist');
    setRoomCode(inputRoomCode);
    setUsername(inputUsername);
    setStep('chat');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message) return;
    socketRef.current.emit('send_message', { roomCode, username, message });
    setMessage('');
  };

  if (step === 'lobby') {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">💬 ChatApp</h1>
            <p className="app-subtitle">Real-time messaging made simple</p>
          </div>
        </header>
        <main className="main-content">
          <div className="lobby-container">
            <div className="lobby-card">
              <h2 className="card-title">Create a Room</h2>
              <p className="card-description">Start a new chat room and invite others</p>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={inputUsername}
                  onChange={e => setInputUsername(e.target.value)}
                  className="input-field"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                />
                <button onClick={handleCreateRoom} className="btn btn-primary">
                  Create Room
                </button>
              </div>
            </div>
            <div className="divider">
              <span>OR</span>
            </div>
            <div className="lobby-card">
              <h2 className="card-title">Join a Room</h2>
              <p className="card-description">Enter a room code to join an existing chat</p>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={inputRoomCode}
                  onChange={e => setInputRoomCode(e.target.value.toUpperCase())}
                  className="input-field"
                  maxLength="6"
                />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={inputUsername}
                  onChange={e => setInputUsername(e.target.value)}
                  className="input-field"
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
                <button onClick={handleJoinRoom} className="btn btn-secondary">
                  Join Room
                </button>
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="chat-header">
        <div className="header-content">
          <div className="room-info">
            <h1 className="room-title">Room: <span className="room-code">{roomCode}</span></h1>
            <p className="room-subtitle">Connected as <span className="username">{username}</span></p>
          </div>
        </div>
      </header>
      <main className="chat-main">
        <div className="chat-container">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.user === username ? 'message-own' : msg.user === 'System' ? 'message-system' : 'message-other'}`}>
                  {msg.user !== 'System' && <span className="message-user">{msg.user}</span>}
                  <span className="message-text">{msg.text}</span>
                  <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="message-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="message-input"
            />
            <button type="submit" className="send-button" disabled={!message.trim()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
        {error && <div className="error-message">{error}</div>}
      </main>
    </div>
  );
}

export default App;
