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
let serialPort = null;

// シリアルポートの初期化を非同期で行う
const initSerialPort = async () => {
  try {
    serialPort = new SerialPort({
      path: "/dev/tty.usbmodem1124401",
      baudRate: 115200,
    });

    serialPort.on("error", (error) => {
      console.log("シリアルポートエラー:", error.message);
      serialPort = null;
    });

    console.log("シリアルポートに接続しました");
  } catch (error) {
    console.log(
      "シリアルポートに接続できませんでした。キーボード入力モードで動作します。"
    );
    serialPort = null;
  }
};

// WebSocketサーバーの設定
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("クライアント接続");

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.type === "don" && serialPort) {
      serialPort.write("1", (err) => {
        if (err) {
          console.error("シリアル通信エラー:", err);
        } else {
          console.log("シリアルデータ送信: 1");
        }
      });
    } else if (data.type === "pa" && serialPort) {
      serialPort.write("2", (err) => {
        if (err) {
          console.error("シリアル通信エラー:", err);
        } else {
          console.log("シリアルデータ送信: 2");
        }
      });
    } else if (data.type === "keyboard") {
      console.log("キーボード入力:", data.value);
      // キーボード入力の場合は、他のクライアントにも転送
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "serial", value: data.value }));
        }
      });
    }
  });
});

// HTTPサーバーの起動
const server = app.listen(port, async () => {
  console.log(
    `サーバーが起動しました。終了するには Ctrl+C を押してください...`
  );
  console.log(`http://localhost:${port} にアクセスしてください。`);

  // シリアルポートの初期化を試みる
  await initSerialPort();
});
