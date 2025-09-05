// server.js
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
const server = http.createServer(app);

// 🚨 Firebase Setup: Realtime Database
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // 🚨 New: You MUST provide the databaseURL for Realtime Database
  databaseURL: "https://themakerskrishna-default-rtdb.firebaseio.com", // ⚠️ Replace with your project's database URL
});

// 🚨 New: Get a reference to the Realtime Database service
const db = admin.database();

// Importing Routes
const historyRoutes = require("./routes/history-router");

// Server listens on port 3000
const PORT = process.env.PORT || 3000;
// CORS Policy
const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());

// New: Default route to prevent "Cannot GET /" error
app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

// 🚨 New: Function to listen for real-time data from Realtime Database
const listenForData = () => {
  console.log("Listening for data changes in Firebase Realtime Database...");
  // 🚨 New: Use .ref() to point to the data path (e.g., 'logs')
  db.ref("logs").on(
    "child_added",
    (snapshot) => {
      const newData = snapshot.val();
      console.log("✅ New data received from Firebase:", newData);
      // Example of accessing data from the new log
      if (newData.moisture && newData.temperature) {
        console.log(
          `Humidity: ${newData.humidity}, Moisture: ${newData.moisture}, Temperature: ${newData.temperature}`
        )
        
        ;
      }
    },
    (err) => {
      console.error("Error listening to Firebase Realtime Database:", err);
    }
  );
};

// Server Starting with Firebase connection logic
console.log("Connected to Firebase successfully");
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start listening for data after the server has started
  listenForData();
});

process.on("SIGINT", () => {
  console.log("Shutting down server...");
  server.close(() => {
    console.log("Server shut down gracefully.");
    process.exit(0);
  });
});
