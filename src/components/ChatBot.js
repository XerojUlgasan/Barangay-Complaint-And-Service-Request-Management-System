import React, { useState, useRef, useEffect } from "react";
import "../styles/ChatBot.css";
import supabase, { API_CONFIG } from "../supabse_db/supabase_client";

// Minimal safe Markdown-like renderer (module-level to avoid re-creation on each render)
const escapeHtml = (unsafe) => {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const renderMarkdown = (text) => {
  if (text === null || text === undefined) return "";
  let t = String(text);
  t = escapeHtml(t);
  // Code spans: `code`
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold: **bold** or __bold__
  t = t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/__(.*?)__/g, "<strong>$1</strong>");
  // Italic: *italic* or _italic_
  t = t.replace(/\*(.*?)\*/g, "<em>$1</em>");
  t = t.replace(/_(.*?)_/g, "<em>$1</em>");
  // Links: [text](url)
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer'>$1</a>");
  // New lines to <br>
  t = t.replace(/\r?\n/g, "<br />");
  return t;
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm here to help you with questions about the Barangay Complaint and Service Request Management System. What can I help you with today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const isSendingRef = useRef(false); // synchronous guard to prevent duplicate sends
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // renderMarkdown is defined at module scope for performance

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // The server provides assistant replies; keep a minimal fallback message if server is unavailable
  const fallbackResponse = () =>
    "Assistant is unavailable at the moment. Please try again later.";

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Prevent duplicate sends immediately (synchronous guard)
    if (isSendingRef.current) return;
    if (!inputValue.trim()) return;

    // Add user message to UI
    const userMessage = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Build history array of { role, content } for the server
    const updatedHistory = [
      ...conversationHistory,
      { role: "user", content: inputValue },
    ];
    setConversationHistory(updatedHistory);

  const userInput = inputValue;
  setInputValue("");
  // mark as sending synchronously so rapid clicks don't queue multiple requests
  isSendingRef.current = true;
  setIsLoading(true);

    try {
      // Try to get supabase session token to include for authenticated routes
      let authHeaders = {};
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (session?.access_token) {
          authHeaders.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (tokenErr) {
        // ignore token retrieval errors; we'll call API without auth header
        console.debug("No auth token available for chatbot request", tokenErr);
      }

      // Send message and history to server endpoint /resident/chatbot using a retry helper
      const url = `${API_CONFIG.SERVER_API_URL}/resident/chatbot`;
      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ message: userInput, history: updatedHistory }),
      };

      // Helper: sleep
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

      // Retry helper for 429 with exponential backoff + jitter. Honors Retry-After header if present.
  const MAX_RETRIES = 2; // keep retries conservative to avoid extra load
  const BASE_DELAY_MS = 1200; // base delay (ms)

      const sendWithRetries = async (url, options) => {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          let resp;
          try {
            resp = await fetch(url, options);
          } catch (networkErr) {
            // network errors - if last attempt, rethrow
            if (attempt === MAX_RETRIES) throw networkErr;
            const backoff = BASE_DELAY_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 300);
            console.warn(`Network error, retrying in ${backoff}ms (attempt ${attempt + 1})`, networkErr);
            await sleep(backoff);
            continue;
          }

          if (resp.status !== 429) {
            return resp;
          }

          // Handle 429: check Retry-After header or exponential backoff
          if (attempt < MAX_RETRIES) {
            const ra = resp.headers.get("Retry-After");
            // exponential backoff with jitter
            let delayMs = BASE_DELAY_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
            if (ra) {
              const raSec = parseInt(ra, 10);
              if (!Number.isNaN(raSec)) delayMs = raSec * 1000;
            }
            console.warn(`Received 429 from server, retrying in ${delayMs}ms (attempt ${attempt + 1})`);
            await sleep(delayMs);
            continue;
          }

          // last attempt returned 429 - return it so caller can handle
          return resp;
        }
      };

      const response = await sendWithRetries(url, fetchOptions);
      if (!response) throw new Error("No response from server");
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Try to parse JSON, but be resilient to different shapes
      let apiResponse = "No response received";
      try {
        const data = await response.json();
        console.debug("Chatbot server response JSON:", data);

        if (typeof data === "string") {
          apiResponse = data;
        } else if (data === null || data === undefined) {
          apiResponse = "No response received";
        } else if (data.message) {
          apiResponse = data.message;
        } else if (data.response) {
          apiResponse = data.response;
        } else if (data.reply) {
          apiResponse = data.reply;
        } else if (data.result) {
          apiResponse = data.result;
        } else if (data.data && (data.data.message || data.data.reply || data.data.response)) {
          apiResponse = data.data.message || data.data.reply || data.data.response;
        } else {
          // Fallback: stringify the whole object so user sees something useful
          apiResponse = JSON.stringify(data);
        }
      } catch (jsonErr) {
        // Response wasn't valid JSON or empty — try to read text
        console.warn("Chatbot response not JSON, attempting to read text", jsonErr);
        try {
          const text = await response.text();
          apiResponse = text || "No response received";
          console.debug("Chatbot server response text:", text);
        } catch (textErr) {
          console.error("Failed to read chatbot response body:", textErr);
          apiResponse = "No response received";
        }
      }

      // Add assistant reply to history and UI
      const assistantEntry = { role: "assistant", content: apiResponse };
      setConversationHistory((prev) => [...prev, assistantEntry]);

      const botMessage = {
        id: messages.length + 2,
        type: "bot",
        text: apiResponse,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error calling server API:", error);

      // Fallback to a minimal message if API fails
      const fallback = fallbackResponse();

      const assistantEntry = { role: "assistant", content: fallback };
      setConversationHistory((prev) => [...prev, assistantEntry]);

      const botMessage = {
        id: messages.length + 2,
        type: "bot",
        text: fallback,
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      // clear synchronous sending guard and loading state
      isSendingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      {/* Chat Button */}
      <button
        className="chatbot-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close chatbot" : "Open chatbot"}
        aria-label="Toggle chatbot"
      >
        {isOpen ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="24"
            height="24"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            width="24"
            height="24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l6.29-.97A10 10 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8.2-3.59-8.2-8 0-1.1.22-2.15.62-3.1l-.3-.5A2 2 0 003 9c-.55 0-1 .45-1 1 0 4.41 3.59 8 8 8 .55 0 1-.45 1-1s-.45-1-1-1zm5-10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm5 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>Barangay Assistant</h3>
            <button
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="18"
                height="18"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-message ${msg.type === "user" ? "user-msg" : "bot-msg"}`}
              >
                {msg.type === "bot" && (
                  <img
                    src="/brgyease.png"
                    alt="Barangay Assistant"
                    className="chatbot-avatar"
                  />
                )}
                <div
                  className="message-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                />
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message bot-msg">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              aria-label="Message input"
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="18"
                height="18"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
