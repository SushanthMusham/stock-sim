const express = require('express');
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');

const registerSockets = require("./sockets");
const marketEngine = require("./market");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));


const tradeRoutes = require("./routes/trade");
app.use("/api", tradeRoutes);


app.get('/', (req, res) => {
  res.send('Stock Simulator Backend Running 🚀');
});

registerSockets(io);
marketEngine(io);

server.listen(5000, () => {
  console.log("Server running at http://localhost:5000");
});