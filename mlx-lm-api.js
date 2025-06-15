// MLX-LMを使用してQwen3-30Bモデルによるローカルlml評価コメントを取得するモジュール
const axios = require("axios");

// MLX-LMのエンドポイント設定
const MODEL_NAME = "mlx-community/Qwen3-30B-A3B-bf16";

// axios インスタンスを作成して接続を再利用
const axiosInstance = axios.create({
  baseURL: "http://localhost:8080",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Connection: "keep-alive",
  },
  httpAgent: new (require("http").Agent)({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 10,
  }),
});

/**
 * スコアに基づいた評価コメントをMLX-LMのローカルLLMから取得する
 * @param {number} score - ゲームのスコア
 * @returns {Promise<Object>} - 評価結果
 */
async function getScoreEvaluation(score) {
  // リトライ処理のための関数
  const makeRequestWithRetry = async (retryCount = 0) => {
    try {
      // 最高スコアを3300点として、達成率を計算
      const achievementRate = Math.round((score / 3300) * 100);

      // プロンプトの作成（より具体的な指示）
      let evaluationLevel = "";
      if (score >= 3000) {
        evaluationLevel = "素晴らしい";
      } else if (score >= 2000) {
        evaluationLevel = "とても良い";
      } else if (score >= 1000) {
        evaluationLevel = "良い";
      } else if (score >= 500) {
        evaluationLevel = "まあまあ";
      } else {
        evaluationLevel = "頑張ろう";
      }

      const systemPrompt =
        "短いネガティブではない評価コメントを出力してください。</nothink>";

      const userPrompt = `スコア${score}点の評価：「${evaluationLevel}」
一言コメント（例：素晴らしい成績です）：`;

      console.log(`MLX-LMにリクエスト送信中... (試行 ${retryCount + 1}/3)`);

      // リトライ時は待機時間を設ける
      if (retryCount > 0) {
        const waitTime = retryCount * 2000; // 2秒、4秒と増やしていく
        console.log(`${waitTime}ms 待機中...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // MLX-LMへのリクエスト（axios インスタンスを使用）
      const response = await axiosInstance.post("/v1/chat/completions", {
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 100,
        stream: false,
      });

      return response;
    } catch (error) {
      if (error.code === "ECONNRESET" || error.message.includes("socket hang up")) {
        if (retryCount < 2) {
          console.log(`接続エラーが発生しました。リトライします... (${error.message})`);
          return makeRequestWithRetry(retryCount + 1);
        }
      }
      throw error;
    }
  };

  try {
    const response = await makeRequestWithRetry();

    // レスポンスから評価コメントを抽出
    console.log(
      "MLX-LMレスポンス全体:",
      JSON.stringify(response.data, null, 2)
    );

    let evaluation = "";

    // レスポンスの構造を詳しくチェック
    if (!response.data) {
      console.error("response.dataが存在しません");
    } else if (!response.data.choices) {
      console.error("response.data.choicesが存在しません");
    } else if (!response.data.choices[0]) {
      console.error("response.data.choices[0]が存在しません");
    } else if (!response.data.choices[0].message) {
      console.error("response.data.choices[0].messageが存在しません");
    } else if (!response.data.choices[0].message.content) {
      console.error("response.data.choices[0].message.contentが存在しません");
    } else {
      // contentが存在する場合
      const rawContent = response.data.choices[0].message.content;
      console.log("生のコンテンツ:", rawContent);
      console.log("コンテンツの型:", typeof rawContent);
      console.log("コンテンツの長さ:", rawContent.length);

      evaluation = rawContent.toString().trim();

      // <think>タグを除去
      const beforeThinkRemoval = evaluation;
      evaluation = evaluation.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (beforeThinkRemoval !== evaluation) {
        console.log("<think>タグを除去しました");
      }

      // 念のため<think>タグが閉じられていない場合も対応
      const beforeUnclosedThinkRemoval = evaluation;
      evaluation = evaluation.replace(/<think>[\s\S]*/g, "").trim();
      if (beforeUnclosedThinkRemoval !== evaluation) {
        console.log("閉じられていない<think>タグを除去しました");
      }

      // その他の特殊文字を除去
      evaluation = evaluation.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();

      console.log("最終的な評価コメント:", evaluation);
      console.log("評価コメントの長さ:", evaluation.length);

      // 空の場合は警告
      if (!evaluation || evaluation.length === 0) {
        console.warn("MLX-LMからの評価コメントが空です");
      }
    }

    console.log("MLX-LM評価コメント:", evaluation);

    // 評価コメントが空の場合はフォールバックを使用
    if (!evaluation) {
      console.log("評価コメントが空のため、フォールバックメッセージを使用");
      let fallbackMessage;
      if (score >= 3000) {
        fallbackMessage = "神レベル！素晴らしい集中力です！";
      } else if (score >= 2000) {
        fallbackMessage = "めっちゃすごい！リズム感抜群です！";
      } else if (score >= 1500) {
        fallbackMessage = "すごい！かなりの実力者ですね！";
      } else if (score >= 1000) {
        fallbackMessage = "上手だね！リズムをよく理解しています！";
      } else if (score >= 200) {
        fallbackMessage = "なかなかいいね！次はもっと高得点を狙おう！";
      } else {
        fallbackMessage = "また挑戦してみよう！コツをつかめば必ず上達します！";
      }

      return {
        success: false,
        message: "MLX-LMから空の評価コメントが返されました",
        evaluation: fallbackMessage,
      };
    }

    return {
      success: true,
      evaluation,
    };
  } catch (error) {
    console.error("MLX-LM APIエラー:", error.message);
    if (error.response) {
      console.error(
        "エラーレスポンス:",
        error.response.status,
        error.response.data
      );
    }

    // エラー時のフォールバックメッセージ
    let fallbackMessage;
    if (score >= 3000) {
      fallbackMessage = "神レベル！素晴らしい集中力です！";
    } else if (score >= 2000) {
      fallbackMessage = "めっちゃすごい！リズム感抜群です！";
    } else if (score >= 1500) {
      fallbackMessage = "すごい！かなりの実力者ですね！";
    } else if (score >= 1000) {
      fallbackMessage = "上手だね！リズムをよく理解しています！";
    } else if (score >= 200) {
      fallbackMessage = "なかなかいいね！次はもっと高得点を狙おう！";
    } else {
      fallbackMessage = "また挑戦してみよう！コツをつかめば必ず上達します！";
    }

    return {
      success: false,
      message: "MLX-LM APIの呼び出しに失敗しました: " + error.message,
      evaluation: fallbackMessage,
    };
  }
}

/**
 * スコア変化に対する短いリアルタイムコメントを生成する
 * @param {number} score - 現在のスコア
 * @param {boolean} isPositive - スコア変化が正か負か
 * @returns {Promise<Object>} - 生成されたコメント
 */
async function getRealtimeComment(score, isPositive) {
  try {
    // プロンプトの作成
    const systemPrompt =
      "あなたはどんどんぱっというリズムゲームの実況者です。短く感情的なコメントを作成してください。";

    const userPrompt = `プレイヤーのスコアが${
      isPositive ? "増加" : "減少"
    }しました。現在の合計スコアは${score}点です。

以下の条件を満たす一言コメントを作成してください：
- 15文字以内の非常に短いコメント
- ${isPositive ? "称賛や励まし" : "残念がる"}内容
- 日本語で
- 絵文字は使わない
- 「すごい！」「おしい！」のような感情的な表現

コメントのみを出力してください。`;

    // MLX-LMへのリクエスト（axios インスタンスを使用）
    const response = await axiosInstance.post("/v1/chat/completions", {
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      top_p: 0.95,
      max_tokens: 50,
    });

    // レスポンスからコメントを抽出
    let comment = response.data.choices[0].message.content.trim();

    // <think>タグを除去
    comment = comment.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    comment = comment.replace(/<think>[\s\S]*/g, "").trim();

    return {
      success: true,
      comment: comment,
    };
  } catch (error) {
    console.error("リアルタイムコメント生成エラー:", error.message);
    if (error.response) {
      console.error(
        "エラーレスポンス:",
        error.response.status,
        error.response.data
      );
    }

    // エラー時のフォールバックコメント
    const fallbackComments = isPositive
      ? ["すごい！", "ナイス！", "いいね！", "グッド！", "素晴らしい！"]
      : ["おしい！", "惜しい！", "あらら…", "がんばれ！", "次は当てよう！"];

    const randomIndex = Math.floor(Math.random() * fallbackComments.length);

    return {
      success: false,
      message: "コメント生成に失敗しました: " + error.message,
      comment: fallbackComments[randomIndex],
    };
  }
}

// MLX-LMが利用可能かチェックする関数
async function checkMlxLmAvailability() {
  try {
    console.log("MLX-LMサーバー（http://localhost:8080）への接続を確認中...");
    const response = await axiosInstance.get("/v1/models", {
      timeout: 5000,
    });
    console.log(
      "MLX-LM利用可能モデル:",
      JSON.stringify(response.data, null, 2)
    );

    // モデルが実際に利用可能か確認
    if (
      response.data &&
      response.data.data &&
      Array.isArray(response.data.data)
    ) {
      const models = response.data.data.map((m) => m.id || m.name);
      console.log("利用可能なモデルID:", models);

      // 使用予定のモデルが含まれているか確認
      if (!models.some((m) => m.includes("Qwen3-30B"))) {
        console.warn(
          `警告: ${MODEL_NAME} が見つかりません。利用可能なモデル:`,
          models
        );
      }
    }

    return true;
  } catch (error) {
    console.error("MLX-LMサーバーに接続できません:", error.message);
    if (error.response) {
      console.error(
        "エラーレスポンス:",
        error.response.status,
        error.response.data
      );
    }
    console.log("MLX-LMサーバーが起動していることを確認してください:");
    console.log(
      "  mlx_lm.server --model mlx-community/Qwen3-30B-A3B-bf16 --port 8080"
    );
    return false;
  }
}

/**
 * 事前に複数のコメントを生成する関数
 * @param {boolean} isPositive - 加点時かtrue、減点時がfalse
 * @param {number} count - 生成するコメント数
 * @returns {Promise<Array<string>>} - 生成されたコメントの配列
 */
async function generateBulkComments(isPositive, count = 50) {
  const comments = [];

  // フォールバックコメント
  const fallbackComments = isPositive
    ? [
        "すごい！",
        "ナイス！",
        "いいね！",
        "グッド！",
        "素晴らしい！",
        "最高！",
        "パーフェクト！",
        "さすが！",
        "やったね！",
        "よくできました！",
        "やったー",
        "バッチリ",
        "エクセレント",
        "いいぞー",
        "ファンタスティック",
        "アメージング",
        "ワンダフル",
        "いけてる",
        "きたー",
        "やるじゃん",
        "ブラボー",
        "的中",
        "決まった",
        "やるね",
        "お見事",
        "流石",
        "絶好調",
        "完璧",
        "神業",
        "見事",
        "素敵",
        "かっこいい",
        "天才",
        "上手",
        "センス抜群",
        "さすがだ",
        "お疲れ様",
        "頑張った",
        "よし",
        "いいぞ",
        "その調子",
        "グレート",
        "バッチグー",
        "オッケー",
        "合格",
        "正解",
        "大当たり",
        "ビンゴ",
        "ジャスト",
      ]
    : [
        "おしい！",
        "惜しい！",
        "あらら…",
        "がんばれ！",
        "次は当てよう！",
        "どんまい！",
        "もう少し！",
        "また次！",
        "くやしい～！",
        "あちゃぁ…",
        "おしい",
        "ざんねん",
        "あちゃー",
        "うーん",
        "むむ",
        "あらら",
        "やっちゃった",
        "しまった",
        "まいった",
        "くやしい",
        "チェッ",
        "あかん",
        "だめやん",
        "もったいない",
        "ミス",
        "失敗",
        "はずれ",
        "惜敗",
        "僅差",
        "まけた",
        "うまくいかない",
        "がっかり",
        "しょんぼり",
        "へこむ",
        "おっと",
        "ふっ",
        "ううん",
        "ああ",
        "がんばれ",
        "またか",
        "どんまい",
        "次こそ",
        "今度こそ",
        "練習あるのみ",
        "頑張ろう",
        "負けるな",
        "ファイト",
        "リベンジだ",
        "挽回しよう",
        "諦めるな",
        "まだまだ",
        "これから",
        "成長",
      ];

  // まずはMLX-LMサーバーの確認
  const isAvailable = await checkMlxLmAvailability();
  if (!isAvailable) {
    console.log(
      `MLX-LMサーバーが利用できないため、フォールバックコメントを使用: ${
        isPositive ? "加点" : "減点"
      }時`
    );
    // フォールバックコメントをシャッフルして返す
    const shuffled = [...fallbackComments].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  try {
    console.log(
      `MLX-LMから${
        isPositive ? "加点" : "減点"
      }時のコメントを${count}個生成中...`
    );

    // プロンプトの作成
    const systemPrompt =
      "あなたはどんどんぱっというリズムゲームの実況者です。短く感情的なコメントを作成してください。";

    const userPrompt = `${
      isPositive ? "加点" : "減点"
    }時の短いコメントを${count}個作ってください。

重要：考えすぎず、すぐに答えを出力してください。<think>タグは使わないでください。

条件：
- 15文字以内の非常に短いコメント
- ${isPositive ? "称賛や励まし" : "残念がる"}内容
- 日本語で
- 絵文字は使わない
- 一人称を使わない

以下のような形式で${count}個出力してください：

1. ${isPositive ? "ナイス" : "おしい"}
2. ${isPositive ? "すごい" : "ざんねん"}
3. ${isPositive ? "いいね" : "あちゃー"}
4. ${isPositive ? "グッド" : "うーん"}
5. ${isPositive ? "素晴らしい" : "むむ"}

必ず${count}個、番号付きで出力してください。`;

    // MLX-LMへのリクエスト（axios インスタンスを使用）
    const response = await axiosInstance.post("/v1/chat/completions", {
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      top_p: 0.95,
      max_tokens: 1000,
    });

    // レスポンスからコメントを抽出
    let generatedText = response.data.choices[0].message.content.trim();

    // <think>タグを除去
    generatedText = generatedText
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    generatedText = generatedText.replace(/<think>[\s\S]*/g, "").trim();

    const lines = generatedText.split("\n").filter((line) => line.trim());

    // 生成されたコメントを配列に追加（重複チェック）
    const uniqueComments = new Set();
    lines.forEach((line) => {
      let comment = line.trim();
      // 行頭の数字と点、ハイフンなどを除去
      comment = comment.replace(/^\d+[.\-:：]?\s*/, "");
      // 引用符を除去
      comment = comment.replace(/^["'「]+|["'」]+$/g, "");
      comment = comment.trim();

      if (comment && comment.length > 0 && comment.length <= 15) {
        uniqueComments.add(comment);
      }
    });

    // Setから配列に変換
    comments.push(...Array.from(uniqueComments));

    console.log(`${comments.length}個のユニークなコメントを生成しました`);

    // 不足分をローカルLLMで再生成
    let retryCount = 0;
    const maxRetries = 3;

    while (comments.length < count && retryCount < maxRetries) {
      retryCount++;
      const needed = count - comments.length;
      console.log(
        `不足分${needed}個を追加生成中... (試行回数: ${retryCount}/${maxRetries})`
      );

      // 連続リクエストを避けるため少し待機
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const additionalPrompt = `${
          isPositive ? "加点" : "減点"
        }時の短いコメントを${needed}個作ってください。

重要：考えすぎず、すぐに答えを出力してください。<think>タグは使わないでください。

条件：
- 15文字以内の非常に短いコメント
- ${isPositive ? "称賛や励まし" : "残念がる"}内容
- 日本語で
- 絵文字は使わない
- 一人称を使わない

既存のものと似ていても構いません。以下のような形式で${needed}個出力してください：

1. ${isPositive ? "ナイス" : "おしい"}
2. ${isPositive ? "すごい" : "ざんねん"}
3. ${isPositive ? "いいね" : "あちゃー"}

必ず${needed}個、番号付きで出力してください。`;

        const additionalResponse = await axiosInstance.post("/v1/chat/completions", {
          model: MODEL_NAME,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: additionalPrompt },
          ],
          temperature: 0.95, // より高い温度で多様性を確保
          top_p: 0.98,
          max_tokens: 500,
        });

        let additionalText =
          additionalResponse.data.choices[0].message.content.trim();

        // <think>タグを除去
        additionalText = additionalText
          .replace(/<think>[\s\S]*?<\/think>/g, "")
          .trim();
        additionalText = additionalText.replace(/<think>[\s\S]*/g, "").trim();

        const additionalLines = additionalText
          .split("\n")
          .filter((line) => line.trim());

        additionalLines.forEach((line) => {
          let comment = line.trim();
          // 行頭の数字と点、ハイフンなどを除去
          comment = comment.replace(/^\d+[.\-:：]?\s*/, "");
          // 引用符を除去
          comment = comment.replace(/^["'「]+|["'」]+$/g, "");
          comment = comment.trim();

          if (
            comment &&
            comment.length > 0 &&
            comment.length <= 15 &&
            !comments.includes(comment)
          ) {
            comments.push(comment);
          }
        });

        console.log(
          `追加で${additionalLines.length}個のコメントを生成、${comments.length}個になりました`
        );
      } catch (error) {
        console.error(`追加生成エラー (試行${retryCount}):`, error.message);

        // socket hang upの場合、少し長めに待機してリトライ
        if (
          error.message.includes("socket hang up") &&
          retryCount < maxRetries
        ) {
          console.log(
            "Socket hang upエラーのため、5秒待機してリトライします..."
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue; // 次のリトライへ
        } else {
          break; // その他のエラーは即座に終了
        }
      }
    }

    // 不足分をフォールバックで補充
    if (comments.length < count) {
      console.log(
        "生成されたコメントが不足しているため、フォールバックコメントで補充します"
      );

      // フォールバックコメントから重複しないものを追加
      fallbackComments.forEach((fallback) => {
        if (comments.length < count && !comments.includes(fallback)) {
          comments.push(fallback);
        }
      });
    }

    return comments.slice(0, count);
  } catch (error) {
    console.error("コメント一括生成エラー:", error.message);
    if (error.response) {
      console.error(
        "エラーレスポンス:",
        error.response.status,
        error.response.data
      );
    }

    // エラー時はフォールバックコメントを返す
    console.log("エラーのため、フォールバックコメントを使用します");
    const shuffled = [...fallbackComments].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

module.exports = {
  getScoreEvaluation,
  checkMlxLmAvailability,
  getRealtimeComment,
  generateBulkComments,
};
