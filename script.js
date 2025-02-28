const container = document.getElementById("game-container");
const displayText = document.getElementById("display-text");
const gameStatus = document.getElementById("game-status");
const ws = new WebSocket("ws://localhost:8080");

// タイトル用のテキスト要素を追加
const titleTextElement = document.createElement("div");
titleTextElement.style.position = "absolute";
titleTextElement.style.width = "100%";
titleTextElement.style.textAlign = "center";
titleTextElement.style.top = "15%";
container.appendChild(titleTextElement);

// ゲーム中どんどんぱっのテキスト要素を追加
const displayTextElement = document.createElement("div");
displayTextElement.style.position = "absolute";
displayTextElement.style.width = "100%";
displayTextElement.style.textAlign = "center";
displayTextElement.style.top = "40%"; // 45%から40%に変更して中央に近づける
container.appendChild(displayTextElement);

// ガイド用のテキスト要素を追加
const guideText = document.createElement("div");
guideText.style.position = "absolute";
guideText.style.width = "100%";
guideText.style.textAlign = "center";
guideText.style.top = "45%";
guideText.style.fontSize = "32px";
guideText.style.color = "black";
container.appendChild(guideText);

// スコア表示用の要素を追加
const scoreDisplay = document.createElement("div");
scoreDisplay.style.position = "absolute";
scoreDisplay.style.top = "5%"; // 上部に配置（タイトルの上）
scoreDisplay.style.width = "100%"; // 幅を100%に設定
scoreDisplay.style.textAlign = "center"; // 中央揃え
scoreDisplay.style.fontSize = "36px";
scoreDisplay.style.color = "black";
scoreDisplay.style.display = "none";
container.appendChild(scoreDisplay);

// スコアエフェクト用のコンテナ
const scoreEffectContainer = document.createElement("div");
scoreEffectContainer.style.position = "absolute";
scoreEffectContainer.style.width = "100%";
scoreEffectContainer.style.top = "20%";
scoreEffectContainer.style.left = "0";
scoreEffectContainer.style.textAlign = "center";
scoreEffectContainer.style.pointerEvents = "none";
scoreEffectContainer.style.zIndex = "1000"; // 最前面に表示
container.appendChild(scoreEffectContainer);

// パーティクルシステムの設定
const particles = [];
const particleContainer = document.createElement("div");
particleContainer.style.position = "absolute";
particleContainer.style.width = "100%";
particleContainer.style.height = "100%";
particleContainer.style.pointerEvents = "none";
container.appendChild(particleContainer);

const ANIMATION_STATES = {
  DON1: {
    text: "どん",
    duration: 500,
    backgroundColor: "yellow",
    textColor: "black",
    highDuration: 60, // 初期のHIGH時間（msec）
  },
  DON2: {
    text: "どん",
    duration: 500,
    backgroundColor: "yellow",
    textColor: "black",
    highDuration: 60, // 初期のHIGH時間（msec）
  },
  PA: {
    text: "ぱっ",
    duration: 1000,
    backgroundColor: "yellow",
    textColor: "black",
  },
};

let isGameActive = false;
let isGameMode = false;
let score = 0;
let currentRound = 0;
let timingWindow = false;
let gameTimings = {
  don1: 500,
  don2: 500,
  pa: 1000,
};

// パーティクルの色とサイズのバリエーション
const PARTICLE_COLORS = [
  "#FFB700", // 濃いゴールド
  "#FFA500", // オレンジ
  "#FFD700", // ゴールド
  "#DAA520", // ゴールデンロッド
  "#F4A460", // サンディブラウン
  "#1E90FF", // ドジャーブルー
  "#4169E1", // ロイヤルブルー
  "#00BFFF", // ディープスカイブルー
  "#87CEEB", // スカイブルー
  "#B0E0E6", // パウダーブルー
];

const PARTICLE_SIZES = [15, 20, 25, 30];

