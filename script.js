const container = document.getElementById("game-container");
const displayText = document.getElementById("display-text");
const gameStatus = document.getElementById("game-status");
const ws = new WebSocket("ws://localhost:8080");

// タイトル用のテキスト要素を追加
const guideText = document.createElement("div");
guideText.style.position = "absolute";
guideText.style.width = "100%";
guideText.style.textAlign = "center";
guideText.style.top = "60%";
guideText.style.fontSize = "24px";
guideText.style.color = "white";
container.appendChild(guideText);

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
  "#FFD700", // ゴールド
  "#FFFACD", // レモンシフォン
  "#FFF8DC", // コーンシルク
  "#FFFFE0", // ライトイエロー
  "#FFFF00", // イエロー
];

const PARTICLE_SIZES = [3, 4, 5, 6];

// タイトル画面の点滅制御
let guideVisible = true;
function blinkGuide() {
  if (!isGameMode) {
    guideText.style.opacity = guideVisible ? "1" : "0";
    guideVisible = !guideVisible;
  }
}
setInterval(blinkGuide, 800);

// タイトル画面の表示
function showTitleScreen() {
  displayText.textContent = "どんどんぱっゲーム";
  displayText.style.fontSize = "48px";
  guideText.textContent = "スペースキーを押してください";
  container.style.backgroundColor = "yellow";
  displayText.style.color = "black";
}

// パーティクルシステムの設定
const particles = [];
const particleContainer = document.createElement("div");
particleContainer.style.position = "absolute";
particleContainer.style.width = "100%";
particleContainer.style.height = "100%";
particleContainer.style.pointerEvents = "none";
container.appendChild(particleContainer);

function createParticle() {
  const particle = document.createElement("div");
  particle.style.position = "absolute";
  const size = PARTICLE_SIZES[Math.floor(Math.random() * PARTICLE_SIZES.length)];
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.backgroundColor = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
  particle.style.borderRadius = "50%";
  particle.style.filter = "blur(0.5px)";
  particle.style.boxShadow = "0 0 2px #FFD700";

  const x = Math.random() * window.innerWidth;
  const y = window.innerHeight / 2;  // 中央から開始
  const angle = (Math.random() * Math.PI) - (Math.PI / 2); // 上向きを基準に広がる
  const speed = 1 + Math.random() * 3;

  return {
    element: particle,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 2, // 上向きの初速を追加
    life: 1,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
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

  // カウントダウン
  updateDisplay({
    text: "3",
    backgroundColor: "yellow",
    textColor: "black",
    fontSize: "96px",
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  updateDisplay({
    text: "2",
    backgroundColor: "yellow",
    textColor: "black",
    fontSize: "96px",
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  updateDisplay({
    text: "1",
    backgroundColor: "yellow",
    textColor: "black",
    fontSize: "96px",
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  updateDisplay({
    text: "Start!",
    backgroundColor: "yellow",
    textColor: "black",
    fontSize: "96px",
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  playGameAnimation();
}

async function playGameAnimation() {
  while (isGameMode) {
    let startTime = Date.now();
    let cycleStart = Date.now();

    // First どん (500msec)
    timingWindow = false;
    updateDisplay(ANIMATION_STATES.DON1);
    ws.send(JSON.stringify({ type: "don" }));
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don1 / 2));
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don1 / 2));
    console.log("最初のどんの時間:", Date.now() - startTime);

    // Second どん (500msec)
    startTime = Date.now();
    updateDisplay(ANIMATION_STATES.DON2);
    ws.send(JSON.stringify({ type: "don" }));
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don2 / 2));
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, gameTimings.don2 / 2));
    console.log("2番目のどんの時間:", Date.now() - startTime);

    // ぱっ (1000msec)
    startTime = Date.now();
    console.log("ぱっまでの間隔:", Date.now() - cycleStart);

    timingWindow = true;
    updateDisplay(ANIMATION_STATES.PA);
    ws.send(JSON.stringify({ type: "pa" }));

    await new Promise((resolve) => setTimeout(resolve, 100));
    timingWindow = false;

    await new Promise((resolve) =>
      setTimeout(resolve, gameTimings.pa / 2 - 100)
    );
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, gameTimings.pa / 2));
    console.log("ぱっの時間:", Date.now() - startTime);
    console.log("1サイクルの合計時間:", Date.now() - cycleStart);
    console.log("---");

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

  // 結果表示
  container.style.backgroundColor = "yellow";
  displayText.textContent = `Score: ${score}`;
  displayText.style.fontSize = "48px";

  // シリアルポートに1と2を交互に送信
  for (let i = 0; i < 10; i++) {
    ws.send(JSON.stringify({ type: "serial", value: (i % 2) + 1 }));
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

function updateDisplay(state) {
  displayText.textContent = state.text;
  container.style.backgroundColor = state.backgroundColor;
  displayText.style.color = state.textColor;
}

function clearDisplay() {
  displayText.textContent = "";
}

function updateGameState(value) {
  if (value === "1") {
    if (timingWindow) {
      score += 100;
      showParticles();
    } else if (isGameMode) {
      flashRed();
    }
  } else if (value === " " && !isGameMode) {
    startGameMode();
  } else if (value === "2") {
    isGameActive = true;
    gameStatus.style.display = "block";
  } else if (value === "1") {
    isGameActive = false;
    gameStatus.style.display = "none";
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
    container.style.backgroundColor = "black";
  }, 50);
}
