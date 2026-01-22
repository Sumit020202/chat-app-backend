const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// 2026 Best Practice: Multiple origins allow करना
const allowedOrigins = [
  "https://chat-app-frontend-topaz-mu.vercel.app",
  "https://chat-app-frontend-git-main-sumit020202s-projects.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // अगर origin लिस्ट में है या origin नहीं है (जैसे mobile apps/postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: This origin is not allowed'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// होम रूट - ताकि 'Cannot GET /' एरर न आए
app.get("/", (req, res) => {
  res.send("Server is Live!  Chat App 2026 is Running.");
});

// --- 1. MongoDB कनेक्शन ---
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
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'] // स्टेबिलिटी के लिए दोनों ज़रूरी हैं
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User ID: ${socket.id} joined room: ${data}`);
  });

  // टाइपिंग इंडिकेटर लॉजिक
  socket.on("typing", (data) => {
    socket.to(data.room).emit("display_typing", data.typing);
  });

  socket.on("send_message", async (data) => {
    const messageData = {
      ...data,
      senderId: socket.id,
      // समय को सर्वर साइड पर ही सेट करना बेहतर है
      time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const msg = new Message(messageData);
      await msg.save();
      // भेजने वाले को छोड़कर बाकी सबको रूम में मैसेज भेजें
      socket.to(data.room).emit("receive_message", messageData);
    } catch (error) {
      console.error("Message Save Error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// --- 4. पुराने मैसेज लोड करने के लिए API ---
app.get("/messages/:room", async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room }).sort({ _id: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "मैसेज लोड नहीं हो पाए" });
  }
});

// --- 5. पोर्ट सेटअप (Render के लिए '0.0.0.0' बाइंडिंग जरूरी है) ---
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}... `);
});