// タイトル画面の点滅制御
let guideVisible = true;
function blinkGuide() {
  if (!isGameMode) {
    guideVisible = !guideVisible;
    guideText.style.opacity = guideVisible ? "1" : "0";
    setTimeout(blinkGuide, 500);
  }
}

// タイトル画面の表示
function showTitleScreen() {
  // タイトルの表示
  titleTextElement.textContent = "どんどんぱっ";
  titleTextElement.style.fontSize = "160px";
  titleTextElement.style.fontWeight = "bold";
  titleTextElement.style.marginBottom = "20px";
  titleTextElement.style.display = "block";
  titleTextElement.style.opacity = "1";
  titleTextElement.style.top = "15%"; // 位置を上部に固定

  // 既存の説明ボックスがあれば削除
  const oldInstructionBox = document.getElementById("instruction-box");
  if (oldInstructionBox) {
    container.removeChild(oldInstructionBox);
  }

  // ゲーム説明の追加
  const instructionBox = document.createElement("div");
  instructionBox.id = "instruction-box";
  instructionBox.style.position = "absolute";
  instructionBox.style.width = "80%";
  instructionBox.style.maxWidth = "600px";
  instructionBox.style.top = "40%";
  instructionBox.style.left = "50%";
  instructionBox.style.transform = "translate(-50%, 0%)";
  instructionBox.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  instructionBox.style.borderRadius = "15px";
  instructionBox.style.padding = "20px";
  instructionBox.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  instructionBox.style.textAlign = "center";
  instructionBox.style.fontSize = "24px";
  instructionBox.style.color = "black";
  instructionBox.style.lineHeight = "1.5";
  instructionBox.innerHTML = `
    <h2 style="margin-bottom: 15px; font-size: 32px;">あそびかた</h2>
    <p>「<span style="font-weight: bold;">どん</span>」「<span style="font-weight: bold;">どん</span>」「<span style="font-weight: bold; color: #FF5500;">ぱっ</span>」のリズムにあわせて</p>
    <p>「<span style="font-weight: bold; color: #FF5500; font-size: 32px;">ぱっ</span>」のときにマットをふもう！</p>
    <p style="margin-top: 15px;">タイミングがあえばポイントゲット！</p>
    <p>だんだん速くなるよ！どこまでできるかな？</p>
  `;
  container.appendChild(instructionBox);

  // スタート案内の表示
  guideText.textContent = "奥のマットを踏んでスタート！";
  guideText.style.top = "80%"; // 位置を下に移動（80%）
  guideText.style.display = "block";

  container.style.backgroundColor = "yellow";
  displayTextElement.style.color = "black";
  displayTextElement.textContent = ""; // 表示テキストをクリア
  scoreDisplay.style.display = "none";
  blinkGuide();
}

// スコアエフェクトの表示
function showScoreEffect(score, isPositive = true) {
  const effect = document.createElement("div");
  effect.style.position = "absolute";
  effect.style.left = "50%";
  effect.style.top = "0";
  effect.style.transform = "translateX(-50%)";
  effect.style.color = isPositive ? "#00A000" : "#FF0000";
  effect.style.fontSize = "48px";
  effect.style.fontWeight = "bold";
  effect.style.zIndex = "1000"; // 最前面に表示
  effect.textContent = isPositive ? `+${score}` : `-${score}`;
  effect.style.opacity = "1";
  effect.style.transition = "all 1s ease-out";
  scoreEffectContainer.appendChild(effect);

  // アニメーション
  setTimeout(() => {
    effect.style.transform = "translateX(-50%) translateY(-50px)";
    effect.style.opacity = "0";
  }, 50); // 少し遅延を入れて確実に表示

  // 要素の削除
  setTimeout(() => {
    if (effect.parentNode === scoreEffectContainer) {
      scoreEffectContainer.removeChild(effect);
    }
  }, 1000);
}

