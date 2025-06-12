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

# MLX-LMがインストールされているか確認
if ! command -v mlx_lm.server &> /dev/null; then
    echo "警告: MLX-LMがインストールされていません。"
    echo "ローカルLLM機能を使用するには、MLX-LMをインストールしてください。"
    echo "pip install mlx-lmでインストールできます。"
    echo "MLX-LMなしでも基本機能は動作します。"
else
    # MLX-LMサーバーが起動しているか確認
    if ! curl -s http://localhost:8080/v1/models &> /dev/null; then
        echo "MLX-LMサーバーを起動しています..."
        mlx_lm.server --model mlx-community/Qwen3-30B-A3B-bf16 --port 8080 &> /dev/null &
        MLX_LM_PID=$!
        
        # MLX-LMサーバーが起動するまで少し待つ
        echo "MLX-LMサーバーの起動を待っています..."
        sleep 5
        
        echo "Qwen3-30Bモデルがロードされました。ローカルLLM機能が有効です。"
    else
        echo "MLX-LMサーバーは既に起動しています。"
        echo "Qwen3-30Bモデルが利用可能です。ローカルLLM機能が有効です。"
    fi
fi

# package.jsonが存在しない場合は初期化
if [ ! -f "package.json" ]; then
    echo "package.jsonを初期化します..."
    npm init -y
fi

# 必要なパッケージをインストール
# echo "必要なパッケージをインストールします..."
# npm install serialport express ws

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

# MLX-LMサーバーを終了（起動した場合のみ）
if [ -n "$MLX_LM_PID" ]; then
    echo "MLX-LMサーバーを終了しています..."
    kill $MLX_LM_PID &> /dev/null || true
fi
