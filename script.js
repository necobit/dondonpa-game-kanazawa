const container = document.getElementById("game-container");
const displayText = document.getElementById("display-text");
const gameStatus = document.getElementById("game-status");
const ws = new WebSocket("ws://localhost:8080");

const FINAL_WORDS = ["ぱっ", "かっ", "ぽん", "ぱん", "ぺん", "ヌッ", "ハッ"];

const ANIMATION_STATES = {
  DON1: {
    text: "どん",
    duration: 500,
    backgroundColor: "black",
    textColor: "white",
  },
  DON2: {
    text: "どん",
    duration: 500,
    backgroundColor: "black",
    textColor: "white",
  },
  PA: {
    text: "ぱっ",
    // text: FINAL_WORDS[Math.floor(Math.random() * FINAL_WORDS.length)],
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
  pa: 1000
};

// パーティクルシステムの設定
const particles = [];
const particleContainer = document.createElement('div');
particleContainer.style.position = 'absolute';
particleContainer.style.width = '100%';
particleContainer.style.height = '100%';
particleContainer.style.pointerEvents = 'none';
container.appendChild(particleContainer);

function createParticle() {
  const particle = document.createElement('div');
  particle.style.position = 'absolute';
  particle.style.width = '5px';
  particle.style.height = '5px';
  particle.style.backgroundColor = 'yellow';
  particle.style.borderRadius = '50%';
  
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;
  const angle = Math.random() * Math.PI * 2;
  const speed = 2 + Math.random() * 2;
  
  return {
    element: particle,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1
  };
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
    p.element.style.transform = `translate(${p.x}px, ${p.y}px)`;
    p.element.style.opacity = p.life;
    
    if (p.life <= 0) {
      particleContainer.removeChild(p.element);
      particles.splice(i, 1);
    }
  }
  requestAnimationFrame(updateParticles);
}

function showParticles() {
  for (let i = 0; i < 30; i++) {
    const p = createParticle();
    particleContainer.appendChild(p.element);
    particles.push(p);
  }
}

function flashRed() {
  container.style.backgroundColor = 'red';
  setTimeout(() => {
    container.style.backgroundColor = 'black';
  }, 50);
}

async function startGameMode() {
  if (isGameMode) return;
  
  isGameMode = true;
  score = 0;
  currentRound = 0;
  gameTimings = { don1: 500, don2: 500, pa: 1000 };
  
  // カウントダウン
  updateDisplay({ text: "3", backgroundColor: "black", textColor: "white" });
  await new Promise(resolve => setTimeout(resolve, 1000));
  updateDisplay({ text: "2", backgroundColor: "black", textColor: "white" });
  await new Promise(resolve => setTimeout(resolve, 1000));
  updateDisplay({ text: "1", backgroundColor: "black", textColor: "white" });
  await new Promise(resolve => setTimeout(resolve, 1000));
  updateDisplay({ text: "Start!", backgroundColor: "black", textColor: "white" });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  playGameAnimation();
}

async function playGameAnimation() {
  while (isGameMode) {
    // First どん
    updateDisplay(ANIMATION_STATES.DON1);
    ws.send(JSON.stringify({ type: "don" }));
    await new Promise(resolve => setTimeout(resolve, gameTimings.don1));
    clearDisplay();
    
    // Second どん
    updateDisplay(ANIMATION_STATES.DON2);
    ws.send(JSON.stringify({ type: "don" }));
    await new Promise(resolve => setTimeout(resolve, gameTimings.don2));
    clearDisplay();
    
    // ぱっ
    timingWindow = false;
    setTimeout(() => {
      timingWindow = true;
    }, gameTimings.pa - 50);
    
    updateDisplay(ANIMATION_STATES.PA);
    ws.send(JSON.stringify({ type: "pa" }));
    await new Promise(resolve => setTimeout(resolve, gameTimings.pa));
    timingWindow = false;
    
    currentRound++;
    if (currentRound % 4 === 0) {
      // 速度を10%上げる
      gameTimings.don1 *= 0.9;
      gameTimings.don2 *= 0.9;
      gameTimings.pa *= 0.9;
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
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 結果表示
  container.style.backgroundColor = 'yellow';
  displayText.textContent = `Score: ${score}`;
  displayText.style.fontSize = '48px';
  
  // シリアルポートに1と2を交互に送信
  for (let i = 0; i < 10; i++) {
    ws.send(JSON.stringify({ type: "serial", value: i % 2 + 1 }));
    await new Promise(resolve => setTimeout(resolve, 200));
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
  // playAnimation();
};

// WebSocketメッセージハンドラ
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "serial") {
    updateGameState(data.value);
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
