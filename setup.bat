@echo off
title AI Email Manager - Setup
color 0B
cls

echo.
echo  ==========================================
echo       AI Email Manager - Auto Setup
echo   100%% Free ^| Local AI ^| Zero Cloud
echo  ==========================================
echo.

:: ================================
:: CHECK ADMIN
:: ================================
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo  [ERROR] Please right-click this file and
    echo          select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

:: ================================
:: ADD OLLAMA TO PATH
:: ================================
set "OLLAMA_PATH=%LOCALAPPDATA%\Programs\Ollama"
set "PATH=%PATH%;%OLLAMA_PATH%"

:: ================================
:: STEP 1 - CHECK / INSTALL OLLAMA
:: ================================
echo  [1/4] Checking AI Engine (Ollama)...
echo.

where ollama >nul 2>nul
if %errorlevel%==0 (
    echo  [OK] Ollama is already installed.
) else (
    echo  [..] Ollama not found. Downloading installer...
    echo       This may take a few minutes.
    echo.

    curl -L --progress-bar -o "%TEMP%\OllamaSetup.exe" "https://ollama.com/download/OllamaSetup.exe"

    if not exist "%TEMP%\OllamaSetup.exe" (
        echo.
        echo  [ERROR] Download failed. Please check your internet connection.
        echo          Or download manually from: https://ollama.com/download
        pause
        exit /b 1
    )

    echo.
    echo  [..] Installing Ollama silently...
    start /wait "%TEMP%\OllamaSetup.exe" /S

    :: Refresh PATH after install
    set "PATH=%PATH%;%OLLAMA_PATH%"

    where ollama >nul 2>nul
    if %errorlevel% neq 0 (
        echo  [ERROR] Ollama installation failed.
        echo          Please install manually from: https://ollama.com/download
        pause
        exit /b 1
    )

    echo  [OK] Ollama installed successfully!
)

echo.
timeout /t 2 >nul

:: ================================
:: STEP 2 - START OLLAMA SERVER
:: ================================
cls
echo.
echo  ==========================================
echo  [2/4] Starting AI Engine with CORS...
echo  ==========================================
echo.

:: Kill any existing Ollama instance to avoid port conflict
taskkill /F /IM ollama.exe >nul 2>&1
timeout /t 2 >nul

:: Start Ollama with CORS in a separate window (stays open)
start "Ollama AI Server" cmd /k "color 0A && echo  Ollama AI Server Running... && echo  Keep this window open while using the extension. && echo. && set OLLAMA_ORIGINS=* && ollama serve"

echo  [..] Waiting for server to initialize...
timeout /t 6 >nul

:: Verify server is up
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARN] Server may still be starting. Continuing anyway...
) else (
    echo  [OK] AI Server is running on 127.0.0.1:11434
)

echo.
timeout /t 2 >nul

:: ================================
:: STEP 3 - CHECK / DOWNLOAD MODEL
:: ================================
cls
echo.
echo  ==========================================
echo  [3/4] Checking AI Model (llama3)...
echo  ==========================================
echo.

ollama list 2>nul | findstr /i "llama3" >nul
if %errorlevel%==0 (
    echo  [OK] llama3 model is already available.
) else (
    echo  [..] Model not found. Downloading llama3 (~4 GB)
    echo       Please wait — this only happens once.
    echo.
    echo  +-----------------------------------------+
    echo  ^|  Do NOT close this window during download ^|
    echo  +-----------------------------------------+
    echo.

    ollama pull llama3

    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] Model download failed.
        echo          Make sure you have ~5GB free disk space.
        echo          Try running the setup again.
        pause
        exit /b 1
    )

    echo.
    echo  [OK] llama3 downloaded successfully!
)

echo.
timeout /t 2 >nul

:: ================================
:: STEP 4 - OPEN CHROME EXTENSIONS
:: ================================
cls
echo.
echo  ==========================================
echo  [4/4] Opening Chrome Extensions page...
echo  ==========================================
echo.

echo  [..] Opening chrome://extensions for you...
start chrome "chrome://extensions"
timeout /t 3 >nul

:: ================================
:: DONE
:: ================================
cls
echo.
echo  ==========================================
echo   Setup Complete! Here's what to do next:
echo  ==========================================
echo.
echo  CHROME EXTENSION SETUP (30 seconds):
echo.
echo  1. In the Chrome tab that just opened:
echo     - Turn ON "Developer Mode" (top right toggle)
echo     - Click "Load unpacked"
echo     - Select the "email-manager-extension" folder
echo.
echo  2. Open Gmail: https://mail.google.com
echo.
echo  3. Click the mail icon in Chrome toolbar
echo.
echo  4. Status should show GREEN "Online - 1 model"
echo.
echo  5. Click "Scan Inbox" to analyze your emails!
echo.
echo  ==========================================
echo   NOTE: Keep the "Ollama AI Server" window
echo   open while using the extension.
echo  ==========================================
echo.
echo  Press any key to exit setup...
pause >nul