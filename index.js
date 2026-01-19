const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors()); // इसे खुला रखें
app.use(express.json());

app.get("/", (req, res) => { res.send("Server is Live! "); });

const DB_URL = 'mongodb+srv://letscodewithsumit_db_user:jr3WLGtApWqqsE8c@cluster0.cplf2lu.mongodb.net/chatApp?appName=Cluster0';
mongoose.connect(DB_URL).then(() => console.log("DB OK")).catch(err => console.log(err));

const Message = mongoose.model('Message', new mongoose.Schema({
  room: String, author: String, message: String, time: String
}));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling']
});

io.on("connection", (socket) => {
  socket.on("join_room", (data) => socket.join(data));
  socket.on("send_message", async (data) => {
    const msg = new Message(data);
    await msg.save();
    socket.to(data.room).emit("receive_message", data);
  });
});

app.get("/messages/:room", async (req, res) => {
  const messages = await Message.find({ room: req.params.room });
  res.json(messages);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`Running on ${PORT}`));
