// Ollamaを使用してPhi-4モデルによるローカルLLM評価コメントを取得するモジュール
const axios = require("axios");

// Ollamaのエンドポイント設定
const OLLAMA_ENDPOINT = "http://localhost:11434/api/generate";
const MODEL_NAME = "phi4"; // phi-4のモデル名（Ollamaにインストール済みであること）

/**
 * スコアに基づいた評価コメントをOllamaのローカルLLMから取得する
 * @param {number} score - ゲームのスコア
 * @returns {Promise<Object>} - 評価結果
 */
async function getScoreEvaluation(score) {
  try {
    // 最高スコアを3300点として、達成率を計算
    const achievementRate = Math.round((score / 3300) * 100);

    // プロンプトの作成
    const prompt = `
あなたはどんどんぱっというリズムゲームの評価者です。
プレイヤーは「どん」「どん」「ぱっ」のリズムに合わせてマットを踏むゲームをプレイしました。
プレイヤーの最終スコアは${score}点です（理論上の最高点は3300点で、達成率は約${achievementRate}%）。

プレイヤーに対して、以下の条件を満たす前向きな評価コメントを1つだけ作成してください：
- 50文字以内で簡潔に
- 励ましになる前向きな内容
- スコアに応じた適切な評価（高得点なら称賛、低得点でも励ましを）
- 日本語で
- 絵文字は使わない

評価コメントのみを出力してください。
`;

    console.log("Ollamaにリクエスト送信中...");

    // Ollamaへのリクエスト
    const response = await axios.post(OLLAMA_ENDPOINT, {
      model: MODEL_NAME,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 100,
      },
    });

    // レスポンスから評価コメントを抽出
    const evaluation = response.data.response.trim();

    console.log("Ollama評価コメント:", evaluation);

    return {
      success: true,
      evaluation,
    };
  } catch (error) {
    console.error("Ollama APIエラー:", error.message);

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
      message: "Ollama APIの呼び出しに失敗しました: " + error.message,
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
    const prompt = `
あなたはどんどんぱっというリズムゲームの実況者です。
プレイヤーのスコアが${
      isPositive ? "増加" : "減少"
    }しました。現在の合計スコアは${score}点です。

以下の条件を満たす一言コメントを作成してください：
- 15文字以内の非常に短いコメント
- ${isPositive ? "称賛や励まし" : "残念がる"}内容
- 日本語で
- 絵文字は使わない
- 「すごい！」「おしい！」のような感情的な表現

コメントのみを出力してください。
`;

    // Ollamaへのリクエスト
    const response = await axios.post(OLLAMA_ENDPOINT, {
      model: MODEL_NAME,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.8,
        top_p: 0.95,
        max_tokens: 50,
      },
    });

    // レスポンスからコメントを抽出
    const comment = response.data.response.trim();

    return {
      success: true,
      comment: comment,
    };
  } catch (error) {
    console.error("リアルタイムコメント生成エラー:", error.message);

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

// Ollamaが利用可能かチェックする関数
async function checkOllamaAvailability() {
  try {
    await axios.get("http://localhost:11434/api/tags");
    return true;
  } catch (error) {
    console.error("Ollamaサーバーに接続できません:", error.message);
    return false;
  }
}

module.exports = {
  getScoreEvaluation,
  checkOllamaAvailability,
  getRealtimeComment,
};
