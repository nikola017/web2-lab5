import { set } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";
// vidi je li preglednik podržava Service Worker i Backround Sync
const isBackgroundSyncSupported = 'serviceWorker' in navigator && 'SyncManager' in window;

// Snimanje Audio zapisa
let mediaRecorder;
let audioChunks = [];

document.getElementById('btnStopRecording').disabled = true;

document.getElementById('btnStartRecording').addEventListener('click', () => {
    console.log("Started recording");
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            document.getElementById('btnStartRecording').disabled = true;
            document.getElementById('btnStopRecording').disabled = false;

            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', () => {
                document.getElementById('afterRecord').style.display = 'block';
                document.getElementById('beforeRecord').style.display = 'none';

                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(audioBlob);
                document.getElementById('audioPlayer').src = audioUrl;

                console.log("Stoped recording");
            });
        });
    
});

document.getElementById('btnStopRecording').addEventListener('click', () => {
    console.log("btnStopRecording");
    mediaRecorder.stop();
    document.getElementById('btnStartRecording').disabled = false;
    document.getElementById('btnStopRecording').disabled = true;
});

// prekid upload
document.getElementById('btnCancel').addEventListener('click', () => {
    document.getElementById('afterRecord').style.display = 'none';
    document.getElementById('beforeRecord').style.display = 'block';
    document.getElementById('audioName').value = '';
    audioChunks = [];
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = ''; // Ukloni izvor za audio player
    console.log("Recording cancelled");
});


// upload Audio zapisa
document.getElementById('btnUploadAudio').addEventListener('click', () => {
    console.log('Proces upload je počeo');
    const audioName = document.getElementById('audioName').value.trim();
    const audioBlob = new Blob(audioChunks);
    const ts = new Date().toISOString();
    const id = ts + audioName.replace(/\s/g, "_");

    if (!audioName) {
        warningText.style.display = 'block';
        return;
    } else {
        warningText.style.display = 'none';
    }

    document.getElementById('btnCancel').disabled = true;
    document.getElementById('btnUploadAudio').disabled = true;

    const audioData = {
        id,
        ts,
        title: audioName,
        audio: audioBlob
    };

    set(id, audioData).then(() => {
        // resetiraj elemente nakon uploada
        document.getElementById('afterRecord').style.display = 'none';
        document.getElementById('beforeRecord').style.display = 'block';
        document.getElementById('audioName').value = '';
    
        console.log('Audio snimka spremljena:', audioName);
        if (isBackgroundSyncSupported) {
            console.log('Prije serviceWorker.ready');
            navigator.serviceWorker.ready.then(swRegistration => {
                console.log('Unutar serviceWorker.ready');
                document.getElementById('btnCancel').disabled = false;
                document.getElementById('btnUploadAudio').disabled = false;
                return swRegistration.sync.register('sync-audio').then(() => {
                    console.log('Background Sync registriran');});
            });
        }
    }).catch(error => {
        console.error('Greška pri spremanju audio snimke:', error);
        document.getElementById('btnCancel').disabled = false;
        document.getElementById('btnUploadAudio').disabled = false;
    });
    document.getElementById('btnCancel').disabled = false;
    document.getElementById('btnUploadAudio').disabled = false;
    audioChunks = [];
});