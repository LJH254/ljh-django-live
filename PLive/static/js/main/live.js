function showToast(icon_html, tip, will_decay) {
    document.getElementById('toastIcon').innerHTML = icon_html
    document.getElementById('toastText').innerHTML = tip;
    TipToast = new bootstrap.Toast(TipToast_el, {
        autohide: will_decay,
        delay: 2000
    })
    TipToast.show();
}

async function enumerateDevices() {
    mediaDevices = await navigator.mediaDevices.enumerateDevices();

    videoSelect.innerHTML = mediaDevices
        .filter(d => d.kind === 'videoinput')
        .map(d => `<option value="${d.deviceId}">${d.label || '摄像头'}</option>`)
        .join('');

    audioSelect.innerHTML = mediaDevices
        .filter(d => d.kind === 'audioinput')
        .map(d => `<option value="${d.deviceId}">${d.label || '麦克风'}</option>`)
        .join('');
}

async function getLocalStream() {
    const videoSource = videoSelect.value;
    const audioSource = audioSelect.value;

    const constraints = {
        video: { deviceId: videoSource ? { exact: videoSource } : true },
        audio: { deviceId: audioSource ? { exact: audioSource } : true }
    };

    try {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById('localVideo').srcObject = localStream;

        const micButton = document.getElementById('toggleMic');
        const camButton = document.getElementById('toggleCam');
        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        if (audioTrack) {
            micButton.disabled = false;
            micButton.innerHTML = audioTrack.enabled ?
                '<i class="bi bi-mic-mute"></i> 禁用麦克风' :
                '<i class="bi bi-mic"></i> 启用麦克风';
        } else {
            micButton.disabled = true;
        }

        if (videoTrack) {
            camButton.disabled = false;
            camButton.innerHTML = videoTrack.enabled ?
                '<i class="bi bi-camera-video-off"></i> 禁用摄像头' :
                '<i class="bi bi-camera-video"></i> 启用摄像头';
        } else {
            camButton.disabled = true;
        }
    } catch (err) {
        console.error("获取媒体设备失败:", err);
    }
}

async function init() {
    await enumerateDevices();
    await getLocalStream();

    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);

    videoSelect.addEventListener('change', getLocalStream);
    audioSelect.addEventListener('change', getLocalStream);
}

function createPeerConnection() {
    if (pc) {
        pc.close();
        pc = null;
    }

    const config = {
        iceServers: [
            {
                urls: 'turn:106.53.106.131:3480',
                username: 'ljh',
                credential: '65536'
            },
            {
                urls: 'stun:stun.l.google.com:19302'
            }
        ]
    };
    pc = new RTCPeerConnection(config);

    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    if (audioTrack) pc.addTrack(audioTrack, localStream);
    if (videoTrack) pc.addTrack(videoTrack, localStream);

    pc.onnegotiationneeded = async () => {
        if (isNegotiating) return;
        isNegotiating = true;
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws_signal.send(JSON.stringify({
                type: 'offer',
                sdp: offer.sdp
            }));
        } catch (err) {
            console.error("协商失败:", err);
        } finally {
            isNegotiating = false;
        }
    };

    pc.ontrack = (e) => {
        if (!rv.srcObject) {
            rv.srcObject = e.streams[0];
            console.log(e.streams[0]);
        }
    };

    pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
            case "connected":
                console.log('Connected successfully!');
                updateButtonState(true);

                showToast(
                    '<i class="fa-solid fa-circle-check fa-lg" style="color: green;"></i>',
                    '连接成功！',
                    true
                );

                document.getElementById('remote-video-container').style.visibility = '';
                break;
            case "disconnected":
                console.log('Connection closed');
                if (pc) {
                    pc.close();
                    pc = null;
                }
                rv.srcObject = null;
                updateButtonState(false);
                break;
        }
    };

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            ws_signal.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: e.candidate
            }));
        }
    };
}

function startCall() {
    showToast(
        '<span id="rc-spinner" class="spinner-border spinner-border-sm" aria-hidden="true"></span>',
        '连接中...',
        false
    );

    if (!pc) createPeerConnection();
    updateButtonState(true);
    onCall = true;

    ws_session.send(JSON.stringify({
        name: 'session',
        state: true
    }));
}

function hangup() {
    if (pc) {
        pc.close();
        pc = null;
    }
    rv.srcObject = null;
    updateButtonState(false);
    onCall = false;

    document.getElementById('remote-video-container').style.visibility = 'hidden';
    EndModal.show();
}

function updateButtonState(connected) {
    document.getElementById('hangup').disabled = !connected;
}

function timer() {
    let seconds = 0;
    const timerElement = document.querySelector('.timer');
    const statusElement = document.getElementById('call-status');

    function updateTimer() {
        if (seconds >= 300) {
            WaitModal.hide();
            showToast('<i class="fa-solid fa-circle-xmark fa-lg" style="color: red;"></i>', '对方长时间未接听，已挂断', true);
            EndModal.show();

            ws_call.send(JSON.stringify({
                token: ws_token,
                caller_name: caller_name,
                csrftoken: ws_csrftoken,
                from: csrftoken,
                role: 'user',
                state: false
            }));
        }
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        statusElement.textContent = `正在等待对方接听${'.'.repeat(seconds % 4)}`;
    }

    setInterval(updateTimer, 1000);

    document.getElementById('btn-end').addEventListener('click', function() {
        ws_call.send(JSON.stringify({
            token: ws_token,
            caller_name: caller_name,
            csrftoken: ws_csrftoken,
            from: csrftoken,
            role: 'user',
            state: false
        }));
        EndModal.show();
    });
}