function createParticle() {
  const particle = document.createElement("div");
  particle.style.position = "absolute";
  const size =
    PARTICLE_SIZES[Math.floor(Math.random() * PARTICLE_SIZES.length)];
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.backgroundColor =
    PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
  particle.style.borderRadius = "50%";
  particle.style.filter = "blur(0.8px)";
  particle.style.boxShadow = "0 0 4px #FFB700";

  const x = Math.random() * window.innerWidth;
  const y = window.innerHeight / 2;
  const angle = Math.random() * Math.PI - Math.PI / 2;
  const speed = 2 + Math.random() * 4;

  return {
    element: particle,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 3,
    life: 1,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 15,
  };
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // 重力効果
    p.life -= 0.02;
    p.rotation += p.rotationSpeed;

    p.element.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`;
    p.element.style.opacity = p.life;

    if (p.life <= 0) {
      particleContainer.removeChild(p.element);
      particles.splice(i, 1);
    }
  }
  requestAnimationFrame(updateParticles);
}

function showParticles() {
  for (let i = 0; i < 20; i++) {
    const p = createParticle();
    particleContainer.appendChild(p.element);
    particles.push(p);
  }
}

async function startGameMode() {
  if (isGameMode) return;

  isGameMode = true;
  score = 0;
  currentRound = 0;
  gameTimings = { don1: 500, don2: 500, pa: 1000 };
  updateScoreDisplay();
  scoreDisplay.style.display = "block";
  guideText.style.display = "none";

  // 前回のタイトル要素があれば削除
  const oldTitle = document.querySelector(".game-title");
  if (oldTitle) {
    container.removeChild(oldTitle);
  }

  // 説明ボックスを削除
  const instructionBox = document.getElementById("instruction-box");
  if (instructionBox) {
    container.removeChild(instructionBox);
  }

  // タイトルを消す
  titleTextElement.style.display = "none";
  displayTextElement.style.top = "40%"; // 上部に配置

  // フェードアウトエフェクト
  const fadeOverlay = document.createElement("div");
  fadeOverlay.style.position = "absolute";
  fadeOverlay.style.width = "100%";
  fadeOverlay.style.height = "100%";
  fadeOverlay.style.backgroundColor = "black";
  fadeOverlay.style.opacity = "0";
  fadeOverlay.style.transition = "opacity 0.5s ease";
  fadeOverlay.style.zIndex = "999";
  container.appendChild(fadeOverlay);

  // フェードアウト
  fadeOverlay.style.opacity = "1";
  await new Promise((resolve) => setTimeout(resolve, 500));

  // transformをリセット
  displayTextElement.style.transform = "translateY(0)";
  displayTextElement.textContent = ""; // テキストをクリア

  // カウントダウン準備
  displayTextElement.style.fontSize = "200px";
  displayTextElement.style.transition = "none"; // トランジションを一時的に無効化

  // フェードイン
  fadeOverlay.style.opacity = "0";
  await new Promise((resolve) => setTimeout(resolve, 500));
  container.removeChild(fadeOverlay);

  // 準備メッセージ
  updateDisplay({
    text: "準備はいい？",
    backgroundColor: "yellow",
    textColor: "black",
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // カウントダウン
  updateDisplay({ text: "3", backgroundColor: "yellow", textColor: "black" });
  await new Promise((resolve) => setTimeout(resolve, 800));
  updateDisplay({ text: "2", backgroundColor: "yellow", textColor: "black" });
  await new Promise((resolve) => setTimeout(resolve, 800));
  updateDisplay({ text: "1", backgroundColor: "yellow", textColor: "black" });
  await new Promise((resolve) => setTimeout(resolve, 800));
  updateDisplay({
    text: "スタート！",
    backgroundColor: "yellow",
    textColor: "black",
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // スコア表示を確実に表示する
  scoreDisplay.style.display = "block";

  // トランジションを再設定
  displayTextElement.style.transition = "all 2s ease-out";

  playGameAnimation();
}

async function playGameAnimation() {
  // スコア表示を確実に表示する
  scoreDisplay.style.display = "block";
  
  while (isGameMode) {
    let startTime = Date.now();
    let cycleStart = Date.now();
    displayTextElement.style.fontSize = "200px";

    // First どん (500msec)
    timingWindow = false;
    const baseSpeed = 500; // 基準速度
    const currentSpeed1 = gameTimings.don1;
    const speedRatio1 = baseSpeed / currentSpeed1;
    const highDuration1 = Math.max(
      20,
      Math.floor(ANIMATION_STATES.DON1.highDuration / speedRatio1)
    );

    // デバッグ出力
    console.log(`
      1回目のどん:
      基準速度: ${baseSpeed}msec
      現在の速度: ${currentSpeed1}msec
      スピード比率: ${speedRatio1}
      計算されたHIGH時間: ${highDuration1}msec
    `);

    updateDisplay(ANIMATION_STATES.DON1);
    ws.send(JSON.stringify({ type: "don", duration: highDuration1 }));
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don1 / 2));
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don1 / 2));

    // Second どん (500msec)
    const currentSpeed2 = gameTimings.don2;
    const speedRatio2 = baseSpeed / currentSpeed2;
    const highDuration2 = Math.max(
      20,
      Math.floor(ANIMATION_STATES.DON2.highDuration / speedRatio2)
    );

    // デバッグ出力
    console.log(`
      2回目のどん:
      基準速度: ${baseSpeed}msec
      現在の速度: ${currentSpeed2}msec
      スピード比率: ${speedRatio2}
      計算されたHIGH時間: ${highDuration2}msec
    `);

    updateDisplay(ANIMATION_STATES.DON2);
    ws.send(JSON.stringify({ type: "don", duration: highDuration2 }));
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don2 / 2));
    clearDisplay();
    await new Promise((resolve) =>
      setTimeout(resolve, gameTimings.don2 / 2 - 100)
    );

    timingWindow = true; // ぱっの100msec手前からスコア加算のタイミングウィンドウを有効化
    startTime = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // ぱっ (1000msec)
    updateDisplay(ANIMATION_STATES.PA);
    // ws.send(JSON.stringify({ type: "pa" }));  //「ぱっ」はユーザーが叩くためコメントアウト

    await new Promise((resolve) => setTimeout(resolve, 100));
    timingWindow = false;

    await new Promise((resolve) =>
      setTimeout(resolve, gameTimings.pa / 2 - 100)
    );
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, gameTimings.pa / 2));

    currentRound++;
    if (currentRound % 1 === 0) {
      // 速度を20%上げる
      gameTimings.don1 *= 0.95;
      gameTimings.don2 *= 0.95;
      gameTimings.pa *= 0.95;
      console.log("新しい間隔:", gameTimings);
    }

    // ゲーム終了判定
    if (gameTimings.don1 <= 100) {
      await endGame();
      break;
    }
  }
}

async function endGame() {
  isGameMode = false;

  // フェードアウトエフェクト
  const fadeOverlay = document.createElement("div");
  fadeOverlay.style.position = "absolute";
  fadeOverlay.style.width = "100%";
  fadeOverlay.style.height = "100%";
  fadeOverlay.style.backgroundColor = "black";
  fadeOverlay.style.opacity = "0";
  fadeOverlay.style.transition = "opacity 0.5s ease";
  fadeOverlay.style.zIndex = "999";
  container.appendChild(fadeOverlay);

  // フェードアウト
  fadeOverlay.style.opacity = "1";
  await new Promise((resolve) => setTimeout(resolve, 500));

  // スコア表示を非表示にする
  scoreDisplay.style.display = "none";

  // 終了メッセージ
  container.style.backgroundColor = "yellow";
  displayTextElement.style.fontSize = "100px";
  displayTextElement.style.transition = "all 1s ease-out";
  displayTextElement.style.transform = "translateY(0)";
  displayTextElement.textContent = "おわり！";
  displayTextElement.style.color = "black";

  // フェードイン
  fadeOverlay.style.opacity = "0";
  await new Promise((resolve) => setTimeout(resolve, 500));
  container.removeChild(fadeOverlay);

  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 結果発表のアニメーション
  displayTextElement.style.fontSize = "80px";
  displayTextElement.textContent = "けっか発表...";
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // スコアの大きな表示（中央）
  showParticles(); // パーティクルエフェクト
  displayTextElement.style.fontSize = "150px";
  displayTextElement.style.transition = "all 1s ease-out";
  displayTextElement.style.transform = "translateY(0)";
  displayTextElement.textContent = `${score}点！`;
  displayTextElement.style.color = "black";
  guideText.style.display = "none";
  scoreDisplay.style.display = "none";

  // 評価メッセージ
  const resultMessage = document.createElement("div");
  resultMessage.style.position = "absolute";
  resultMessage.style.width = "100%";
  resultMessage.style.textAlign = "center";
  resultMessage.style.top = "60%";
  resultMessage.style.fontSize = "40px";
  resultMessage.style.fontWeight = "bold";
  resultMessage.style.color = "black";
  resultMessage.style.opacity = "0";
  resultMessage.style.transition = "opacity 1s ease-out";

  // スコアに応じたメッセージ
  if (score >= 3000) {
    resultMessage.textContent = "神";
  } else if (score >= 2000) {
    resultMessage.textContent = "めっちゃすごい！";
  } else if (score >= 1500) {
    resultMessage.textContent = "すごい！";
  } else if (score >= 1000) {
    resultMessage.textContent = "上手だね！";
  } else if (score >= 200) {
    resultMessage.textContent = "なかなかいいね！";
  } else {
    resultMessage.textContent = "また挑戦してみよう！";
  }

  container.appendChild(resultMessage);

  // 評価メッセージをフェードイン
  setTimeout(() => {
    resultMessage.style.opacity = "1";
  }, 50);

  // 待機
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 次の画面へのフェードアウト
  const nextFadeOverlay = document.createElement("div");
  nextFadeOverlay.style.position = "absolute";
  nextFadeOverlay.style.width = "100%";
  nextFadeOverlay.style.height = "100%";
  nextFadeOverlay.style.backgroundColor = "black";
  nextFadeOverlay.style.opacity = "0";
  nextFadeOverlay.style.transition = "opacity 0.5s ease";
  nextFadeOverlay.style.zIndex = "999";
  container.appendChild(nextFadeOverlay);

  nextFadeOverlay.style.opacity = "1";
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 結果表示を削除
  container.removeChild(resultMessage);

  // スコアを小さくして上に移動
  displayTextElement.style.fontSize = "60px";
  displayTextElement.style.transform = "translateY(00px)";
  displayTextElement.style.top = "5%"; // 上部に配置

  // タイトルの表示
  titleTextElement.style.display = "block"; // 既存のタイトル要素を表示
  titleTextElement.style.opacity = "0";
  titleTextElement.style.transition = "opacity 1s ease-out";
  titleTextElement.style.top = "15%"; // タイトル位置を調整

  // フェードイン
  nextFadeOverlay.style.opacity = "0";
  await new Promise((resolve) => setTimeout(resolve, 500));
  container.removeChild(nextFadeOverlay);

  // タイトルをフェードイン
  setTimeout(() => {
    titleTextElement.style.opacity = "1";
  }, 50);

  // ガイドテキストの設定と点滅開始
  guideText.style.fontSize = "32px";
  guideText.style.top = "80%"; // 位置を下に移動（80%）
  guideText.textContent = "奥のマットを踏んでスタート！";
  guideText.style.display = "block";
  guideText.style.color = "black";
  blinkGuide();

  // 既存の説明ボックスがあれば削除
  const oldInstructionBox = document.getElementById("instruction-box");
  if (oldInstructionBox) {
    container.removeChild(oldInstructionBox);
  }

  // 説明を再表示
  const instructionBox = document.createElement("div");
  instructionBox.id = "instruction-box";
  instructionBox.style.position = "absolute";
  instructionBox.style.width = "80%";
  instructionBox.style.maxWidth = "600px";
  instructionBox.style.top = "40%";
  instructionBox.style.left = "50%";
  instructionBox.style.transform = "translate(-50%, 0%)";
  instructionBox.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  instructionBox.style.borderRadius = "15px";
  instructionBox.style.padding = "20px";
  instructionBox.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  instructionBox.style.textAlign = "center";
  instructionBox.style.fontSize = "24px";
  instructionBox.style.color = "black";
  instructionBox.style.lineHeight = "1.5";
  instructionBox.innerHTML = `
    <h2 style="margin-bottom: 15px; font-size: 32px;">あそびかた</h2>
    <p>「<span style="font-weight: bold;">どん</span>」「<span style="font-weight: bold;">どん</span>」「<span style="font-weight: bold; color: #FF5500;">ぱっ</span>」のリズムにあわせて</p>
    <p>「<span style="font-weight: bold; color: #FF5500; font-size: 32px;">ぱっ</span>」のときにマットをふもう！</p>
    <p style="margin-top: 15px;">タイミングがあえばポイントゲット！</p>
    <p>だんだん速くなるよ！どこまでできるかな？</p>
  `;
  container.appendChild(instructionBox);

  // シリアルポートに1と2を交互に送信
  for (let i = 0; i < 10; i++) {
    ws.send(JSON.stringify({ type: "serial", value: (i % 2) + 1 }));
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  
  // スコア表示を確実に非表示にする
  scoreDisplay.style.display = "none";
  displayTextElement.textContent = "";
}

function updateDisplay(state) {
  displayTextElement.textContent = state.text;
  container.style.backgroundColor = state.backgroundColor;
  displayTextElement.style.color = state.textColor;
  displayTextElement.style.transform = "translateY(0)"; // 位置を常に中央に
}

function clearDisplay() {
  displayTextElement.textContent = "";
  displayTextElement.style.transform = "translateY(0)"; // 位置を常に中央に
}

function updateScoreDisplay() {
  scoreDisplay.textContent = `Score: ${score}`;
}

function updateGameState(value) {
  if (value === "1") {
    if (timingWindow) {
      score += 100;
      updateScoreDisplay();
      showScoreEffect(100, true);
      showParticles();
    } else if (isGameMode) {
      score = Math.max(0, score - 50); // スコアが0未満にならないように
      updateScoreDisplay();
      showScoreEffect(50, false);
      flashRed();
    }
  } else if (value === " " && !isGameMode) {
    startGameMode();
  }
}

ws.onopen = () => {
  console.log("WebSocket接続完了");
  showTitleScreen();
};

// WebSocketメッセージハンドラ
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "serial") {
    console.log("シリアルポートから受信:", data.value);
    if (data.value === "1") {
      updateGameState("1");
    } else if (data.value === "2" && !isGameMode) {
      // "2"を受信した場合、ゲームをスタート
      startGameMode();
    }
  }
};

// キーボード入力ハンドラ
document.addEventListener("keydown", (event) => {
  if (event.key === "1" || event.key === " ") {
    updateGameState(event.key);
    if (event.key === "1") {
      ws.send(JSON.stringify({ type: "keyboard", value: event.key }));
    }
  }
});

// パーティクルアニメーションの開始
updateParticles();

function flashRed() {
  container.style.backgroundColor = "red";
  setTimeout(() => {
    container.style.backgroundColor = "yellow";
  }, 150);
}
