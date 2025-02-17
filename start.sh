#!/bin/bash

# エラーが発生したら停止
set -e

echo "どんどんぱっゲームを起動します..."

# Node.jsがインストールされているか確認
if ! command -v node &> /dev/null; then
    echo "Node.jsがインストールされていません。"
    echo "https://nodejs.org/からインストールしてください。"
    exit 1
fi

# package.jsonが存在しない場合は初期化
if [ ! -f "package.json" ]; then
    echo "package.jsonを初期化します..."
    npm init -y
fi

# 必要なパッケージをインストール
echo "必要なパッケージをインストールします..."
npm install serialport express ws

# 既存のNode.jsプロセスを終了
echo "既存のサーバープロセスを終了します..."
pkill -f "node server.js" || true

# シリアルポートの権限を確認・設定
SERIAL_PORT="/dev/tty.usbmodem1124401"
if [ -e "$SERIAL_PORT" ]; then
    echo "シリアルポートの権限を設定します..."
    sudo chmod 666 "$SERIAL_PORT" || true
else
    echo "警告: シリアルポート $SERIAL_PORT が見つかりません。"
    echo "デバイスが接続されているか確認してください。"
fi

# サーバーを起動
echo "サーバーを起動します..."
node server.js &
SERVER_PID=$!

# サーバーが起動するまで少し待つ
sleep 2

# ブラウザでページを開く
echo "ブラウザでページを開きます..."
open http://localhost:3000

# プロセスの終了を待つ
echo "サーバーが起動しました。終了するには Ctrl+C を押してください..."
wait $SERVER_PID
