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
      <div className="App">
        <h2>Real-Time Chat App</h2>
        <div className="lobby-box">
          <input
            type="text"
            placeholder="Enter username"
            value={inputUsername}
            onChange={e => setInputUsername(e.target.value)}
          />
          <button onClick={handleCreateRoom}>Create Room</button>
        </div>
        <div className="lobby-box">
          <input
            type="text"
            placeholder="Enter room code"
            value={inputRoomCode}
            onChange={e => setInputRoomCode(e.target.value.toUpperCase())}
          />
          <input
            type="text"
            placeholder="Enter username"
            value={inputUsername}
            onChange={e => setInputUsername(e.target.value)}
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="App">
      <h2>Room: {roomCode}</h2>
      <div className="chat-box">
        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.user === username ? 'my-message' : msg.user === 'System' ? 'system-message' : 'other-message'}>
              <b>{msg.user}:</b> {msg.text}
            </div>
          ))}
        </div>
        <form className="input-box" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default App;
