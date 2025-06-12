const express = require("express");
const { SerialPort } = require("serialport");
const WebSocket = require("ws");
const path = require("path");
const { getScoreEvaluation, checkMlxLmAvailability, getRealtimeComment, generateBulkComments } = require("./mlx-lm-api");

const app = express();
const port = 3000;

// コメントキャッシュ
let positiveComments = [];
let negativeComments = [];
let commentsGenerationStatus = {
  isGenerating: false,
  isCompleted: false,
  progress: {
    positive: 0,
    negative: 0
  }
};

// 静的ファイルの提供
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "main.html"));
});

// スコア評価APIエンドポイント（Ollama版）
app.get("/api/score-evaluation", async (req, res) => {
  try {
    const score = parseInt(req.query.score) || 0;
    
    // MLX-LMの可用性をチェック
    const mlxLmAvailable = await checkMlxLmAvailability();
    if (!mlxLmAvailable) {
      console.log("MLX-LMが利用できないため、フォールバックメッセージを使用します");
      return res.json({
        success: false,
        message: "MLX-LMサーバーに接続できません",
        evaluation: `${score}点獲得！次はもっと高得点を目指そう！`
      });
    }
    
    // MLX-LMを使用して評価コメントを取得
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

// リアルタイムコメントAPIエンドポイント（キャッシュから取得）
app.get("/api/realtime-comment", async (req, res) => {
  try {
    const isPositive = req.query.isPositive === 'true';
    
    // キャッシュからランダムにコメントを選択
    const comments = isPositive ? positiveComments : negativeComments;
    
    if (comments.length === 0) {
      // キャッシュが空の場合のフォールバック
      const fallbackComments = isPositive ? 
        ['すごい！', 'ナイス！', 'いいね！', 'グッド！', '素晴らしい！'] :
        ['おしい！', '惜しい！', 'あらら…', 'がんばれ！', '次は当てよう！'];
      
      const randomIndex = Math.floor(Math.random() * fallbackComments.length);
      
      return res.json({
        success: true,
        comment: fallbackComments[randomIndex]
      });
    }
    
    // キャッシュからランダムに選択
    const randomIndex = Math.floor(Math.random() * comments.length);
    
    res.json({
      success: true,
      comment: comments[randomIndex]
    });
  } catch (error) {
    console.error("リアルタイムコメントAPI呼び出しエラー:", error);
    res.status(500).json({
      success: false,
      message: "サーバーエラーが発生しました",
      comment: isPositive ? "ナイス！" : "おしい！"
    });
  }
});

// コメント生成状態確認APIエンドポイント
app.get("/api/comments-status", (req, res) => {
  res.json(commentsGenerationStatus);
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
      // console.log("シリアルポートエラー:", error.message);
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
const wss = new WebSocket.Server({ port: 8081 }); // MLX-LMサーバーとの競合を避けるためポートを変更

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
  
  // MLX-LMが利用可能な場合、コメントを事前生成
  const mlxLmAvailable = await checkMlxLmAvailability();
  if (mlxLmAvailable) {
    commentsGenerationStatus.isGenerating = true;
    console.log("ゲーム用コメントを事前生成しています...");
    
    try {
      // 加点コメントを生成
      console.log("加点時コメントを生成中...");
      const positive = await generateBulkComments(true, 50);
      positiveComments = positive;
      commentsGenerationStatus.progress.positive = positive.length;
      console.log(`加点時コメント: ${positiveComments.length}個完了`);
      
      // 減点コメントを生成
      console.log("減点時コメントを生成中...");
      const negative = await generateBulkComments(false, 50);
      negativeComments = negative;
      commentsGenerationStatus.progress.negative = negative.length;
      console.log(`減点時コメント: ${negativeComments.length}個完了`);
      
      commentsGenerationStatus.isGenerating = false;
      commentsGenerationStatus.isCompleted = true;
      console.log("コメントの事前生成が完了しました。");
      
      // 生成されたコメントをターミナルに表示
      console.log("\n=== 生成された加点時コメント ===");
      positiveComments.forEach((comment, index) => {
        console.log(`${index + 1}: ${comment}`);
      });
      
      console.log("\n=== 生成された減点時コメント ===");
      negativeComments.forEach((comment, index) => {
        console.log(`${index + 1}: ${comment}`);
      });
      console.log("=".repeat(40));
    } catch (error) {
      console.error("コメントの事前生成に失敗しました:", error);
      commentsGenerationStatus.isGenerating = false;
      commentsGenerationStatus.isCompleted = true;
      console.log("フォールバックコメントを使用します。");
    }
  } else {
    commentsGenerationStatus.isCompleted = true;
    console.log("MLX-LMが利用できないため、フォールバックコメントを使用します。");
  }
});