const roomName = room_uuid;
let ws_signal;
let ws_session;
let ws_call;

let pc = null;
let localStream = null;
let isNegotiating = false;
let videoSelect;
let audioSelect;
let rv;

let WaitModal;
let EndModal;
let TipToast_el;
let TipToast;

let onCall = false;

let mediaDevices = [];

document.addEventListener('DOMContentLoaded', async function () {
    WaitModal = new bootstrap.Modal(document.getElementById('waitModal'));
    EndModal = new bootstrap.Modal(document.getElementById('endModal'));
    TipToast_el = document.getElementById('tipToast');

    showToast(
        '<span id="rc-spinner" class="spinner-border spinner-border-sm" aria-hidden="true"></span>',
        '加载中...',
        false
    );

    videoSelect = document.getElementById('videoSelect');
    audioSelect = document.getElementById('audioSelect');
    rv = document.getElementById('remoteVideo');

    await init();

    ws_signal = new WebSocket(`wss://${window.location.host}/ws/signaling/${roomName}/`);
    ws_session = new WebSocket(`wss://${window.location.host}/ws/session/${roomName}/`);
    ws_call = new WebSocket(`wss://ljhchat.top/ws/call/?csrftoken=${csrftoken}&role=caller`);

    document.getElementById('hangup').addEventListener('click', () => {
        hangup();

        ws_session.send(JSON.stringify({
            name: 'session',
            state: false
        }));
    });

    ws_signal.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        try {
            switch(data.type) {
                case 'offer':
                    if (pc) pc.close();
                    createPeerConnection();
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    ws_signal.send(JSON.stringify({
                        type: 'answer',
                        sdp: answer.sdp
                    }));
                    break;
                case 'answer':
                    if (!pc) return;
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    break;
                case 'ice-candidate':
                    if (pc && pc.remoteDescription) {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                    break;
            }
        } catch (err) {
            console.error("信令处理错误:", err);
        }
    };

    ws_session.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.name === 'session') {
            if (data.state) {
                console.log('Start call!');

                onCall = true;
            } else {
                console.log('Hangup!');

                hangup();
            }
        } else {
            if (data.name === 'device-Cam') {
                document.getElementById('remote-cam-slash').style.display = data.state ? 'none' : '';
            } else if (data.name === 'device-Mic') {
                document.getElementById('remote-mic-slash').style.display = data.state ? 'none' : '';
            }
        }
    }

    ws_call.onopen = () => {
        if (role === 'caller') {
            WaitModal.show();
            document.getElementById('callee-name').textContent = callee_name;
            timer();
            TipToast.hide();

            ws_call.send(JSON.stringify({
                token: ws_token,
                caller_name: caller_name,
                csrftoken: ws_csrftoken,
                from: csrftoken,
                role: 'user',
                state: true
            }))
        } else if (role === 'callee') {
            ws_call.send(JSON.stringify({
                token: ws_token,
                caller_name: caller_name,
                csrftoken: ws_csrftoken,
                from: csrftoken,
                role: 'caller',
                state: true
            }))
        }
    }

    ws_call.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.from === ws_csrftoken) {
            if (data.state) {
                WaitModal.hide();
                startCall();
            } else {
                WaitModal.hide();
                showToast('<i class="fa-solid fa-circle-xmark fa-lg" style="color: red;"></i>', '对方已挂断', true);
                EndModal.show();
            }
        }
    }

    document.getElementById('toggleMic').addEventListener('click', () => {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            const track = audioTracks[0];
            track.enabled = !track.enabled;

            const button = document.getElementById('toggleMic');
            const mic_slash = document.getElementById('local-mic-slash');
            button.innerHTML = track.enabled ?
                '<i class="bi bi-mic-mute"></i> 禁用麦克风' :
                '<i class="bi bi-mic"></i> 启用麦克风';

            mic_slash.style.display = track.enabled ? 'none' : '';

            if (onCall) {
                ws_session.send(JSON.stringify({
                    name: 'device-Mic',
                    state: track.enabled
                }));
            }
        }
    });

    document.getElementById('toggleCam').addEventListener('click', () => {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
            const track = videoTracks[0];
            track.enabled = !track.enabled;

            const button = document.getElementById('toggleCam');
            const cam_slash = document.getElementById('local-cam-slash');
            button.innerHTML = track.enabled ?
                '<i class="bi bi-camera-video-off"></i> 禁用摄像头' :
                '<i class="bi bi-camera-video"></i> 启用摄像头';

            cam_slash.style.display = track.enabled ? 'none' : '';

            if (onCall) {
                ws_session.send(JSON.stringify({
                    name: 'device-Cam',
                    state: track.enabled
                }));
            }
        }
    });
});