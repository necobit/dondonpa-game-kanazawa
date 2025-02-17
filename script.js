const container = document.getElementById("game-container");
const displayText = document.getElementById("display-text");
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
    text: FINAL_WORDS[Math.floor(Math.random() * FINAL_WORDS.length)],
    duration: 1000,
    backgroundColor: "white",
    textColor: "black",
  },
};

function updateDisplay(state) {
  displayText.textContent = state.text;
  container.style.backgroundColor = state.backgroundColor;
  displayText.style.color = state.textColor;
}

function clearDisplay() {
  displayText.textContent = "";
}

async function playAnimation() {
  while (true) {
    // First どん
    updateDisplay(ANIMATION_STATES.DON1);
    ws.send(JSON.stringify({ type: "don" }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Second どん
    updateDisplay(ANIMATION_STATES.DON2);
    ws.send(JSON.stringify({ type: "don" }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, 400));

    // ランダムな最後の文字
    const finalState = {
      ...ANIMATION_STATES.PA,
      text: FINAL_WORDS[Math.floor(Math.random() * FINAL_WORDS.length)],
    };
    updateDisplay(finalState);
    ws.send(JSON.stringify({ type: "pa" }));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

ws.onopen = () => {
  console.log("WebSocket接続完了");
  playAnimation();
};
