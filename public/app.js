mdc.ripple.MDCRipple.attachTo(document.querySelector('.mdc-button'));

// DEfault configuration - Change these if you have a different STUN or TURN server.
const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;
let roomId = null;

function init() {
  console.log('Init-1');
  document.querySelector('#cameraBtn').addEventListener('click', openUserMedia);
  document.querySelector('#hangupBtn').addEventListener('click', hangUp);
  document.querySelector('#createBtn').addEventListener('click', createRoom);
  document.querySelector('#joinBtn').addEventListener('click', joinRoom);
  roomDialog = new mdc.dialog.MDCDialog(document.querySelector('#room-dialog'));
  console.log('Init-2');
}

async function createRoom() {
	
  console.log('createRoom');
	
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;
  const db = firebase.firestore();

  console.log('Create PeerConnection with configuration: ', configuration);
  peerConnection = new RTCPeerConnection(configuration);

  registerPeerConnectionListeners();

  
  
  //Adicione código para criar uma sala aqui. 
  console.log('createRoom-1');
  
   const offer = await peerConnection.createOffer();
   await peerConnection.setLocalDescription(offer);

	const roomWithOffer = {
		offer: {
			type: offer.type,
			sdp: offer.sdp
		}
	}
	const roomRef = await db.collection('rooms').add(roomWithOffer);
	const roomId = roomRef.id;
	document.querySelector('#currentRoom').innerText = `Current room is ${roomId} - You are the caller!` 
    console.log('createRoom-2');	
  //Código para criar sala acima.
  
  
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  
  // Código para criar uma sala abaixo  
  // Código para criar uma sala acima
  
  
  

  // Código para coletar candidatos a ICE abaixo  
  // Código para coletar candidatos de ICE acima

  peerConnection.addEventListener('track', event => {
    console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    });
  });

  
  // Escutando a descrição da sessão remota abaixo
  // Escutando a descrição da sessão remota acima

  
  // Ouça os candidatos remotos ao ICE abaixo
  // Ouça candidatos remotos de ICE acima
  
  
}

function joinRoom() {
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;

  document.querySelector('#confirmJoinBtn').
      addEventListener('click', async () => {
        roomId = document.querySelector('#room-id').value;
        console.log('Join room: ', roomId);
        document.querySelector(
            '#currentRoom').innerText = `Current room is ${roomId} - You are the callee!`;
        await joinRoomById(roomId);
      }, {once: true});
  roomDialog.open();
}

async function joinRoomById(roomId) {  //funcao ativa o tempo inteira(loop/treed) assicrona.
  const db = firebase.firestore();
  const roomRef = db.collection('rooms').doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  console.log('Got room:', roomSnapshot.exists);

  if (roomSnapshot.exists) {
    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners();
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Code for collecting ICE candidates below
    const offer = roomSnapshot.data().offer;
	await peerConnection.setRemoteDescription(offer);
	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);

	const roomWithAnswer = {
		answer: {
			type: answer.type,
			sdp: answer.sdp
		}
	}
	
	await roomRef.update(roomWithAnswer);
    // Code for collecting ICE candidates above

    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
    });

    // Code for creating SDP answer below

    // Code for creating SDP answer above

    // Listening for remote ICE candidates below

    // Listening for remote ICE candidates above
  }
}

async function openUserMedia(e) {  //funcao ativa o tempo inteira(loop/treed) assicrona.

  const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});  //vídeo local
  
  document.querySelector('#localVideo').srcObject = stream; //exibe vídeo local.
  localStream = stream; //carrega video local, streem global.
  
  remoteStream = new MediaStream(); //estacia variavel global
  document.querySelector('#remoteVideo').srcObject = remoteStream; //carrega video remoto streem remoto

  console.log('Stream:', document.querySelector('#localVideo').srcObject);
  document.querySelector('#cameraBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = false;
  document.querySelector('#createBtn').disabled = false;
  document.querySelector('#hangupBtn').disabled = false;
}

async function hangUp(e) {
  const tracks = document.querySelector('#localVideo').srcObject.getTracks();
  tracks.forEach(track => {
    track.stop();
  });

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  document.querySelector('#localVideo').srcObject = null;
  document.querySelector('#remoteVideo').srcObject = null;
  document.querySelector('#cameraBtn').disabled = false;
  document.querySelector('#joinBtn').disabled = true;
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#hangupBtn').disabled = true;
  document.querySelector('#currentRoom').innerText = '';

  // Delete room on hangup
  if (roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);
    const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    calleeCandidates.forEach(async candidate => {
      await candidate.delete();
    });
    const callerCandidates = await roomRef.collection('callerCandidates').get();
    callerCandidates.forEach(async candidate => {
      await candidate.delete();
    });
    await roomRef.delete();
  }

  document.location.reload(true);
}

function registerPeerConnectionListeners() {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log(
        `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener('iceconnectionstatechange ', () => {
    console.log(
        `ICE connection state change: ${peerConnection.iceConnectionState}`);
  });
}

init();
