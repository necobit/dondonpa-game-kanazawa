# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hybrid hardware-software rhythm game ("どんどんぱっ") that combines:
- M5Stack AtomS3 microcontroller with physical mat sensors
- Node.js/Express web server with WebSocket real-time communication
- Ollama local LLM (Phi-4 model) for dynamic game commentary

## Essential Commands

### Running the Game
```bash
# Recommended: Use the start script which handles all setup
./start.sh

# Manual start (if needed)
npm install
npm start
```

### Embedded Development
```bash
# Build firmware for M5Stack AtomS3
pio run

# Upload to device
pio run --target upload

# Monitor serial output
pio device monitor
```

## Architecture

### Communication Flow
```
Physical Mat → M5Stack (Serial) → Node.js Server → WebSocket → Browser
                                       ↓
                                 Ollama API → Phi-4 Model
```

### Key Components

1. **server.js**: Main Node.js server
   - Express for static file serving
   - WebSocket server for real-time communication
   - Serial port handling for hardware interface
   - Game state management

2. **script.js**: Browser-side game logic
   - WebSocket client
   - Game state machine (Title → Countdown → Playing → Results)
   - Scoring system (+100 for correct "Pa", -50 for wrong timing)
   - Ollama integration for AI commentary

3. **src/main.cpp**: M5Stack firmware
   - Button input handling
   - LED control (WS2812B strips)
   - Serial communication protocol

4. **ollama-api.js**: Ollama API wrapper
   - Manages local LLM calls
   - Handles real-time commentary and end-game evaluation

## Development Notes

- Game uses "Don-Don-Pa" rhythm pattern
- Physical input via mat sensors connected to M5Stack
- Keyboard fallback: '1' key for game input, '2' key for start
- Serial communication at 115200 baud
- WebSocket broadcasts to all connected clients
- Ollama must be running locally with Phi-4 model installed