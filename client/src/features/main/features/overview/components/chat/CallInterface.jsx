import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Phone, Video, Mic, MicOff, VideoOff,
    Monitor, MonitorOff, Maximize2, Minimize2,
    PhoneOff, Users
} from "lucide-react";

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
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onLeaveCall,
    onEndCall,
    onJoinCall,
    activeUserId
}) => {
    // Modes: 'bar' (minimized) | 'full' (overlay)
    const [viewMode, setViewMode] = useState('bar');

    // Auto-maximize if I am initiating, minimize if I'm just joining
    useEffect(() => {
        if (callStatus === 'initiating') {
            setViewMode('full');
        }
    }, [callStatus]);

    // Check if I am actually IN the call
    const isParticipant = participants.some(p => String(p.userId?._id || p.userId) === String(activeUserId));

    if (!currentCall) return null;

    // ── MINIMIZED BAR VIEW ───────────────────────────────────────────────
    if (viewMode === 'bar') {
        return (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-slate-900 border-b border-slate-800"
            >
                <div className="px-4 py-2 flex items-center justify-between bg-gradient-to-r from-indigo-900/40 to-slate-900/40">
                    {/* Left: Info */}
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
                            {currentCall.type === 'video'
                                ? <Video className="h-5 w-5 text-indigo-400" />
                                : <Phone className="h-5 w-5 text-indigo-400" />
                            }
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                {currentCall.chatId?.name || "Call Started"}
                            </h3>
                            <p className="text-xs text-indigo-300">
                                {participants.length} active • {isParticipant ? "Connected" : "Tap to join"}
                            </p>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {isParticipant ? (
                            <>
                                <button onClick={onToggleAudio} className={`p-2 rounded-full ${!isAudioEnabled ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-800 text-slate-400'}`}>
                                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                                </button>
                                <button onClick={onLeaveCall} className="p-2 rounded-full hover:bg-red-500/20 text-red-400">
                                    <PhoneOff className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('full')}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    Open
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => {
                                    onJoinCall(currentCall.callId || currentCall._id, currentCall.type);
                                    setViewMode('full');
                                }}
                                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-500/20 animate-pulse"
                            >
                                Join
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    }

    // ── FULL SCREEN VIEW ────────────────────────────────────────────────
    // Absolute positioned over the chat messages area
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-50 bg-slate-950 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-white">
                        {currentCall.chatId?.name || "Call"}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs border border-green-500/30">
                        {participants.length} participants
                    </span>
                </div>
                <button
                    onClick={() => setViewMode('bar')}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                >
                    <Minimize2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Minimize</span>
                </button>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className={`grid gap-4 h-full ${participants.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>

                    {/* My Stream */}
                    <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                        <video
                            ref={ref => ref && localStream && (ref.srcObject = localStream)}
                            autoPlay muted playsInline
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs text-white">You</div>
                        {!isAudioEnabled && (
                            <div className="absolute top-3 right-3 bg-red-500/80 p-1.5 rounded-full">
                                <MicOff className="h-3 w-3 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Remote Streams */}
                    {Array.from(remoteStreams).map(([uid, stream]) => (
                        <div key={uid} className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                            <video
                                ref={ref => ref && stream && (ref.srcObject = stream)}
                                autoPlay playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs text-white">User</div>
                        </div>
                    ))}

                    {/* Waiting State (If initiating and no one else is here) */}
                    {remoteStreams.size === 0 && (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 animate-pulse">
                                <Users className="h-8 w-8" />
                            </div>
                            <p>Waiting for others to join...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-6 bg-slate-900/80 backdrop-blur border-t border-slate-800 flex justify-center gap-4">
                <ControlBtn icon={isAudioEnabled ? Mic : MicOff} active={isAudioEnabled} onClick={onToggleAudio} />
                <ControlBtn icon={isVideoEnabled ? Video : VideoOff} active={isVideoEnabled} onClick={onToggleVideo} />
                <ControlBtn icon={isScreenSharing ? Monitor : MonitorOff} active={isScreenSharing} onClick={onToggleScreenShare} />

                <button
                    onClick={isHost ? onEndCall : onLeaveCall}
                    className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all transform hover:scale-105"
                >
                    <PhoneOff className="h-6 w-6" />
                </button>
            </div>
        </motion.div>
    );
};

const ControlBtn = ({ icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`p-4 rounded-full transition-all border ${active
            ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            : 'bg-slate-800/50 border-slate-800 text-red-400 hover:bg-slate-800'
            }`}
    >
        <Icon className="h-6 w-6" />
    </button>
);

export default CallInterface;