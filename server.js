const express = require("express");
const { SerialPort } = require("serialport");
const WebSocket = require("ws");
const path = require("path");
const { getScoreEvaluation, checkOllamaAvailability, getRealtimeComment } = require("./ollama-api");

const app = express();
const port = 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "main.html"));
});

// スコア評価APIエンドポイント（Ollama版）
app.get("/api/score-evaluation", async (req, res) => {
  try {
    const score = parseInt(req.query.score) || 0;
    
    // Ollamaの可用性をチェック
    const ollamaAvailable = await checkOllamaAvailability();
    if (!ollamaAvailable) {
      console.log("Ollamaが利用できないため、フォールバックメッセージを使用します");
      return res.json({
        success: false,
        message: "Ollamaサーバーに接続できません",
        evaluation: `${score}点獲得！次はもっと高得点を目指そう！`
      });
    }
    
    // Ollamaを使用して評価コメントを取得
    const result = await getScoreEvaluation(score);
    res.json(result);
  } catch (error) {
    console.error("評価API呼び出しエラー:", error);
    res.status(500).json({
      success: false,
      message: "サーバーエラーが発生しました",
      evaluation: "すごい！頑張りましたね！"
    });
  }
});

// リアルタイムコメントAPIエンドポイント
app.get("/api/realtime-comment", async (req, res) => {
  try {
    const score = parseInt(req.query.score) || 0;
    const isPositive = req.query.isPositive === 'true';
    
    // Ollamaの可用性をチェック
    const ollamaAvailable = await checkOllamaAvailability();
    if (!ollamaAvailable) {
      console.log("Ollamaが利用できないため、フォールバックコメントを使用します");
      const fallbackComments = isPositive ? 
        ['すごい！', 'ナイス！', 'いいね！', 'グッド！', '素晴らしい！'] :
        ['おしい！', '惜しい！', 'あらら…', 'がんばれ！', '次は当てよう！'];
      
      const randomIndex = Math.floor(Math.random() * fallbackComments.length);
      
      return res.json({
        success: false,
        message: "Ollamaサーバーに接続できません",
        comment: fallbackComments[randomIndex]
      });
    }
    
    // Ollamaを使用してリアルタイムコメントを取得
    const result = await getRealtimeComment(score, isPositive);
    res.json(result);
  } catch (error) {
    console.error("リアルタイムコメントAPI呼び出しエラー:", error);
    res.status(500).json({
      success: false,
      message: "サーバーエラーが発生しました",
      comment: isPositive ? "ナイス！" : "おしい！"
    });
  }
});

// シリアルポートの設定
let serialPort = null;

// シリアルポートの初期化を非同期で行う
const initSerialPort = async () => {
  try {
    serialPort = new SerialPort({
      path: "/dev/tty.usbmodem1101",
      baudRate: 115200,
    });

    serialPort.on("error", (error) => {
      console.log("シリアルポートエラー:", error.message);
      serialPort = null;
    });

    // シリアルポートからのデータ受信処理を追加
    serialPort.on("data", (data) => {
      const receivedData = data.toString().trim();
      console.log("シリアルポートから受信:", receivedData);

      // 受信したデータをWebSocketクライアントに送信
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "serial", value: receivedData }));
        }
      });
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
      // 3と時間をカンマ区切りで送信
      const command = `3,${data.duration}\n`;
      serialPort.write(command, (err) => {
        if (err) {
          console.error("シリアル通信エラー:", err);
        } else {
          console.log(`シリアルデータ送信: ${command.trim()}`);
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
