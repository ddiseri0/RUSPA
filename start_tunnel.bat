@echo off
echo ===================================================
echo   Avvio Sistema Ruspa + Tunnel per Dispositivi (iPhone)
echo ===================================================

echo [1/3] Avvio del Server Backend (sulla porta 3001)
start "Ruspa Backend Server" cmd /k "npm run server"

echo [2/3] Avvio del Frontend Vite (sulla porta 3000)
start "Ruspa Frontend Server" cmd /k "npm run dev"

echo Attendere qualche secondo per permettere l'avvio locale...
timeout /t 5 >nul

echo [3/3] Creazione del Tunnel HTTPS pubblico
echo.
echo Stiamo utilizzando LocalTunnel tramite npx. 
echo (Verrà generato un link https temporaneo che puoi aprire dall'iPhone).
echo L'iPhone comunicherà col frontend e il proxy di Vite gestirà le chiamate Socket.io.
echo.
echo NOTA SE USI NGROK: Se preferisci ngrok, chiudi la prossima finestra e lancia:
echo "ngrok http 3000" (dopo aver configurato il token).
echo.
start "Ruspa Public Tunnel" cmd /k "npx --yes localtunnel --port 3000"

echo ===================================================
echo Tunnel aperto in una nuova finestra! 
echo Cerca l'URL che comincia con https://... 
echo e aprilo dal telefono.
echo ===================================================
pause
