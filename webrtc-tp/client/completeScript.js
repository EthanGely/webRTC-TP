// script.js
// Url du serveur WebSocket
const ws = new WebSocket('wss://ethan-server.com/ws/');
// éléments HTML
const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");
const startBtn = document.getElementById("startCamera");
const callBtn = document.getElementById("startCall");
const chatInput = document.getElementById("chatInput");
const chatDisplay = document.getElementById("chatDisplay");
const sendBtn = document.getElementById("sendMsg");

// Variables pour le stream local et la connexion WebRTC
let localStream;
let peerConnection;

// Configuration des serveurs ICE
const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:relay1.expressturn.com:3480",
      username: "174798420780525130",
      credential: "a33GyYV5wDcAM0Hv5cx5MNhqkvs=",
    },
]
};

// Click sur le bouton "Démarrer la caméra"
startBtn.onclick = async () => {
  if (localStream) return; // already started

  try {
    ////-------- TODO -------- ////
    // Récupérer le stream de la caméra (SANS audio)
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    ////-------- ---- -------- ////

    if (!localStream) {
      alert("Vous devez corriger le script.js pour récupérer le stream de la caméra.");
      return;
    }

    // Affecter le stream local à la vidéo locale (retour vidéo)
    localVideo.srcObject = localStream;
  } catch (err) {
    alert("Unable to access camera.");
    console.error(err);
  }
};

// Click sur le bouton "Démarrer l'appel"
callBtn.onclick = async () => {
  if (!localStream) {
    alert("Please start your camera first.");
    return;
  }

  createPeer();

  ////-------- TODO -------- ////
  // Ajouter les tracks de localStream à peerConnection
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
  ////-------- ---- -------- ////

  if (peerConnection.getSenders().length === 0) {
    alert("Vous devez ajouter les tracks de localStream à peerConnection!");
    return;
  }

  const offer = await peerConnection.createOffer();

  ////-------- TODO -------- ////
  // Mettre l'offre dans la description locale
  await peerConnection.setLocalDescription(offer);
  ////-------- ---- -------- ////

  if (!peerConnection.localDescription) {
    alert("Vous devez mettre l'offre dans la description locale!");
    return;
  }

  ws.send(JSON.stringify({ offer }));
};

sendBtn.onclick = () => {
  const message = chatInput.value;
  dataChannel.send(message);
  addChatMessage("🟢 Me", message);
  chatInput.value = "";
};

function createPeer() {
  peerConnection = new RTCPeerConnection(config);

  // Video track handler
  peerConnection.ontrack = (event) => {
    ////-------- TODO -------- ////
    // Affecter le stream distant à la vidéo distante
    remoteVideo.srcObject = event.streams[0];
    ////-------- ---- -------- ////
  };

  // Trickle ICE
  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      ws.send(JSON.stringify({ candidate: e.candidate }));
    }
  };

  // Data channel for chat
  dataChannel = peerConnection.createDataChannel("chat");
  dataChannel.onmessage = (e) => {
    addChatMessage("🔵 Peer", e.data);
  };

  peerConnection.ondatachannel = (e) => {
    dataChannel = e.channel;
    dataChannel.onmessage = (e) => {
      addChatMessage("🔵 Peer", e.data);
    };
  };
}

ws.onmessage = async ({ data }) => {
  const msg = JSON.parse(data);

  if (msg.offer) {
    createPeer();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer));

    if (localStream) {
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    } else {
      console.warn("localStream is not available; skipping track addition.");
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    ws.send(JSON.stringify({ answer }));
  }

  if (msg.answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer));
  }

  if (msg.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
    } catch (e) {
      console.warn("Error adding received ICE candidate", e);
    }
  }
};

function addChatMessage(author, message) {
  const el = document.createElement("p");
  el.innerText = `${author}: ${message}`;
  chatDisplay.appendChild(el);
}