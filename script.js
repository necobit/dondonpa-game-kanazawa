const container = document.getElementById("game-container");
const displayText = document.getElementById("display-text");
const gameStatus = document.getElementById("game-status");
const ws = new WebSocket("ws://localhost:8080");

// タイトル用のテキスト要素を追加
const displayTextElement = document.createElement("div");
displayTextElement.style.position = "absolute";
displayTextElement.style.width = "100%";
displayTextElement.style.textAlign = "center";
displayTextElement.style.top = "35%";
container.appendChild(displayTextElement);

const guideText = document.createElement("div");
guideText.style.position = "absolute";
guideText.style.width = "100%";
guideText.style.textAlign = "center";
guideText.style.top = "55%";
guideText.style.fontSize = "32px";
guideText.style.color = "black";
container.appendChild(guideText);

// スコア表示用の要素を追加
const scoreDisplay = document.createElement("div");
scoreDisplay.style.position = "absolute";
scoreDisplay.style.top = "20px";
scoreDisplay.style.right = "20px";
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

const FINAL_WORDS = ["ぱっ", "かっ", "ぽん", "ぱん", "ぺん", "ヌッ", "ハッ"];

const ANIMATION_STATES = {
  DON1: {
    text: "どん",
    duration: 500,
    backgroundColor: "yellow",
    textColor: "black",
  },
  DON2: {
    text: "どん",
    duration: 500,
    backgroundColor: "yellow",
    textColor: "black",
  },
  PA: {
    text: "ぱっ",
    duration: 1000,
    backgroundColor: "white",
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
];

const PARTICLE_SIZES = [8, 10, 12, 15];

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
  displayTextElement.textContent = "どんどんぱっ";
  displayTextElement.style.fontSize = "120px";
  displayTextElement.style.fontWeight = "bold";
  guideText.textContent = "スペースキーを押してください";
  container.style.backgroundColor = "yellow";
  displayTextElement.style.color = "black";
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
  scoreDisplay.style.display = "block";
  guideText.style.display = "none";
  updateScoreDisplay();

  // 前回のタイトル要素があれば削除
  const oldTitle = document.querySelector(".game-title");
  if (oldTitle) {
    container.removeChild(oldTitle);
  }

  // transformをリセット
  displayTextElement.style.transform = "translateY(0)";

  // カウントダウン
  displayTextElement.style.fontSize = "200px";
  displayTextElement.style.transition = "none"; // トランジションを一時的に無効化
  updateDisplay({ text: "3", backgroundColor: "yellow", textColor: "black" });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  updateDisplay({ text: "2", backgroundColor: "yellow", textColor: "black" });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  updateDisplay({ text: "1", backgroundColor: "yellow", textColor: "black" });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  updateDisplay({
    text: "Start!",
    backgroundColor: "yellow",
    textColor: "black",
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // トランジションを再設定
  displayTextElement.style.transition = "all 2s ease-out";

  playGameAnimation();
}

async function playGameAnimation() {
  while (isGameMode) {
    let startTime = Date.now();
    let cycleStart = Date.now();
    displayTextElement.style.fontSize = "200px";

    // First どん (500msec)
    timingWindow = false;
    updateDisplay(ANIMATION_STATES.DON1);
    ws.send(JSON.stringify({ type: "don" }));
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don1 / 2));
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don1 / 2));

    // Second どん (500msec)
    updateDisplay(ANIMATION_STATES.DON2);
    ws.send(JSON.stringify({ type: "don" }));
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don2 / 2));
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don2 / 2));

    // ぱっ (1000msec)
    startTime = Date.now();
    timingWindow = true;
    container.style.backgroundColor = "white"; // 背景色を白に設定
    updateDisplay(ANIMATION_STATES.PA);
    ws.send(JSON.stringify({ type: "pa" }));

    await new Promise((resolve) => setTimeout(resolve, 100));
    timingWindow = false;

    await new Promise((resolve) =>
      setTimeout(resolve, gameTimings.pa / 2 - 100)
    );
    clearDisplay();
    container.style.backgroundColor = "yellow"; // 背景色を黄色に戻す
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
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // スコアの大きな表示（中央）
  container.style.backgroundColor = "yellow";
  displayTextElement.style.fontSize = "150px";
  displayTextElement.style.transition = "all 2s ease-out";
  displayTextElement.style.transform = "translateY(0)";
  displayTextElement.textContent = `Score : ${score}`;
  displayTextElement.style.color = "black";
  guideText.style.display = "none";
  scoreDisplay.style.display = "none";

  // 2秒待機
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // スコアを小さくして下に移動
  displayTextElement.style.fontSize = "64px";
  displayTextElement.style.transform = "translateY(150px)"; // 移動位置をさらに下に

  // 2秒待機（移動中）
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 1秒待機（移動後）
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // タイトルの表示
  const titleText = document.createElement("div");
  titleText.className = "game-title"; // クラス名を追加
  titleText.style.position = "absolute";
  titleText.style.width = "100%";
  titleText.style.textAlign = "center";
  titleText.style.top = "35%";
  titleText.style.fontSize = "120px";
  titleText.style.fontWeight = "bold";
  titleText.style.color = "black";
  titleText.textContent = "どんどんぱっ";
  titleText.style.opacity = "0";
  titleText.style.transition = "opacity 1s ease-out";
  container.insertBefore(titleText, displayTextElement);

  // タイトルをフェードイン
  setTimeout(() => {
    titleText.style.opacity = "1";
  }, 50);

  // ガイドテキストの設定と点滅開始
  guideText.style.fontSize = "32px";
  guideText.style.top = "65%";
  guideText.textContent = "スペースキーを押してください";
  guideText.style.display = "block";
  guideText.style.color = "black";
  blinkGuide();

  // シリアルポートに1と2を交互に送信
  for (let i = 0; i < 10; i++) {
    ws.send(JSON.stringify({ type: "serial", value: (i % 2) + 1 }));
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
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
  }, 50);
}
