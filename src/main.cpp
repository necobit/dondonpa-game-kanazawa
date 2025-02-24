#include <M5Unified.h>
#include <FastLED.h>

// ピン定義
const int SWITCH_PIN = 6;
const int LED_PIN = 7;
const int OUTPUT_PIN_1 = 38;
const int OUTPUT_PIN_2 = 39;
const int OUTPUT_PIN_3 = 8;

// LEDの設定
#define NUM_LEDS 16
CRGB leds[NUM_LEDS];

// タイマー変数
unsigned long lastButtonPress = 0;
unsigned long lastOutput1Time = 0;
unsigned long lastOutput2Time = 0;
unsigned long lastLedTime = 0;
bool output1Active = false;
bool output2Active = false;
bool ledsActive = false;

int onTime = 100; // 遅延時間

// チャタリング対策用
const unsigned long DEBOUNCE_DELAY = 50;
unsigned long lastDebounceTime = 0;
int lastButtonState = HIGH;
int buttonState;
bool buttonEnabled = true;

// 画面表示用の変数
const int SCREEN_WIDTH = 128;
const int SCREEN_HEIGHT = 128;
unsigned long lastScreenUpdate = 0;
const unsigned long SCREEN_UPDATE_INTERVAL = 10; // 画面更新間隔（ms）

// シリアル通信の状態管理用
unsigned long lastSerialTime = 0;
char lastSerialCommand = ' ';

void setup()
{
  auto cfg = M5.config();
  M5.begin(cfg);
  Serial.begin(115200);

  // ピンモードの設定
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, INPUT_PULLUP);
  pinMode(OUTPUT_PIN_1, OUTPUT);
  pinMode(OUTPUT_PIN_2, OUTPUT);
  pinMode(OUTPUT_PIN_3, OUTPUT);

  // シリアル通信の開始
  Serial.begin(115200);

  // FastLEDの初期化
  FastLED.addLeds<WS2812B, 5, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(255);

  // 画面の初期設定
  M5.Lcd.setRotation(0);
  M5.Lcd.fillScreen(BLACK);
  M5.Lcd.setTextSize(1);
  M5.Lcd.setTextColor(WHITE, BLACK);
}

void handleSerialCommand()
{
  if (Serial.available() > 0)
  {
    char command = Serial.read();
    if (command == '1')
    {
      output1Active = true;
      lastOutput1Time = millis();
      digitalWrite(OUTPUT_PIN_1, HIGH);
      lastSerialTime = millis();
      lastSerialCommand = '1';
    }
    else if (command == '2')
    {
      output2Active = true;
      lastOutput2Time = millis();
      digitalWrite(OUTPUT_PIN_2, HIGH);
      lastSerialTime = millis();
      lastSerialCommand = '2';
    }
  }
}

void handleButton()
{
  int reading = digitalRead(SWITCH_PIN);

  if (reading != lastButtonState)
  {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY)
  {
    if (reading != buttonState)
    {
      buttonState = reading;

      if (buttonState == LOW && buttonEnabled)
      {
        // ボタンが押された時の処理
        digitalWrite(OUTPUT_PIN_1, HIGH);
        // LEDを白く点灯
        for (int i = 0; i < NUM_LEDS; i++)
        {
          leds[i] = CRGB::White;
        }
        FastLED.show();

        digitalWrite(OUTPUT_PIN_2, HIGH);
        output1Active = true;
        output2Active = true;
        lastOutput1Time = millis();
        lastOutput2Time = millis();

        ledsActive = true;
        lastLedTime = millis();

        // シリアル通信で1を送信
        Serial.println("1");

        buttonEnabled = false;
      }
    }
  }

  // ボタンが離されたらフラグをリセット
  if (reading == HIGH)
  {
    buttonEnabled = true;
  }

  lastButtonState = reading;
}

void updateOutputs()
{
  // OUTPUT_PIN_1の制御
  if (output1Active && (millis() - lastOutput1Time >= onTime))
  {
    digitalWrite(OUTPUT_PIN_1, LOW);
    output1Active = false;
  }

  // OUTPUT_PIN_2の制御
  if (output2Active && (millis() - lastOutput2Time >= onTime))
  {
    digitalWrite(OUTPUT_PIN_2, LOW);
    output2Active = false;
  }

  // LEDの制御
  if (ledsActive && (millis() - lastLedTime >= 100))
  {
    for (int i = 0; i < NUM_LEDS; i++)
    {
      leds[i] = CRGB::Black;
    }
    FastLED.show();
    ledsActive = false;
  }
}

void updateDisplay()
{
  if (millis() - lastScreenUpdate < SCREEN_UPDATE_INTERVAL)
  {
    return;
  }
  lastScreenUpdate = millis();

  // タイトル
  M5.Lcd.setCursor(5, 5);
  M5.Lcd.println("GPIO Status");
  M5.Lcd.drawLine(5, 15, SCREEN_WIDTH - 5, 15, WHITE);

  // 入力ピンの状態
  M5.Lcd.setCursor(5, 25);
  M5.Lcd.printf("IN GPIO6: %s", digitalRead(SWITCH_PIN) == HIGH ? "HIGH" : "LOW ");
  M5.Lcd.setCursor(5, 35);
  M5.Lcd.printf("IN GPIO7: %s", digitalRead(LED_PIN) == HIGH ? "HIGH" : "LOW ");

  // 出力ピンの状態
  M5.Lcd.setCursor(5, 55);
  M5.Lcd.println("Output Status:");
  M5.Lcd.setCursor(5, 65);
  M5.Lcd.printf("GPIO38: %s", digitalRead(OUTPUT_PIN_1) == HIGH ? "HIGH" : "LOW ");
  M5.Lcd.setCursor(5, 75);
  M5.Lcd.printf("GPIO39: %s", digitalRead(OUTPUT_PIN_2) == HIGH ? "HIGH" : "LOW ");
  M5.Lcd.setCursor(5, 85);
  M5.Lcd.printf("GPIO8 : %s", digitalRead(OUTPUT_PIN_3) == HIGH ? "HIGH" : "LOW ");

  // LED状態
  M5.Lcd.setCursor(5, 105);
  M5.Lcd.printf("LEDs: %s", ledsActive ? "ON " : "OFF");

  // シリアル通信の状態
  M5.Lcd.setCursor(5, 115);
  if (lastSerialTime > 0)
  {
    unsigned long timeSinceLastSerial = (millis() - lastSerialTime) / 1000; // 秒単位に変換
    M5.Lcd.printf("Serial: %c            ", lastSerialCommand);
  }
  else
  {
    M5.Lcd.print("Serial: No data");
  }
}

void loop()
{
  handleSerialCommand();
  handleButton();
  updateOutputs();
  updateDisplay();
}