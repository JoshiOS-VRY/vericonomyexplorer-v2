@echo off
REM Verium RPC Explorer - Windows Development Start Script

echo [INFO] Starting Verium RPC Explorer in development mode...

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found. Creating from template...
    if exist env.example (
        copy env.example .env
        echo [WARNING] Please edit .env file with your Verium node configuration:
        echo   BTCEXP_BITCOIND_URI=bitcoin://rpcuser:rpcpassword@127.0.0.1:36988/
        echo   BTCEXP_ADDRESS_API=electrum
        echo   BTCEXP_ELECTRUM_SERVERS=tcp://127.0.0.1:50001
        echo.
        pause
    ) else (
        echo [ERROR] env.example file not found. Please create a .env file manually.
        pause
        exit /b 1
    )
)

REM Check if node_modules exists
if not exist node_modules (
    echo [INFO] Installing dependencies...
    npm install
)

REM Set environment variables for development
set NODE_ENV=development
set BTCEXP_COIN=VRM
set BTCEXP_HOST=0.0.0.0
set BTCEXP_PORT=3003
set BTCEXP_DISPLAY_CURRENCY=vrm
set BTCEXP_UI_THEME=dark
set DEBUG=btcexp:app,btcexp:error

echo [INFO] Starting Verium RPC Explorer...
echo [INFO] Access it at: http://localhost:3003
echo [INFO] Press Ctrl+C to stop

REM Start the application
npm start
