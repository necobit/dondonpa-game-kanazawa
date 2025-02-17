const express = require("express");
const { SerialPort } = require("serialport");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const port = 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "main.html"));
});

// シリアルポートの設定
const serialPort = new SerialPort({
  path: "/dev/tty.usbmodem1124401",
  baudRate: 115200,
});

// WebSocketサーバーの設定
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("クライアント接続");

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.type === "don") {
      serialPort.write("1", (err) => {
        if (err) {
          console.error("シリアル通信エラー:", err);
        } else {
          console.log("シリアルデータ送信: 1");
        }
      });
    } else if (data.type === "pa") {
      serialPort.write("2", (err) => {
        if (err) {
          console.error("シリアル通信エラー:", err);
        } else {
          console.log("シリアルデータ送信: 2");
        }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`サーバー起動: http://localhost:${port}`);
});
