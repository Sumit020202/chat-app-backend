const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: "https://chat-app-frontend-one.vercel.app" }));
app.use(express.json());

// --- 1. डेटाबेस कनेक्शन (यहाँ आपका URL है) ---
const DB_URL = 'mongodb+srv://letscodewithsumit_db_user:jr3WLGtApWqqsE8c@cluster0.cplf2lu.mongodb.net/chatApp?appName=Cluster0';

mongoose.connect(DB_URL)
  .then(() => console.log("MongoDB Connected Successfully... "))
  .catch((err) => console.error("MongoDB connection error: ", err.message));

// --- 2. मैसेज स्कीमा और मॉडल ---
const messageSchema = new mongoose.Schema({
  room: String,
  author: String,
  message: String,
  senderId: String,
  time: String
});

const Message = mongoose.model('Message', messageSchema);

const httpServer = http.createServer(app);

// --- 3. Socket.io सेटअप ---
const io = new Server(httpServer, {
  cors: {
    origin: "*", // पक्का करें कि आपका React इसी पोर्ट पर है
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("typing", (data) => {
    socket.to(data.room).emit("display_typing", data.typing);
  });

  socket.on("send_message", async (data) => {
    const messageData = {
      room: data.room,
      author: data.author,
      message: data.message,
      senderId: socket.id,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // --- 4. डेटाबेस में मैसेज सेव करना ---
    try {
      const newMessage = new Message(messageData);
      await newMessage.save();
      // रूम के बाकी लोगों को मैसेज भेजें
      socket.to(data.room).emit("receive_message", messageData);
    } catch (error) {
      console.error("Message Save Error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// --- 5. पुराने मैसेज लोड करने के लिए API ---
app.get("/messages/:room", async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room }).sort({ _id: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "मैसेज लोड नहीं हो पाए" });
  }
});
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}... `);
});
