### Commande magique

```
ffmpeg -re -i input.mp3 -f s16le -ac 1 -ar 16000 rtp://127.0.0.1:5000
```

ffmpeg -list_devices true -f dshow -i dummy
ffmpeg -f dshow -i audio="YOUR_MIC_NAME" -acodec pcm_s16le -ar 16000 -ac 1 -f rtp rtp://127.0.0.1:5000


# BUFFER PLUS BAS

ffmpeg -f dshow -i audio="VOTRE_MICRO" -acodec pcm_s16le -ar 16000 -ac 1 -probesize 32 -analyzeduration 0 -f rtp rtp://127.0.0.1:5000


ffmpeg -f dshow -i audio="Réseau de microphones (Technologie Intel® Smart Sound pour microphones numériques)" -acodec pcm_s16le -ar 16000 -ac 1 -probesize 32 -analyzeduration 0 -f rtp rtp://127.0.0.1:5000
