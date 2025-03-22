import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BASEURL = "https://taskflo-jkoi.onrender.com";
// const BASEURL = "http://localhost:5000";

const App = () => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [todos, setTodos] = useState([]);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);

    useEffect(() => {
        if (token) {
            fetchTodos();
        }
    }, [token]);

    const fetchTodos = async () => {
        try {
            const response = await axios.get(`${BASEURL}/api/todos`, {
                headers: { Authorization: token }
            });
            setTodos(response.data);
        } catch (error) {
            console.error('Failed to fetch todos:', error);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${BASEURL}/api/login`, { username, password });
            setToken(response.data.token);
            localStorage.setItem('token', response.data.token);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleSignup = async (e) => {
      e.preventDefault();
      try {
        const response = await axios.post(`${BASEURL}/api/signup`, { username, password });
        alert('Signup successful! Please login.'); // Notify user
        setIsLogin(true); // Switch to login screen
        setUsername(''); // Clear username
        setPassword(''); // Clear password
      } catch (error) {
        console.error('Signup failed:', error);
        alert('Signup failed. Please try again.'); // Notify user
      }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        try {
            setChatHistory((prev) => [...prev, { type: 'user', text: message }]);
            setMessage('');
            setIsTyping(true);

            const response = await axios.post(`${BASEURL}/api/chat`, { message }, {
                headers: { Authorization: token }
            });
            const aiResponse = response.data.response;

            setIsTyping(false);
            setChatHistory((prev) => [...prev, { type: 'ai', text: aiResponse }]);
            await fetchTodos();
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsTyping(false);
        }
    };

    const formatDate = (dateString, t) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return t === "d" ? `${day}/${month}/${year}` : `${hours}:${minutes}:${seconds}`;
    };

    const emojis = [
        { size: 'small', duration: '15s', delay: '0s' },
        { size: 'medium', duration: '20s', delay: '5s' },
        { size: 'large', duration: '25s', delay: '10s' },
        { size: 'small', duration: '18s', delay: '3s' },
        { size: 'medium', duration: '22s', delay: '7s' },
        { size: 'large', duration: '30s', delay: '12s' },
    ];

    if (!token) {
      return (
        <div className="auth-container">
          <h2>{isLogin ? 'Login' : 'Signup'}</h2>
          <form onSubmit={isLogin ? handleLogin : handleSignup}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <button type="submit">{isLogin ? 'Login' : 'Signup'}</button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Need to signup?' : 'Already have an account?'}
          </button>
        </div>
      );
    }

    return (
        <div className="app">
            <div className="background-emojis">
                {emojis.map((emoji, index) => (
                    <div
                        key={index}
                        className={`emoji ${emoji.size}`}
                        style={{
                            animationDuration: emoji.duration,
                            animationDelay: emoji.delay,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                    >
                        🐰
                    </div>
                ))}
            </div>

            <div className="todo-list">
                <h2>Todo List</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Todo</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todos?.map((todo) => (
                            <tr key={todo.id}>
                                <td>{todo.id}</td>
                                <td>{todo.todo}</td>
                                <td>{formatDate(todo.createdAt, "d")}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="chat-interface">
                <h2>Chat with Aikriti 🐰</h2>
                <div className="chat-history">
                    {chatHistory.map((chat, index) => (
                        <div className='chat-box-wrapper' key={index}>
                            {chat.type === "ai" && <span className='bunny'>🐰</span>}
                            <div className={`chat-message ${chat.type}`}>
                                {chat.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="chat-message ai typing">
                            <span className="dot">.</span>
                            <span className="dot">.</span>
                            <span className="dot">.</span>
                        </div>
                    )}
                </div>
                <div className="chat-input">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendMessage();
                        }}
                    />
                    <button onClick={handleSendMessage}>Send</button>
                </div>
            </div>
        </div>
    );
};

export default App;