import React, { useContext, useState } from "react";
import ChatbotIcon from "./ChatbotIcon";
import ChatMessage from "./ChatMessage";
import "./Chatbot.css";
import { v4 as uuidv4 } from "uuid";
import { AuthContext } from "../context/AuthContext.js";
import { aiService } from "../services/apiService";

const Chatbot = ({ setAiData }) => {
  const [conversationId] = useState(uuidv4());

  const { userInfo } = useContext(AuthContext);
  const userId = userInfo ? userInfo._id : "default-user";

  const [userPrompt, setUserPrompt] = useState('');
  const [messages, setMessages] = useState([
    { role: "model", text: "Hey there 👋 How can I help you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setUserPrompt(e.target.value);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedPrompt = userPrompt.trim();
    if (!trimmedPrompt) return;

    // Add user message
    const userMessage = { role: "user", text: trimmedPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setUserPrompt("");

    // Add a loading placeholder message (we'll replace it later)
    const loadingMessage = { role: "model", text: "Fetching related images..." };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const aiResponse = await aiService.sendChat(trimmedPrompt, userId, conversationId);
      console.log("AI RESPONSE ===>", aiResponse);

      // Build array of image URLs from sources (if present)
      const imageUrls = (aiResponse.sources || [])
        .filter(s => s.imageUrl)
        .map(s => s.imageUrl);

      // Build bot message with imageUrls (note the plural prop name)
      const botMessage = {
        role: "model",
        text: aiResponse.answer || "Sorry, no answer available.",
        imageUrls: imageUrls // <-- pass array (may be empty)
      };

      // Replace the LAST loading message with real response
      setMessages(prev => {
        // find last index of loading message to replace it
        const lastLoadingIdx = [...prev].reverse().findIndex(m => m.role === "model" && m.text === "Fetching related images...");
        if (lastLoadingIdx === -1) {
          return [...prev, botMessage];
        }
        const idx = prev.length - 1 - lastLoadingIdx;
        const newArr = prev.slice(0, idx).concat([botMessage]).concat(prev.slice(idx + 1));
        return newArr;
      });

      if (aiResponse.sources && Array.isArray(aiResponse.sources) && aiResponse.sources.length > 0) {
        setAiData(aiResponse.sources);
      }

    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      const errorMessage = { role: "model", text: "Sorry, I'm having trouble connecting. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="chatbot-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-info">
          <ChatbotIcon />
          <h2 className="logo-text">Chatbot</h2>
        </div>
        <button>
          <span className="material-symbols-rounded">keyboard_arrow_down</span>
        </button>
      </div>

      {/* Chat Body */}
      <div className="chat-body">
        {messages.map((msg, index) => (
          <ChatMessage
            key={index}
            role={msg.role}
            text={msg.text}
            imageUrls={msg.imageUrls || []}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="chat-footer">
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={isLoading ? "Waiting for response..." : "Message..."}
            id="message-input"
            value={userPrompt}
            onChange={handleInputChange}
            disabled={isLoading}
            required
          />
          <button type="button" className="material-symbols-rounded mic" disabled={isLoading}>
            mic
          </button>
          <button type="submit" className="material-symbols-rounded send" disabled={isLoading}>
            arrow_upward
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;