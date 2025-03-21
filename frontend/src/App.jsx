import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BASEURL = "http://localhost:5000";

const App = () => {
    const [todos, setTodos] = useState([]);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isTyping, setIsTyping] = useState(false); // Typing indicator state

    // Fetch todos on component mount
    useEffect(() => {
        fetchTodos();
    }, []);

    const fetchTodos = async () => {
        try {
            const response = await axios.get(`${BASEURL}/api/todos`);
            setTodos(response.data);
        } catch (error) {
            console.error('Failed to fetch todos:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        try {
            // Add user message to chat history
            setChatHistory((prev) => [...prev, { type: 'user', text: message }]);

            // Clear input
            setMessage('');

            // Show typing indicator
            setIsTyping(true);

            // Send message to backend
            const response = await axios.post(`${BASEURL}/api/chat`, { message });
            const aiResponse = response.data.response;

            // Hide typing indicator
            setIsTyping(false);

            // Add AI response to chat history
            setChatHistory((prev) => [...prev, { type: 'ai', text: aiResponse }]);

            // Refresh the todos table
            await fetchTodos();
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsTyping(false); // Hide typing indicator on error
        }
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  };
  
    return (
        <div className="app">
            <div className="todo-list">
                <h2>Todo List</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Todo</th>
                            <th>Created At</th>
                            {/* <th>Updated At</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {todos?.map((todo) => (
                            <tr key={todo.id}>
                                <td>{todo.id}</td>
                                <td>{todo.todo}</td>
                                <td>{formatDate(todo.createdAt)}</td>
                                {/* <td>{formatDate(todo.updatedAt)}</td> */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="chat-interface">
                <h2>Chat with AI</h2>
                <div className="chat-history">
                    {chatHistory.map((chat, index) => (
                        <div key={index} className={`chat-message ${chat.type}`}>
                            {chat.text}
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
                        onKeyPress={(e) => {
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