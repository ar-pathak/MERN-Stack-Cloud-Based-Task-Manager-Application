import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Phone,
    Video,
    Mic,
    MicOff,
    VideoOff,
    Monitor,
    MonitorOff,
    Minimize2,
    Maximize2,
    PhoneOff,
    Users,
    UserPlus,
    Check,
    Volume2
} from "lucide-react";

const getId = (value) => String(value?._id || value?.id || value || "");
const SCREEN_SHARE_LABEL_REGEX = /(screen|display|window|monitor|tab)/i;
const detectScreenShareStream = (stream) => {
    const track = stream?.getVideoTracks?.()?.[0];
    if (!track) return false;
    const label = track.label || "";
    return SCREEN_SHARE_LABEL_REGEX.test(label);
};

const attachMediaStream = (element, stream, { muted } = {}) => {
    if (!element || !stream) return;
    if (element.srcObject !== stream) {
        element.srcObject = stream;
    }
    element.autoplay = true;
    element.playsInline = true;
    element.setAttribute("playsinline", "true");
    element.setAttribute("webkit-playsinline", "true");
    element.disablePictureInPicture = true;
    if (typeof muted === "boolean") {
        element.muted = muted;
    }
    element.volume = 1;

    const playPromise = element.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
    }
};

const ControlBtn = ({ icon: Icon, active, onClick, label }) => (
    <button
        onClick={onClick}
        title={label}
        className={`p-3 rounded-full transition-all border ${active
            ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            : "bg-slate-800/50 border-slate-800 text-red-400 hover:bg-slate-800"
            }`}
    >
        <Icon className="h-5 w-5" />
    </button>
);

