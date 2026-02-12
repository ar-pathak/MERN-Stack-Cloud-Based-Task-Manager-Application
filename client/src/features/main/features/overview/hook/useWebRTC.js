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
const DEFAULT_AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    volume: 1.0
};
const DEFAULT_VIDEO_CONSTRAINTS = {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 24, max: 30 }
};
const MAX_AUDIO_BITRATE_BPS = 64000;
const MAX_VIDEO_BITRATE_BPS = 1200000;
const ICE_RESTART_COOLDOWN_MS = 8000;
const CONNECTION_STATS_INTERVAL_MS = 5000;
const ACTIVE_SPEAKER_POLL_MS = 220;
const ACTIVE_SPEAKER_THRESHOLD = 18;
const MIC_GAIN_BOOST = 1.8;
const getCallMediaConstraints = (type = 'video') => ({
    video: type === 'video' ? DEFAULT_VIDEO_CONSTRAINTS : false,
    audio: DEFAULT_AUDIO_CONSTRAINTS
});

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
const normalizeChatMembers = (members = []) => {
    const byId = new Map();
    (members || []).forEach((member) => {
        const id = getStrId(member?._id || member?.id || member);
        if (!id) return;
        if (byId.has(id)) return;
        byId.set(id, {
            _id: id,
            id,
            name: member?.name || member?.username || 'User',
            username: member?.username || null,
            avatar: member?.avatar || null,
            isOnline: Boolean(member?.isOnline)
        });
    });
    return Array.from(byId.values());
};

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
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);
    const [callError, setCallError] = useState(null);
    const [invitingUserIds, setInvitingUserIds] = useState([]);

    // Refs
    const peerConnectionsRef = useRef(new Map());
    const iceCandidateQueueRef = useRef(new Map());
    const localStreamRef = useRef(null);
    const rawLocalStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const cameraVideoTrackRef = useRef(null);
    const currentCallIdRef = useRef(null);
    const cleanupRef = useRef(null);
    const callStatusRef = useRef('idle');
    const currentCallTypeRef = useRef('video');
    const statsIntervalRef = useRef(null);
    const iceRestartThrottleRef = useRef(new Map());
    const audioProcessorRef = useRef(null);
    const speakerAudioContextRef = useRef(null);
    const speakerNodesRef = useRef(new Map());
    const speakerIntervalRef = useRef(null);
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

    useEffect(() => {
        if (currentCall?.type) {
            currentCallTypeRef.current = currentCall.type;
        }
    }, [currentCall?.type]);

    const destroyAudioProcessor = useCallback(async () => {
        const processor = audioProcessorRef.current;
        if (!processor) return;

        try {
            processor.source?.disconnect();
            processor.gainNode?.disconnect();
            processor.compressor?.disconnect();
        } catch (error) {
            // Ignore graph disconnect errors.
        }

        if (processor.context && processor.context.state !== 'closed') {
            try {
                await processor.context.close();
            } catch (error) {
                // Ignore context close errors.
            }
        }

        audioProcessorRef.current = null;
    }, []);

    const tuneSenderParameters = useCallback(async (pc) => {
        const senders = pc?.getSenders?.() || [];
        for (const sender of senders) {
            const track = sender?.track;
            if (!track || typeof sender.getParameters !== 'function' || typeof sender.setParameters !== 'function') {
                continue;
            }

            const params = sender.getParameters() || {};
            const encodings = params.encodings && params.encodings.length ? params.encodings : [{}];

            if (track.kind === 'audio') {
                encodings[0].maxBitrate = MAX_AUDIO_BITRATE_BPS;
            }

            if (track.kind === 'video') {
                encodings[0].maxBitrate = MAX_VIDEO_BITRATE_BPS;
                encodings[0].maxFramerate = 24;
            }

            params.encodings = encodings;

            try {
                await sender.setParameters(params);
            } catch (error) {
                // Some browsers reject bitrate hints for specific codecs.
            }
        }
    }, []);

    const restartIceForPeer = useCallback(async (targetUserId, existingPc = null) => {
        const peerId = getStrId(targetUserId);
        if (!peerId) return;

        const pc = existingPc || peerConnectionsRef.current.get(peerId);
        const socket = sock();

        if (!pc || !socket || !currentCallIdRef.current) {
            return;
        }

        try {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            socket.emit('call:offer', {
                callId: currentCallIdRef.current,
                offer: toSessionDescriptionInit(offer),
                targetUserId: peerId
            });
        } catch (error) {
            console.warn('[WebRTC] ICE restart failed:', error);
        }
    }, [sock]);

    const sampleConnectionQuality = useCallback(async (peerId, pc) => {
        if (!pc || typeof pc.getStats !== 'function') return;

        try {
            const stats = await pc.getStats();
            let rttMs = null;
            let jitterMs = null;
            let packetsReceived = 0;
            let packetsLost = 0;

            stats.forEach((report) => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded' && typeof report.currentRoundTripTime === 'number') {
                    rttMs = report.currentRoundTripTime * 1000;
                }

                if (report.type === 'inbound-rtp' && !report.isRemote && report.kind === 'audio') {
                    packetsReceived += report.packetsReceived || 0;
                    packetsLost += report.packetsLost || 0;
                    if (typeof report.jitter === 'number') {
                        const jitterValue = report.jitter * 1000;
                        jitterMs = jitterMs == null ? jitterValue : Math.max(jitterMs, jitterValue);
                    }
                }
            });

            const totalPackets = packetsReceived + packetsLost;
            const lossRatio = totalPackets > 0 ? packetsLost / totalPackets : 0;

            let quality = 'good';
            if ((rttMs != null && rttMs > 450) || lossRatio > 0.08 || (jitterMs != null && jitterMs > 120)) {
                quality = 'poor';
            } else if ((rttMs == null || rttMs < 180) && lossRatio < 0.03 && (jitterMs == null || jitterMs < 35)) {
                quality = 'excellent';
            }

            const snapshot = {
                quality,
                rttMs: rttMs == null ? null : Math.round(rttMs),
                jitterMs: jitterMs == null ? null : Math.round(jitterMs),
                lossPct: Number((lossRatio * 100).toFixed(1))
            };

            setConnectionQuality((prev) => {
                const next = new Map(prev);
                next.set(peerId, snapshot);
                return next;
            });
        } catch (error) {
            // Ignore transient stats failures.
        }
    }, []);

    const clearSpeakerMonitoring = useCallback(async () => {
        if (speakerIntervalRef.current) {
            clearInterval(speakerIntervalRef.current);
            speakerIntervalRef.current = null;
        }

        speakerNodesRef.current.forEach((node) => {
            try {
                node.source?.disconnect();
            } catch (error) {
                // Ignore disconnection errors.
            }
        });
        speakerNodesRef.current.clear();

        const context = speakerAudioContextRef.current;
        if (context && context.state !== 'closed') {
            try {
                await context.close();
            } catch (error) {
                // Ignore context close failures.
            }
        }
        speakerAudioContextRef.current = null;
        setActiveSpeakerId(null);
    }, []);

    const initializeSpeakerMonitoring = useCallback(async () => {
        if (!['initiating', 'ongoing'].includes(callStatusRef.current)) {
            await clearSpeakerMonitoring();
            return;
        }

        const streams = [];
        const localAudioTrack = localStreamRef.current?.getAudioTracks?.()[0];
        if (localAudioTrack && currentUserId) {
            streams.push([String(currentUserId), localStreamRef.current]);
        }

        remoteStreams.forEach((stream, userId) => {
            const hasAudio = Boolean(stream?.getAudioTracks?.().length);
            if (hasAudio) {
                streams.push([String(userId), stream]);
            }
        });

        if (!streams.length) {
            await clearSpeakerMonitoring();
            return;
        }

        if (speakerIntervalRef.current) {
            clearInterval(speakerIntervalRef.current);
            speakerIntervalRef.current = null;
        }

        speakerNodesRef.current.forEach((node) => {
            try {
                node.source?.disconnect();
            } catch (error) {
                // Ignore disconnection errors.
            }
        });
        speakerNodesRef.current.clear();

        const AudioContextCtor =
            typeof window !== 'undefined'
                ? (window.AudioContext || window.webkitAudioContext)
                : null;

        if (!AudioContextCtor) return;

        let audioContext = speakerAudioContextRef.current;
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new AudioContextCtor();
            speakerAudioContextRef.current = audioContext;
        }

        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
            } catch (error) {
                // Browser may still require user gesture; retry on next tick.
            }
        }

        streams.forEach(([speakerId, stream]) => {
            try {
                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.8;
                source.connect(analyser);
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                speakerNodesRef.current.set(speakerId, { source, analyser, dataArray });
            } catch (error) {
                // Ignore stream analyser setup errors for unsupported tracks.
            }
        });

        if (!speakerNodesRef.current.size) {
            setActiveSpeakerId(null);
            return;
        }

        const detectActiveSpeaker = () => {
            let selectedSpeaker = null;
            let highestLevel = 0;

            speakerNodesRef.current.forEach((node, speakerId) => {
                node.analyser.getByteFrequencyData(node.dataArray);
                let energy = 0;
                for (let i = 0; i < node.dataArray.length; i += 1) {
                    energy += node.dataArray[i];
                }
                const averageEnergy = energy / node.dataArray.length;

                if (averageEnergy > ACTIVE_SPEAKER_THRESHOLD && averageEnergy > highestLevel) {
                    highestLevel = averageEnergy;
                    selectedSpeaker = speakerId;
                }
            });

            setActiveSpeakerId((prev) => (prev === selectedSpeaker ? prev : selectedSpeaker));
        };

        detectActiveSpeaker();
        speakerIntervalRef.current = setInterval(detectActiveSpeaker, ACTIVE_SPEAKER_POLL_MS);
    }, [clearSpeakerMonitoring, currentUserId, remoteStreams]);

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
                const hydratedChatMembers = normalizeChatMembers(
                    activeCall?.chatMembers || activeCall?.chatId?.members || []
                );
                setCurrentCall({
                    ...activeCall,
                    chatMembers: hydratedChatMembers
                });
                setParticipants((activeCall.activeParticipants || activeCall.participants || []).filter(p => !p.leftAt));
                setCallStatus('idle');
                callStatusRef.current = 'idle';
                setInvitingUserIds([]);
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
            if (rawLocalStreamRef.current && rawLocalStreamRef.current !== localStreamRef.current) {
                rawLocalStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            await destroyAudioProcessor();

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                const fallbackConstraints = {
                    video: Boolean(constraints?.video),
                    audio: true
                };
                stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            }

            rawLocalStreamRef.current = stream;

            let outboundStream = stream;
            const rawAudioTrack = stream.getAudioTracks()[0];
            const AudioContextCtor =
                typeof window !== 'undefined'
                    ? (window.AudioContext || window.webkitAudioContext)
                    : null;

            if (rawAudioTrack && AudioContextCtor) {
                try {
                    const audioContext = new AudioContextCtor();
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume().catch(() => {});
                    }

                    const source = audioContext.createMediaStreamSource(stream);
                    const gainNode = audioContext.createGain();
                    const compressor = audioContext.createDynamicsCompressor();
                    const destination = audioContext.createMediaStreamDestination();

                    gainNode.gain.value = MIC_GAIN_BOOST;
                    compressor.threshold.value = -24;
                    compressor.knee.value = 20;
                    compressor.ratio.value = 4;
                    compressor.attack.value = 0.003;
                    compressor.release.value = 0.25;

                    source.connect(gainNode);
                    gainNode.connect(compressor);
                    compressor.connect(destination);

                    const processedAudioTrack = destination.stream.getAudioTracks()[0];
                    if (processedAudioTrack) {
                        processedAudioTrack.enabled = rawAudioTrack.enabled;
                        outboundStream = new MediaStream([
                            ...stream.getVideoTracks(),
                            processedAudioTrack
                        ]);

                        audioProcessorRef.current = {
                            context: audioContext,
                            source,
                            gainNode,
                            compressor
                        };
                    } else {
                        await audioContext.close().catch(() => {});
                    }
                } catch (processingError) {
                    console.warn('[WebRTC] Audio processing unavailable:', processingError);
                }
            }

            localStreamRef.current = outboundStream;
            setLocalStream(outboundStream);
            const localVideoTrack = outboundStream.getVideoTracks()[0];
            const localAudioTrack = outboundStream.getAudioTracks()[0];
            setIsVideoEnabled(Boolean(localVideoTrack && localVideoTrack.enabled));
            setIsAudioEnabled(Boolean(localAudioTrack && localAudioTrack.enabled));
            return outboundStream;
        } catch (err) {
            console.error('[WebRTC] Media Error:', err);
            throw new Error('Could not access camera/microphone.');
        }
    }, [destroyAudioProcessor]);

    const startCall = useCallback(async (type = 'video') => {
        const s = sock();
        if (!s) return setCallError("No connection");
        if (!activeChatId) return setCallError("No chat selected");
        try {
            currentCallTypeRef.current = type;
            setCallError(null);
            setCallStatus('initiating');
            callStatusRef.current = 'initiating';
            // UI opens immediately
            setCurrentCall((prev) => ({
                ...(prev || {}),
                chatId: { _id: activeChatId, ...(prev?.chatId || {}) },
                type,
                callerId: currentUserId,
                chatMembers: normalizeChatMembers(prev?.chatMembers || [])
            }));
            setInvitingUserIds([]);
            await initializeLocalStream(getCallMediaConstraints(type));
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
            currentCallTypeRef.current = type;
            setCallError(null);
            setCallStatus('initiating');
            callStatusRef.current = 'initiating';
            await initializeLocalStream(getCallMediaConstraints(type));
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

    const inviteToCall = useCallback((targets) => {
        const s = sock();
        if (!s || !currentCallIdRef.current) return;

        const targetUserIds = (Array.isArray(targets) ? targets : [targets])
            .map((target) => getStrId(target?._id || target?.id || target))
            .filter(Boolean);
        const uniqueTargets = [...new Set(targetUserIds)];

        if (!uniqueTargets.length) return;

        setInvitingUserIds((prev) => [...new Set([...(prev || []), ...uniqueTargets])]);
        s.emit('call:invite', {
            callId: currentCallIdRef.current,
            targetUserIds: uniqueTargets
        });
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
        tuneSenderParameters(pc);

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

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            if (state === 'failed' || state === 'disconnected') {
                const lastAttempt = iceRestartThrottleRef.current.get(uIdStr) || 0;
                if (Date.now() - lastAttempt >= ICE_RESTART_COOLDOWN_MS) {
                    iceRestartThrottleRef.current.set(uIdStr, Date.now());
                    restartIceForPeer(uIdStr, pc);
                }
            }

            if (state === 'closed') {
                setConnectionQuality((prev) => {
                    const next = new Map(prev);
                    next.delete(uIdStr);
                    return next;
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                sampleConnectionQuality(uIdStr, pc);
            }
            if (pc.connectionState === 'failed') {
                restartIceForPeer(uIdStr, pc);
            }
        };

        const bindRemoteTrack = (track, streams = []) => {
            const primaryStream = streams?.[0];

            setRemoteStreams((prev) => {
                const next = new Map(prev);
                const existingStream = next.get(uIdStr);

                if (primaryStream) {
                    if (!existingStream) {
                        next.set(uIdStr, primaryStream);
                        return next;
                    }

                    primaryStream.getTracks().forEach((incomingTrack) => {
                        const alreadyPresent = existingStream
                            .getTracks()
                            .some((existingTrack) => existingTrack.id === incomingTrack.id);
                        if (!alreadyPresent) {
                            try {
                                existingStream.addTrack(incomingTrack);
                            } catch (error) {
                                // Ignore duplicate-track race on some browsers.
                            }
                        }
                    });

                    next.set(uIdStr, existingStream);
                    return next;
                }

                if (track) {
                    const fallbackStream = existingStream || new MediaStream();
                    const alreadyPresent = fallbackStream
                        .getTracks()
                        .some((existingTrack) => existingTrack.id === track.id);

                    if (!alreadyPresent) {
                        fallbackStream.addTrack(track);
                    }

                    next.set(uIdStr, fallbackStream);
                }

                return next;
            });
        };

        pc.ontrack = ({ track, streams }) => {
            bindRemoteTrack(track, streams || []);

            if (track) {
                track.onunmute = () => bindRemoteTrack(track, streams || []);
            }
        };

        peerConnectionsRef.current.set(uIdStr, pc);
        return pc;
    }, [restartIceForPeer, sampleConnectionQuality, sock, tuneSenderParameters]);

    // ── 4. Socket Listeners ──────────────────────────────────────────────
    useEffect(() => {
        const socket = sock();
        if (!socket) return;

        const cleanup = () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                setLocalStream(null);
            }
            if (rawLocalStreamRef.current && rawLocalStreamRef.current !== localStreamRef.current) {
                rawLocalStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            rawLocalStreamRef.current = null;
            destroyAudioProcessor();
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            iceCandidateQueueRef.current.clear();
            iceRestartThrottleRef.current.clear();
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
                statsIntervalRef.current = null;
            }
            clearSpeakerMonitoring();
            setRemoteStreams(new Map());
            setConnectionQuality(new Map());
            setActiveSpeakerId(null);
            setParticipants([]);
            setCurrentCall(null);
            setCallStatus('idle');
            callStatusRef.current = 'idle';
            setIncomingCall(null);
            setInvitingUserIds([]);
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
            setCurrentCall((prev) => ({
                ...(prev || {}),
                ...(data.call || {}),
                callId: getStrId(data.callId || data.call?._id || prev?.callId || prev?._id),
                _id: getStrId(data.callId || data.call?._id || prev?._id || prev?.callId),
                chatMembers: normalizeChatMembers([
                    ...(data.chatMembers || []),
                    ...(data.call?.chatMembers || []),
                    ...(data.call?.chatId?.members || []),
                    ...(prev?.chatMembers || [])
                ])
            }));
            setParticipants((data.call?.participants || []).filter(p => !p.leftAt));
            setIncomingCall(null);
            setCallError(null);
            setInvitingUserIds([]);
            if (data?.call?.type || data?.type) {
                currentCallTypeRef.current = data.call?.type || data.type;
            }

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
            setCurrentCall((prev) => ({
                ...(prev || {}),
                ...(data.call || {}),
                callId: getStrId(data.callId || data.call?._id || prev?.callId || prev?._id),
                _id: getStrId(data.callId || data.call?._id || prev?._id || prev?.callId),
                chatMembers: normalizeChatMembers([
                    ...(data.chatMembers || []),
                    ...(data.call?.chatMembers || []),
                    ...(data.call?.chatId?.members || []),
                    ...(prev?.chatMembers || [])
                ])
            }));
            setParticipants(data.participants || []);
            setCallStatus('ongoing');
            callStatusRef.current = 'ongoing';
            setInvitingUserIds([]);
            if (data?.call?.type || data?.type) {
                currentCallTypeRef.current = data.call?.type || data.type;
            }
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
                const incomingCallId = getStrId(data.callId);
                const mergedMembers = normalizeChatMembers([
                    ...(data.chatMembers || []),
                    ...(data.call?.chatMembers || []),
                    ...(data.call?.chatId?.members || []),
                    ...(prev?.chatMembers || [])
                ]);

                if (prevId && prevId === incomingCallId) {
                    return {
                        ...(prev || {}),
                        chatMembers: mergedMembers
                    };
                }

                return {
                    ...(prev || {}),
                    ...(data.call || {}),
                    _id: incomingCallId,
                    callId: incomingCallId,
                    type: data.type || data.call?.type || prev?.type,
                    callerId: data.callerId || data.call?.callerId || prev?.callerId,
                    chatId: {
                        _id: getStrId(data.chatId),
                        name: data.chatName || data.call?.chatId?.name || prev?.chatId?.name
                    },
                    chatMembers: mergedMembers
                };
            });
            setParticipants([]);
            setCallStatus('idle');
            callStatusRef.current = 'idle';
            setInvitingUserIds([]);
            if (data?.call?.type || data?.type) {
                currentCallTypeRef.current = data.call?.type || data.type;
            }
        };

        const onCallInvited = (data) => {
            const invitedChatId = getStrId(data.chatId || data.call?.chatId);
            if (activeChatId && invitedChatId && invitedChatId !== activeChatId) return;

            currentCallIdRef.current = getStrId(data.callId || data.call?._id);
            setCurrentCall((prev) => ({
                ...(prev || {}),
                ...(data.call || {}),
                _id: getStrId(data.callId || data.call?._id || prev?._id || prev?.callId),
                callId: getStrId(data.callId || data.call?._id || prev?.callId || prev?._id),
                type: data.type || data.call?.type || prev?.type,
                callerId: data.callerId || data.inviterId || data.call?.callerId || prev?.callerId,
                chatId: {
                    _id: invitedChatId || getStrId(prev?.chatId?._id || prev?.chatId),
                    name: data.chatName || data.call?.chatId?.name || prev?.chatId?.name
                },
                chatMembers: normalizeChatMembers([
                    ...(data.chatMembers || []),
                    ...(data.call?.chatMembers || []),
                    ...(data.call?.chatId?.members || []),
                    ...(prev?.chatMembers || [])
                ])
            }));
            setCallError(null);

            if (callStatusRef.current !== 'ongoing' && callStatusRef.current !== 'initiating') {
                setCallStatus('idle');
                callStatusRef.current = 'idle';
            }
            if (data?.call?.type || data?.type) {
                currentCallTypeRef.current = data.call?.type || data.type;
            }
        };

        const onCallInviteSent = (data) => {
            const invitedIds = (data?.invitedUserIds || []).map((id) => getStrId(id)).filter(Boolean);
            if (!invitedIds.length) return;
            setInvitingUserIds((prev) => (prev || []).filter((id) => !invitedIds.includes(String(id))));
        };

        const onOffer = async (data) => {
            currentCallIdRef.current = data.callId;
            const fromId = getStrId(data.fromUserId);
            const pc = createPeerConnection(fromId);
            if (pc.signalingState === 'have-local-offer') {
                try {
                    await pc.setLocalDescription({ type: 'rollback' });
                } catch (error) {
                    // Ignore rollback failures and continue.
                }
            }
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            
            const queue = iceCandidateQueueRef.current.get(fromId) || [];
            for (const candidate of queue) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            iceCandidateQueueRef.current.delete(fromId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            tuneSenderParameters(pc);
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
            iceRestartThrottleRef.current.delete(userId);
            setConnectionQuality((prev) => {
                const next = new Map(prev);
                next.delete(userId);
                return next;
            });
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
            setInvitingUserIds([]);
        };

        socket.on('call:initiated', onCallInitiated);
        socket.on('call:incoming', onIncomingCall);
        socket.on('call:joined', onCallJoined);
        socket.on('call:invited', onCallInvited);
        socket.on('call:invite:sent', onCallInviteSent);
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
            socket.off('call:invited', onCallInvited);
            socket.off('call:invite:sent', onCallInviteSent);
            socket.off('call:participant-joined', onParticipantJoined);
            socket.off('call:offer', onOffer);
            socket.off('call:answer', onAnswer);
            socket.off('call:ice-candidate', onIceCandidate);
            socket.off('call:participant-media-update', onParticipantMediaUpdate);
            socket.off('call:participant-left', onParticipantLeft);
            socket.off('call:ended', onCallEnded);
            socket.off('call:error', onCallError);
        };
    }, [activeChatId, clearSpeakerMonitoring, createPeerConnection, currentUserId, destroyAudioProcessor, sock]);

    // ── Media Toggles (Standard) ─────────────────────────────────────────
    useEffect(() => {
        initializeSpeakerMonitoring();
        return () => {
            clearSpeakerMonitoring();
        };
    }, [callStatus, clearSpeakerMonitoring, initializeSpeakerMonitoring, localStream, remoteStreams]);

    useEffect(() => {
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
        }

        if (!['initiating', 'ongoing'].includes(callStatus)) {
            setConnectionQuality(new Map());
            return;
        }

        const sampleAllConnections = () => {
            peerConnectionsRef.current.forEach((pc, peerId) => {
                sampleConnectionQuality(peerId, pc);
            });
        };

        sampleAllConnections();
        statsIntervalRef.current = setInterval(sampleAllConnections, CONNECTION_STATS_INTERVAL_MS);

        return () => {
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
                statsIntervalRef.current = null;
            }
        };
    }, [callStatus, sampleConnectionQuality]);

    const replaceOutgoingVideoTrack = useCallback(async (track) => {
        const replacePromises = [];

        peerConnectionsRef.current.forEach((pc) => {
            let videoSender = (pc.getSenders?.() || []).find((sender) => sender.track?.kind === 'video');

            if (!videoSender) {
                const videoTransceiver = (pc.getTransceivers?.() || []).find((transceiver) => {
                    const senderTrackKind = transceiver?.sender?.track?.kind;
                    const receiverTrackKind = transceiver?.receiver?.track?.kind;
                    return senderTrackKind === 'video' || receiverTrackKind === 'video';
                });
                videoSender = videoTransceiver?.sender || null;
            }

            if (videoSender && typeof videoSender.replaceTrack === 'function') {
                replacePromises.push(
                    videoSender.replaceTrack(track || null).catch(() => {})
                );
            } else if (track && localStreamRef.current) {
                try {
                    pc.addTrack(track, localStreamRef.current);
                } catch (error) {
                    // Track may already be bound for this connection.
                }
            }

            tuneSenderParameters(pc);
        });

        await Promise.all(replacePromises);
    }, [tuneSenderParameters]);

    const stopScreenShareInternal = useCallback(async ({ emitMediaState = true } = {}) => {
        const socket = sock();
        const fallbackCameraTrack =
            cameraVideoTrackRef.current ||
            rawLocalStreamRef.current?.getVideoTracks?.()[0] ||
            null;
        const currentAudioTrack =
            localStreamRef.current?.getAudioTracks?.()[0] ||
            rawLocalStreamRef.current?.getAudioTracks?.()[0] ||
            null;

        await replaceOutgoingVideoTrack(fallbackCameraTrack);

        const mergedTracks = [];
        if (fallbackCameraTrack) mergedTracks.push(fallbackCameraTrack);
        if (currentAudioTrack) mergedTracks.push(currentAudioTrack);

        const fallbackStream = new MediaStream(mergedTracks);
        localStreamRef.current = fallbackStream;
        setLocalStream(fallbackStream);
        setIsScreenSharing(false);
        setIsVideoEnabled(Boolean(fallbackCameraTrack && fallbackCameraTrack.enabled));

        if (emitMediaState && currentCallIdRef.current && socket) {
            socket.emit('call:media-state', {
                callId: currentCallIdRef.current,
                mediaState: {
                    screenShare: false,
                    video: Boolean(fallbackCameraTrack && fallbackCameraTrack.enabled)
                }
            });
        }

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }

        cameraVideoTrackRef.current = null;
    }, [replaceOutgoingVideoTrack, sock]);

    const toggleAudio = useCallback(() => {
        const outboundTrack = localStreamRef.current?.getAudioTracks()[0];
        const rawTrack = rawLocalStreamRef.current?.getAudioTracks()[0];
        const nextEnabled = !(outboundTrack?.enabled ?? rawTrack?.enabled ?? isAudioEnabled);

        if (outboundTrack) {
            outboundTrack.enabled = nextEnabled;
        }
        if (rawTrack) {
            rawTrack.enabled = nextEnabled;
        }

        if (audioProcessorRef.current?.gainNode) {
            audioProcessorRef.current.gainNode.gain.value = nextEnabled ? MIC_GAIN_BOOST : 0;
            if (nextEnabled && audioProcessorRef.current.context?.state === 'suspended') {
                audioProcessorRef.current.context.resume().catch(() => {});
            }
        }

        setIsAudioEnabled(nextEnabled);
        const s = sock();
        if (currentCallIdRef.current && s) {
            s.emit('call:media-state', { callId: currentCallIdRef.current, mediaState: { audio: nextEnabled } });
        }
    }, [isAudioEnabled, sock]);

    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks?.()[0];
        if (!track) return;

        track.enabled = !track.enabled;
        setIsVideoEnabled(track.enabled);
        const s = sock();
        if (currentCallIdRef.current && s) {
            s.emit('call:media-state', { callId: currentCallIdRef.current, mediaState: { video: track.enabled } });
        }
    }, [sock]);

    const toggleScreenShare = useCallback(async () => {
        try {
            if (isScreenSharing) {
                await stopScreenShareInternal();
                return;
            }

            if (!navigator.mediaDevices?.getDisplayMedia) {
                setCallError('Screen share is not supported in this browser.');
                return;
            }

            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: { ideal: 15, max: 30 },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            const screenTrack = displayStream.getVideoTracks?.()[0];
            if (!screenTrack) {
                setCallError('Unable to access display track.');
                return;
            }

            const socket = sock();
            cameraVideoTrackRef.current =
                localStreamRef.current?.getVideoTracks?.()[0] ||
                rawLocalStreamRef.current?.getVideoTracks?.()[0] ||
                null;
            screenStreamRef.current = displayStream;

            await replaceOutgoingVideoTrack(screenTrack);

            const currentAudioTrack =
                localStreamRef.current?.getAudioTracks?.()[0] ||
                rawLocalStreamRef.current?.getAudioTracks?.()[0] ||
                null;

            const mergedTracks = [screenTrack];
            if (currentAudioTrack) {
                mergedTracks.push(currentAudioTrack);
            }

            const screenShareStream = new MediaStream(mergedTracks);
            localStreamRef.current = screenShareStream;
            setLocalStream(screenShareStream);
            setIsScreenSharing(true);
            setIsVideoEnabled(true);
            setCallError(null);

            if (currentCallIdRef.current && socket) {
                socket.emit('call:media-state', {
                    callId: currentCallIdRef.current,
                    mediaState: {
                        video: true,
                        screenShare: true
                    }
                });
            }

            screenTrack.onended = () => {
                stopScreenShareInternal({ emitMediaState: true });
            };
        } catch (error) {
            console.error('[WebRTC] Screen share error:', error);
            setCallError(error?.message || 'Failed to start screen share.');
        }
    }, [isScreenSharing, replaceOutgoingVideoTrack, sock, stopScreenShareInternal]);

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
        activeSpeakerId,
        callError,
        invitingUserIds,
        startCall,
        joinCall,
        leaveCall,
        endCall,
        inviteToCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare
    };
};

export default useWebRTC;
