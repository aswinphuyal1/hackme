
import React, { useState, useRef, useEffect } from "react";

// Use this model name for text and image understanding
const API_MODEL = "gemini-2.5-flash-preview-05-20";
// Please paste your API key here to make the application functional.
const apiKey = "";

// A helper function to convert a file to a base64 string
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = (error) => reject(error);
  });
};

// Reusable component for displaying structured AI responses
const StructuredResponse = ({ content }) => {
  const { title, summary, issues } = JSON.parse(content);
  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-700 mt-2">{summary}</p>
      <div className="mt-4 space-y-3">
        {issues.map((issue, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              <span className="text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              {issue.heading}
            </h4>
            <p className="text-gray-600 text-sm mt-1">{issue.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Camera = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  // Function to handle sending a message to the Gemini API
  const handleSendMessage = async () => {
    if (!selectedImage || loading) {
      return;
    }

    setLoading(true);

    // Display the user's message and image (if any)
    const userMessage = {
      text: inputMessage.trim() || "Image Analysis Request",
      image: previewImage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setSelectedImage(null);
    setPreviewImage(null);

    try {
      let base64Image = await fileToBase64(selectedImage);
      
      // Predefined system prompt for disease analysis
      const predefinedPrompt =
        "Analyze the image to identify any potential diseases, pests, or health issues. " +
        "If an issue is found, provide a concise summary, and a list of specific, actionable solutions or treatments. " +
        "If the image appears healthy, state that no issues were detected. " +
        "User's additional context: " + inputMessage;

      const contents = [
        {
          parts: [
            { text: predefinedPrompt },
            {
              inlineData: {
                mimeType: selectedImage.type,
                data: base64Image,
              },
            },
          ],
        },
      ];

      const payload = {
        contents: contents,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              summary: { type: "STRING" },
              issues: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    heading: { type: "STRING" },
                    details: { type: "STRING" },
                  },
                },
              },
            },
          },
        },
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        setMessages((prev) => [
          ...prev,
          {
            text: `Error: ${errorData.error.message}`,
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
            isStructured: false,
          },
        ]);
        return;
      }

      const result = await response.json();
      const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiResponse) {
        setMessages((prev) => [
          ...prev,
          {
            text: aiResponse,
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
            isStructured: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            text: "No response from the model. Please try again.",
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
            isStructured: false,
          },
        ]);
      }
    } catch (error) {
      console.error("API call failed:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: `An unexpected error occurred: ${error.message}`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
          isStructured: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle image file selection
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  // Utility function for Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-gray-50 font-sans antialiased overflow-hidden">
      <style>{`
        body {
          font-family: 'Inter', sans-serif;
        }
        .chat-container::-webkit-scrollbar {
          width: 8px;
        }
        .chat-container::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 4px;
        }
      `}</style>

      {/* Main chat interface */}
      <div className="flex flex-col w-full max-w-2xl h-3/4 max-h-screen bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
        {/* Chat header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h1 className="text-xl font-semibold text-gray-900">Disease Analyzer</h1>
          <p className="text-sm text-gray-500">
            Upload a photo and add a description to get a diagnosis and solution.
          </p>
        </div>

        {/* Chat display area */}
        <div
          ref={chatContainerRef}
          className="flex-1 p-4 overflow-y-auto chat-container space-y-4"
        >
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              Take a photo to begin analysis. 📸
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                msg.isUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-xs md:max-w-md break-words ${
                  msg.isUser
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.isUser && msg.image && (
                  <div className="mb-2">
                    <img
                      src={msg.image}
                      alt="User's uploaded content"
                      className="rounded-lg max-w-full h-auto"
                    />
                  </div>
                )}
                {msg.isStructured ? (
                  <StructuredResponse content={msg.text} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
                <div
                  className={`text-xs mt-2 ${
                    msg.isUser ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse"></div>
              <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse delay-75"></div>
              <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse delay-150"></div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {previewImage && (
            <div className="relative mb-2 w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setPreviewImage(null);
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                aria-label="Remove image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm3.707 8.707a1 1 0 0 0-1.414-1.414L12 10.586l-2.293-2.293a1 1 0 0 0-1.414 1.414L10.586 12l-2.293 2.293a1 1 0 0 0 1.414 1.414L12 13.414l2.293 2.293a1 1 0 0 0 1.414-1.414L13.414 12l2.293-2.293Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="p-3 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              title="Upload Image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path
                  fillRule="evenodd"
                  d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18a.75.75 0 0 0 .75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.69a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.06ZM15.75 9.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                className="flex-1 p-3 pr-10 text-gray-700 bg-white border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 overflow-hidden"
                placeholder=""
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !selectedImage}
                className="absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send Message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94l19.016-8.581a.75.75 0 0 0 0-1.352L3.478 2.404Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Camera;