const CallInterface = ({
    isHost,
    currentCall,
    callStatus,
    localStream,
    remoteStreams,
    participants,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionQuality,
    activeSpeakerId,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onLeaveCall,
    onEndCall,
    onJoinCall,
    onInviteParticipant,
    invitingUserIds = [],
    activeUserId
}) => {
    const [viewMode, setViewMode] = useState("bar");
    const [focusedTileId, setFocusedTileId] = useState(null);
    const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
    const callSurfaceRef = useRef(null);

    useEffect(() => {
        if (callStatus === "initiating" || callStatus === "ongoing") {
            setViewMode("full");
        }
    }, [callStatus]);

    useEffect(() => {
        const retryMediaPlayback = () => {
            if (typeof document === "undefined") return;
            const mediaNodes = document.querySelectorAll("[data-call-remote-media='true']");
            mediaNodes.forEach((node) => {
                if (typeof node.play === "function") {
                    node.play().catch(() => {});
                }
            });
        };

        window.addEventListener("pointerdown", retryMediaPlayback);
        window.addEventListener("keydown", retryMediaPlayback);
        return () => {
            window.removeEventListener("pointerdown", retryMediaPlayback);
            window.removeEventListener("keydown", retryMediaPlayback);
        };
    }, []);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsNativeFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", onFullscreenChange);
        };
    }, []);

    const participantIds = useMemo(() => {
        const ids = new Set();
        (participants || []).forEach((participant) => {
            ids.add(getId(participant?.userId));
        });
        return ids;
    }, [participants]);

    const qualityByParticipant = useMemo(() => {
        if (connectionQuality instanceof Map) return connectionQuality;
        return new Map(Object.entries(connectionQuality || {}));
    }, [connectionQuality]);

    const participantNameById = useMemo(() => {
        const map = new Map();
        (participants || []).forEach((participant) => {
            const id = getId(participant?.userId);
            if (!id) return;
            const profile = participant?.userId || {};
            map.set(id, profile?.name || profile?.username || "User");
        });
        return map;
    }, [participants]);

    const participantById = useMemo(() => {
        const map = new Map();
        (participants || []).forEach((participant) => {
            const id = getId(participant?.userId);
            if (!id) return;
            map.set(id, participant);
        });
        return map;
    }, [participants]);

    const chatMembers = useMemo(() => {
        const source = currentCall?.chatMembers || currentCall?.chatId?.members || [];
        const memberMap = new Map();
        source.forEach((member) => {
            const id = getId(member);
            if (!id) return;
            if (memberMap.has(id)) return;
            memberMap.set(id, {
                _id: id,
                name: member?.name || member?.username || "User",
                username: member?.username || "",
                avatar: member?.avatar || null
            });
        });
        return Array.from(memberMap.values());
    }, [currentCall]);

    const inviteableMembers = useMemo(() => {
        const selfId = getId(activeUserId);
        return chatMembers.filter((member) => {
            const memberId = getId(member._id || member.id || member);
            if (!memberId) return false;
            if (memberId === selfId) return false;
            if (participantIds.has(memberId)) return false;
            return true;
        });
    }, [chatMembers, participantIds, activeUserId]);

    const invitingSet = useMemo(
        () => new Set((invitingUserIds || []).map((id) => String(id))),
        [invitingUserIds]
    );

    const isParticipant = participantIds.has(getId(activeUserId));
    const isGroupCall = (currentCall?.mode === "group") || (chatMembers.length > 2);
    const normalizedActiveSpeakerId = getId(activeSpeakerId);
    const localUserId = getId(activeUserId);
    const isLocalSpeaking = Boolean(normalizedActiveSpeakerId) && normalizedActiveSpeakerId === localUserId;
    const activeSpeakerName = normalizedActiveSpeakerId
        ? (normalizedActiveSpeakerId === localUserId
            ? "You"
            : (participantNameById.get(normalizedActiveSpeakerId) || "User"))
        : null;

    function getQualityPill(participantId) {
        const quality = qualityByParticipant.get(String(participantId))?.quality || "good";
        if (quality === "excellent") {
            return { label: "Excellent", className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" };
        }
        if (quality === "poor") {
            return { label: "Poor", className: "bg-amber-500/20 text-amber-300 border border-amber-500/40" };
        }
        return { label: "Good", className: "bg-sky-500/20 text-sky-300 border border-sky-500/40" };
    }

    const localTileId = useMemo(
        () => `local:${localUserId || "self"}`,
        [localUserId]
    );

    const callTiles = useMemo(() => {
        const remoteTiles = Array.from(remoteStreams || []).map(([uid, stream]) => {
            const participantId = getId(uid);
            const remoteParticipant = participantById.get(participantId);
            const isScreenShare =
                Boolean(remoteParticipant?.mediaState?.screenShare) ||
                detectScreenShareStream(stream);
            return {
                tileId: participantId,
                participantId,
                name: participantNameById.get(String(uid)) || "User",
                stream,
                isLocal: false,
                isScreenShare,
                qualityPill: getQualityPill(uid),
                isSpeaking: getId(uid) === normalizedActiveSpeakerId
            };
        });

        const localTile = localStream
            ? [{
                tileId: localTileId,
                participantId: localUserId || "local",
                name: "You",
                stream: localStream,
                isLocal: true,
                isScreenShare: Boolean(isScreenSharing),
                qualityPill: null,
                isSpeaking: isLocalSpeaking
            }]
            : [];

        return [...localTile, ...remoteTiles];
    }, [
        qualityByParticipant,
        isScreenSharing,
        isLocalSpeaking,
        localStream,
        localTileId,
        localUserId,
        normalizedActiveSpeakerId,
        participantById,
        participantNameById,
        remoteStreams
    ]);

    const focusedTile = useMemo(
        () => callTiles.find((tile) => tile.tileId === focusedTileId) || null,
        [callTiles, focusedTileId]
    );

    useEffect(() => {
        if (!focusedTileId) return;
        const exists = callTiles.some((tile) => tile.tileId === focusedTileId);
        if (!exists) {
            setFocusedTileId(null);
        }
    }, [callTiles, focusedTileId]);

    useEffect(() => {
        if (focusedTileId) return;
        const sharedRemoteTile = callTiles.find((tile) => !tile.isLocal && tile.isScreenShare);
        if (sharedRemoteTile) {
            setFocusedTileId(sharedRemoteTile.tileId);
        }
    }, [callTiles, focusedTileId]);

    const toggleNativeFullscreen = useCallback(async () => {
        const surface = callSurfaceRef.current;
        if (!surface) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await surface.requestFullscreen();
            }
        } catch (error) {
            // Browser may reject fullscreen due to user-gesture restrictions.
        }
    }, []);

    const renderParticipantTile = useCallback((tile, options = {}) => {
        if (!tile?.stream) return null;
        const compact = Boolean(options.compact);
        const isFocused = Boolean(options.focused);
        const canFocus = !isFocused;
        const tileClass = compact
            ? "min-h-[120px] h-32"
            : "min-h-[220px] h-full";
        const mediaClass = tile.isScreenShare
            ? "w-full h-full object-contain bg-slate-950"
            : `w-full h-full object-cover ${tile.isLocal ? "transform scale-x-[-1]" : ""}`;

        return (
            <div
                key={tile.tileId}
                className={`relative bg-slate-900 rounded-2xl overflow-hidden border ${tileClass} ${tile.isSpeaking ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.45)]" : "border-slate-800"}`}
            >
                <video
                    ref={(ref) => attachMediaStream(ref, tile.stream, { muted: tile.isLocal })}
                    autoPlay
                    muted={tile.isLocal}
                    playsInline
                    data-call-remote-media={tile.isLocal ? undefined : "true"}
                    className={mediaClass}
                />

                {tile.isSpeaking && (
                    <div className="absolute top-3 right-3 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <span className="inline-flex items-center gap-1">
                            <Volume2 className="h-3 w-3" />
                            Speaking
                        </span>
                    </div>
                )}

                {tile.qualityPill && (
                    <div className={`absolute ${tile.isScreenShare ? "top-11 left-3" : "top-3 left-3"} rounded-full px-2 py-0.5 text-[10px] font-semibold ${tile.qualityPill.className}`}>
                        {tile.qualityPill.label}
                    </div>
                )}

                {tile.isScreenShare && (
                    <div className="absolute top-3 left-3 rounded-full border border-indigo-500/40 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-200">
                        Screen share
                    </div>
                )}

                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs text-white">
                    {tile.name}
                </div>

                {tile.isLocal && !isAudioEnabled && (
                    <div className="absolute top-3 right-3 bg-red-500/80 p-1.5 rounded-full">
                        <MicOff className="h-3 w-3 text-white" />
                    </div>
                )}

                <button
                    onClick={() => {
                        if (canFocus) {
                            setFocusedTileId(tile.tileId);
                        } else {
                            setFocusedTileId(null);
                        }
                    }}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md border border-slate-600 bg-black/45 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-black/65 transition-colors"
                    title={canFocus ? "Focus this participant" : "Exit focused view"}
                >
                    {canFocus ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                    {canFocus ? "Focus" : "Unfocus"}
                </button>
            </div>
        );
    }, [isAudioEnabled]);

    if (!currentCall) return null;

    if (viewMode === "bar") {
        return (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-slate-900 border-b border-slate-800"
            >
                <div className="px-4 py-2 flex items-center justify-between bg-gradient-to-r from-indigo-900/40 to-slate-900/40">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
                            {currentCall.type === "video"
                                ? <Video className="h-5 w-5 text-indigo-400" />
                                : <Phone className="h-5 w-5 text-indigo-400" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                {currentCall.chatId?.name || "Active call"}
                            </h3>
                            <p className="text-xs text-indigo-300">
                                {participants.length} active • {isParticipant ? "Connected" : "Tap to join"}
                            </p>
                            {activeSpeakerName && (
                                <p className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                    <Volume2 className="h-3 w-3" />
                                    Speaking: {activeSpeakerName}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isParticipant ? (
                            <>
                                <button
                                    onClick={onToggleAudio}
                                    className={`p-2 rounded-full ${!isAudioEnabled
                                        ? "bg-red-500/20 text-red-400"
                                        : "hover:bg-slate-800 text-slate-400"
                                        }`}
                                    title={isAudioEnabled ? "Mute" : "Unmute"}
                                >
                                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={onLeaveCall}
                                    className="p-2 rounded-full hover:bg-red-500/20 text-red-400"
                                    title="Leave call"
                                >
                                    <PhoneOff className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("full")}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    Open
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => {
                                    onJoinCall(currentCall.callId || currentCall._id, currentCall.type);
                                    setViewMode("full");
                                }}
                                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 animate-pulse"
                            >
                                Join
                            </button>
                        )}
                    </div>
                </div>
                <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
                    {Array.from(remoteStreams || []).map(([uid, stream]) => (
                        <audio
                            key={`bar-audio-${uid}`}
                            ref={(ref) => attachMediaStream(ref, stream, { muted: false })}
                            autoPlay
                            playsInline
                            data-call-remote-media="true"
                        />
                    ))}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-50 bg-slate-950 flex flex-col"
            ref={callSurfaceRef}
        >
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">
                        {currentCall.chatId?.name || "Call"}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs border border-green-500/30">
                        {participants.length} participants
                    </span>
                    {activeSpeakerName && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                            <Volume2 className="h-3.5 w-3.5" />
                            {activeSpeakerName} speaking
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleNativeFullscreen}
                        className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        {isNativeFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        <span className="text-sm font-medium">
                            {isNativeFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        </span>
                    </button>
                    <button
                        onClick={() => setViewMode("bar")}
                        className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Minimize2 className="h-5 w-5" />
                        <span className="text-sm font-medium">Minimize</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
                <div className="flex-1 p-4 overflow-y-auto">
                    {focusedTile ? (
                        <div className="h-full flex flex-col gap-3">
                            <div className="flex-1 min-h-[260px]">
                                {renderParticipantTile(focusedTile, { focused: true })}
                            </div>
                            {callTiles.length > 1 && (
                                <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                                    {callTiles
                                        .filter((tile) => tile.tileId !== focusedTile.tileId)
                                        .map((tile) => renderParticipantTile(tile, { compact: true }))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`grid gap-4 h-full ${callTiles.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
                            {callTiles.map((tile) => renderParticipantTile(tile))}

                            {remoteStreams?.size === 0 && (
                                <div className="flex flex-col items-center justify-center text-slate-500">
                                    <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 animate-pulse">
                                        <Users className="h-8 w-8" />
                                    </div>
                                    <p>Waiting for others to join...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!focusedTile && (
                    <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/60 p-3 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                            <UserPlus className="h-4 w-4 text-sky-300" />
                            <h3 className="text-sm font-semibold text-slate-100">Invite To Call</h3>
                        </div>
                        {!isGroupCall ? (
                            <p className="text-xs text-slate-400">Invites are available in group calls.</p>
                        ) : inviteableMembers.length === 0 ? (
                            <p className="text-xs text-slate-400">Everyone is already in call.</p>
                        ) : (
                            <div className="space-y-2">
                                {inviteableMembers.map((member) => {
                                    const memberId = getId(member);
                                    const isInviting = invitingSet.has(memberId);
                                    return (
                                        <div
                                            key={memberId}
                                            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-slate-100 truncate">{member.name}</p>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    {member.username ? `@${member.username}` : "Member"}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => onInviteParticipant?.([memberId])}
                                                disabled={isInviting || !isParticipant}
                                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${(isInviting || !isParticipant)
                                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                                    : "bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30"
                                                    }`}
                                            >
                                                {isInviting ? <Check className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                                                {isInviting ? "Invited" : (isParticipant ? "Invite" : "Join first")}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-900/80 backdrop-blur border-t border-slate-800 flex justify-center gap-3">
                <ControlBtn icon={isAudioEnabled ? Mic : MicOff} active={isAudioEnabled} onClick={onToggleAudio} label="Toggle audio" />
                <ControlBtn icon={isVideoEnabled ? Video : VideoOff} active={isVideoEnabled} onClick={onToggleVideo} label="Toggle video" />
                <ControlBtn icon={isScreenSharing ? Monitor : MonitorOff} active={isScreenSharing} onClick={onToggleScreenShare} label="Toggle screen share" />
                <button
                    onClick={isHost ? onEndCall : onLeaveCall}
                    className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all transform hover:scale-105"
                    title={isHost ? "End call for everyone" : "Leave call"}
                >
                    <PhoneOff className="h-5 w-5" />
                </button>
            </div>
        </motion.div>
    );
};

export default CallInterface;
