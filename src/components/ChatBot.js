import React, { useState, useRef, useEffect } from "react";
import "../styles/ChatBot.css";

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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const systemKnowledge = {
    submissions: "You can submit two types of requests: Certificate Requests (Indigency, Clearance, etc.) and File Complaints. Click 'Submit New Request' on the dashboard to get started.",
    certificate: "Certificate requests include Barangay Indigency Certificates, Clearance Certificates, and other official documents. These typically take 2-5 business days to process.",
    complaint: "To file a complaint, describe the incident or issue you want to report. Include details about what happened, when it happened, and any relevant information. Our officials will review and respond to your complaint.",
    status: "Your requests and complaints have different statuses: Pending (awaiting review), In Progress (being handled), Completed (finished), and Rejected (if declined). Check the dashboard to see your current requests.",
    pending: "A 'Pending' status means your request has been submitted but hasn't been reviewed yet. Most requests are reviewed within 2-3 business days.",
    progress: "An 'In Progress' status means the barangay officials are currently working on your request. You'll be notified once it's completed.",
    completed: "A 'Completed' status means your request has been processed and is ready for pickup or delivery. Check the request details for more information.",
    announcements: "Visit the Announcements page to see all official barangay announcements, news, and important updates about community events.",
    account: "You can view your profile information from the sidebar. Make sure your contact details are up to date so we can reach you about your requests.",
    requirements: "Requirements vary depending on the type of certificate or complaint. Check the specific request details or ask the barangay office for specific document requirements.",
    timeline: "Most certificate requests take 2-5 business days. Complaints are reviewed within 3-7 business days. Some requests may take longer depending on complexity.",
    contact: "For urgent issues, you can contact the barangay office directly. Visit the barangay hall during office hours for immediate assistance.",
    help: "I can help you with: submitting requests, understanding request status, filing complaints, certificate requirements, announcements, and general system navigation. What would you like to know?",
  };

  const generateResponse = (userInput) => {
    const input = userInput.toLowerCase().trim();

    // Keywords matching
    const keywords = {
      submit: systemKnowledge.submissions,
      request: systemKnowledge.submissions,
      certificate: systemKnowledge.certificate,
      complaint: systemKnowledge.complaint,
      status: systemKnowledge.status,
      pending: systemKnowledge.pending,
      progress: systemKnowledge.progress,
      "in progress": systemKnowledge.progress,
      completed: systemKnowledge.completed,
      announcement: systemKnowledge.announcements,
      profile: systemKnowledge.account,
      account: systemKnowledge.account,
      requirement: systemKnowledge.requirements,
      timeline: systemKnowledge.timeline,
      "how long": systemKnowledge.timeline,
      contact: systemKnowledge.contact,
      help: systemKnowledge.help,
      question: systemKnowledge.help,
    };

    // Find matching keyword
    for (const [keyword, response] of Object.entries(keywords)) {
      if (input.includes(keyword)) {
        return response;
      }
    }

    // Default responses for various inputs
    if (
      input.includes("hello") ||
      input.includes("hi") ||
      input.includes("hey")
    ) {
      return "Hello! I'm here to assist you with the Barangay System. Feel free to ask me anything about submitting requests, checking status, or using the system features!";
    }

    if (
      input.includes("thank") ||
      input.includes("thanks") ||
      input.includes("thankyou")
    ) {
      return "You're welcome! Is there anything else I can help you with?";
    }

    if (input.includes("what can you do") || input.includes("what do you do")) {
      return systemKnowledge.help;
    }

    if (input.length === 0) {
      return "Please type a message to get started!";
    }

    // Fallback response
    return "I'm here to help with the Barangay Complaint and Service Request Management System! I can assist with: submitting requests, understanding status, filing complaints, and system navigation. Feel free to ask any specific questions!";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const botResponse = generateResponse(inputValue);
      const botMessage = {
        id: messages.length + 2,
        type: "bot",
        text: botResponse,
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 500);
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
                <div className="message-content">{msg.text}</div>
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
