import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { getSocket, connectSocket } from '../../../../../service/Chat.socket.service';
import api from '../../../../../config/axios';

const buildIceConfig = () => {
    const turnUrls = (import.meta.env.VITE_TURN_URLS || '')
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);

    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (turnUrls.length > 0 && turnUsername && turnCredential) {
        iceServers.unshift({
            urls: turnUrls,
            username: turnUsername,
            credential: turnCredential,
        });
    }

    return {
        iceServers,
        iceCandidatePoolSize: 10,
    };
};

const ICE_CONFIG = buildIceConfig();

const getStrId = (id) => String(id?._id || id || '');
const toSessionDescriptionInit = (description) => ({
    type: description?.type,
    sdp: description?.sdp,
});
const toIceCandidateInit = (candidate) => ({
    candidate: candidate?.candidate,
    sdpMid: candidate?.sdpMid ?? null,
    sdpMLineIndex: candidate?.sdpMLineIndex ?? null,
    usernameFragment: candidate?.usernameFragment ?? null,
});

const useWebRTC = (chatId) => {
    const { user } = useAuth(); // Ensure user is available here
    const currentUserId = getStrId(user?._id || user?.id);

    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [currentCall, setCurrentCall] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null); // Added back if needed
    const [callStatus, setCallStatus] = useState('idle');
    const [participants, setParticipants] = useState([]);

    // Media States
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [connectionQuality, setConnectionQuality] = useState(new Map());
    const [callError, setCallError] = useState(null);

    // Refs
    const peerConnectionsRef = useRef(new Map());
    const iceCandidateQueueRef = useRef(new Map());
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const currentCallIdRef = useRef(null);
    const cleanupRef = useRef(null);
    const callStatusRef = useRef('idle');
    const activeChatId = getStrId(chatId);

    const sock = useCallback(() => {
        const existing = getSocket();
        if (existing) return existing;
        if (!user) return null;
        return connectSocket();
    }, [user]);

    useEffect(() => {
        callStatusRef.current = callStatus;
    }, [callStatus]);

    // ── 1. Join Socket Room ──────────────────────────────────────────────
    useEffect(() => {
        const socket = sock();
        if (!socket || !activeChatId) return;

        socket.emit('join-chat', activeChatId);
        console.log(`[WebRTC] Joined socket room: ${activeChatId}`);

        return () => {
            socket.emit('leave-chat', activeChatId);
        };
    }, [activeChatId, sock]);

    // If user opens chat late (after ring event), hydrate from active call API.
    useEffect(() => {
        if (!user || !activeChatId) return;

        let cancelled = false;

        const hydrateActiveCall = async () => {
            try {
                const response = await api.get('/api/calls/active', {
                    params: { chatId: activeChatId }
                });
                const activeCall =
                    response?.data?.data?.activeCall ||
                    response?.data?.activeCall ||
                    null;

                if (!activeCall || cancelled) return;

                const activeCallChatId = getStrId(activeCall.chatId?._id || activeCall.chatId);
                if (activeCallChatId !== activeChatId) return;

                currentCallIdRef.current = getStrId(activeCall._id || activeCall.callId);
                setCurrentCall(activeCall);
                setParticipants((activeCall.activeParticipants || activeCall.participants || []).filter(p => !p.leftAt));
                setCallStatus('idle');
                callStatusRef.current = 'idle';
            } catch (error) {
                // Silent fallback; active call may legitimately not exist.
            }
        };

        hydrateActiveCall();

        return () => {
            cancelled = true;
        };
    }, [user, activeChatId]);

    // ── 2. Call Actions ──────────────────────────────────────────────────
    const initializeLocalStream = useCallback(async (constraints) => {
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsVideoEnabled(!!constraints.video);
            setIsAudioEnabled(true);
            return stream;
        } catch (err) {
            console.error('[WebRTC] Media Error:', err);
            throw new Error('Could not access camera/microphone.');
        }
    }, []);

    const startCall = useCallback(async (type = 'video') => {
        const s = sock();
        if (!s) return setCallError("No connection");
        if (!activeChatId) return setCallError("No chat selected");
        try {
            setCallError(null);
            setCallStatus('initiating');
            callStatusRef.current = 'initiating';
            // UI opens immediately
            setCurrentCall({ chatId: { _id: activeChatId }, type, callerId: currentUserId });
            await initializeLocalStream({ video: type === 'video', audio: true });
            s.emit('call:start', { chatId: activeChatId, type });
        } catch (err) {
            setCallError(err.message);
            setCallStatus('idle');
            callStatusRef.current = 'idle';
        }
    }, [activeChatId, sock, initializeLocalStream, currentUserId]);

    const joinCall = useCallback(async (callId, type = 'video') => {
        const s = sock();
        if (!s) return;
        try {
            setCallError(null);
            setCallStatus('initiating');
            callStatusRef.current = 'initiating';
            await initializeLocalStream({ video: type === 'video', audio: true });
            s.emit('call:join', { 
                callId, 
                mediaState: { video: type === 'video', audio: true } 
            });
        } catch (err) {
            setCallError(err.message);
            setCallStatus('idle');
            callStatusRef.current = 'idle';
        }
    }, [sock, initializeLocalStream]);

    const leaveCall = useCallback(() => {
        const s = sock();
        if (currentCallIdRef.current && s) {
            s.emit('call:leave', { callId: currentCallIdRef.current });
        }
        cleanupRef.current?.();
    }, [sock]);

    const endCall = useCallback(() => {
        const s = sock();
        if (currentCallIdRef.current && s) {
            s.emit('call:end', { callId: currentCallIdRef.current });
        }
        cleanupRef.current?.();
    }, [sock]);

    // ── 3. Peer Connections ──────────────────────────────────────────────
    const createPeerConnection = useCallback((targetUserId) => {
        const uIdStr = getStrId(targetUserId);
        if (peerConnectionsRef.current.has(uIdStr)) return peerConnectionsRef.current.get(uIdStr);

        const pc = new RTCPeerConnection(ICE_CONFIG);
        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        pc.onicecandidate = ({ candidate }) => {
            const s = sock();
            if (candidate && currentCallIdRef.current && s) {
                s.emit('call:ice-candidate', {
                    callId: currentCallIdRef.current,
                    candidate: toIceCandidateInit(candidate),
                    targetUserId: uIdStr,
                });
            }
        };

        pc.ontrack = ({ streams }) => {
            if (streams[0]) {
                setRemoteStreams(prev => {
                    const next = new Map(prev);
                    next.set(uIdStr, streams[0]);
                    return next;
                });
            }
        };

        peerConnectionsRef.current.set(uIdStr, pc);
        return pc;
    }, [sock]);

    // ── 4. Socket Listeners ──────────────────────────────────────────────
    useEffect(() => {
        const socket = sock();
        if (!socket) return;

        const cleanup = () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                setLocalStream(null);
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            iceCandidateQueueRef.current.clear();
            setRemoteStreams(new Map());
            setParticipants([]);
            setCurrentCall(null);
            setCallStatus('idle');
            callStatusRef.current = 'idle';
            setIncomingCall(null);
            currentCallIdRef.current = null;
        };
        cleanupRef.current = cleanup;

        // EVENTS
        
        // Fix: Logic for Recipients
        const onCallInitiated = (data) => {
            console.log('[WebRTC] Call Initiated:', data);

            const initiatedChatId = getStrId(data.call?.chatId || data.chatId);
            // Keep call view scoped when a chat is actively selected.
            if (activeChatId && initiatedChatId && initiatedChatId !== activeChatId) return;

            currentCallIdRef.current = data.callId;
            setCurrentCall(data.call);
            setParticipants((data.call?.participants || []).filter(p => !p.leftAt));
            setIncomingCall(null);
            setCallError(null);

            // If I am NOT the caller, stay IDLE so the "Join Bar" shows.
            const eventCallerId = getStrId(data.callerId);
            if (currentUserId && eventCallerId !== currentUserId) {
                setCallStatus('idle');
                callStatusRef.current = 'idle';
            } else if (currentUserId && callStatusRef.current === 'idle') {
                // Defensive: if caller status got reset, keep signaling active.
                setCallStatus('initiating');
                callStatusRef.current = 'initiating';
            }
        };

        const onCallJoined = (data) => {
            console.log('[WebRTC] Call Joined:', data);
            currentCallIdRef.current = data.callId;
            setCurrentCall(data.call);
            setParticipants(data.participants || []);
            setCallStatus('ongoing');
            callStatusRef.current = 'ongoing';
        };

        const onParticipantJoined = async (data) => {
            if (!data?.participant?.userId) return;

            const pid = getStrId(data.participant.userId);
            setParticipants(prev => {
                if (prev.some(p => getStrId(p.userId) === pid)) return prev;
                return [...prev, data.participant];
            });

            if (!currentCallIdRef.current) return;

            // Only create offer if *I* am already in the call and local stream exists.
            if ((callStatusRef.current === 'ongoing' || callStatusRef.current === 'initiating') && localStreamRef.current) {
                const pc = createPeerConnection(pid);
                const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
                await pc.setLocalDescription(offer);
                socket.emit('call:offer', {
                    callId: currentCallIdRef.current,
                    offer: toSessionDescriptionInit(offer),
                    targetUserId: pid
                });
            }
        };

        const onIncomingCall = (data) => {
            currentCallIdRef.current = data.callId;
            setIncomingCall(data);
            setCurrentCall((prev) => {
                const prevId = getStrId(prev?.callId || prev?._id);
                if (prevId && prevId === getStrId(data.callId)) return prev;

                return {
                    _id: data.callId,
                    callId: data.callId,
                    type: data.type,
                    callerId: data.callerId,
                    chatId: {
                        _id: getStrId(data.chatId),
                        name: data.chatName
                    }
                };
            });
            setParticipants([]);
            setCallStatus('idle');
            callStatusRef.current = 'idle';
        };

        const onOffer = async (data) => {
            currentCallIdRef.current = data.callId;
            const fromId = getStrId(data.fromUserId);
            const pc = createPeerConnection(fromId);
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            
            const queue = iceCandidateQueueRef.current.get(fromId) || [];
            for (const candidate of queue) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            iceCandidateQueueRef.current.delete(fromId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('call:answer', {
                callId: data.callId,
                answer: toSessionDescriptionInit(answer),
                targetUserId: fromId
            });
        };

        const onAnswer = async (data) => {
            const fromId = getStrId(data.fromUserId);
            const pc = peerConnectionsRef.current.get(fromId);
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

            const queue = iceCandidateQueueRef.current.get(fromId) || [];
            for (const candidate of queue) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {}
            }
            iceCandidateQueueRef.current.delete(fromId);
        };

        const onIceCandidate = async (data) => {
            const fromId = getStrId(data.fromUserId);
            const pc = peerConnectionsRef.current.get(fromId);
            if (!pc || !pc.remoteDescription) {
                const queue = iceCandidateQueueRef.current.get(fromId) || [];
                queue.push(data.candidate);
                iceCandidateQueueRef.current.set(fromId, queue);
                return;
            }

            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {}
        };

        const onParticipantMediaUpdate = ({ userId, mediaState }) => {
            const uid = getStrId(userId);

            setParticipants(prev => prev.map((participant) => {
                if (getStrId(participant.userId) !== uid) return participant;

                return {
                    ...participant,
                    mediaState: {
                        ...(participant.mediaState || {}),
                        ...(mediaState || {})
                    }
                };
            }));
        };

        const onParticipantLeft = (data) => {
            const userId = getStrId(data.userId);
            const pc = peerConnectionsRef.current.get(userId);
            if (pc) { pc.close(); peerConnectionsRef.current.delete(userId); }
            setRemoteStreams(prev => { const n = new Map(prev); n.delete(userId); return n; });
            setParticipants(prev => prev.filter(p => getStrId(p.userId) !== userId));
        };

        const onCallEnded = () => {
            console.log('[WebRTC] Call Ended');
            cleanup();
        };

        const onCallError = (data) => {
            const reason = data?.reason || 'Call failed';
            console.error('[WebRTC] Call Error:', reason);
            setCallError(reason);
        };

        socket.on('call:initiated', onCallInitiated);
        socket.on('call:incoming', onIncomingCall);
        socket.on('call:joined', onCallJoined);
        socket.on('call:participant-joined', onParticipantJoined);
        socket.on('call:offer', onOffer);
        socket.on('call:answer', onAnswer);
        socket.on('call:ice-candidate', onIceCandidate);
        socket.on('call:participant-media-update', onParticipantMediaUpdate);
        socket.on('call:participant-left', onParticipantLeft);
        socket.on('call:ended', onCallEnded);
        socket.on('call:error', onCallError);

        return () => {
            socket.off('call:initiated', onCallInitiated);
            socket.off('call:incoming', onIncomingCall);
            socket.off('call:joined', onCallJoined);
            socket.off('call:participant-joined', onParticipantJoined);
            socket.off('call:offer', onOffer);
            socket.off('call:answer', onAnswer);
            socket.off('call:ice-candidate', onIceCandidate);
            socket.off('call:participant-media-update', onParticipantMediaUpdate);
            socket.off('call:participant-left', onParticipantLeft);
            socket.off('call:ended', onCallEnded);
            socket.off('call:error', onCallError);
        };
    }, [sock, createPeerConnection, activeChatId, currentUserId]);

    // ── Media Toggles (Standard) ─────────────────────────────────────────
    const toggleAudio = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsAudioEnabled(track.enabled);
            const s = sock();
            if (currentCallIdRef.current && s) {
                s.emit('call:media-state', { callId: currentCallIdRef.current, mediaState: { audio: track.enabled } });
            }
        }
    }, [sock]);

    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsVideoEnabled(track.enabled);
            const s = sock();
            if (currentCallIdRef.current && s) {
                s.emit('call:media-state', { callId: currentCallIdRef.current, mediaState: { video: track.enabled } });
            }
        }
    }, [sock]);

    const toggleScreenShare = useCallback(async () => { /* Add logic if needed */ }, []);

    return {
        localStream,
        remoteStreams,
        currentCall,
        incomingCall, // Return incomingCall if you want to use the old modal too
        callStatus,
        participants,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        connectionQuality,
        callError,
        startCall,
        joinCall,
        leaveCall,
        endCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare
    };
};

export default useWebRTC;
