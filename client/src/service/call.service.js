
import axios from 'axios'; // Assuming axios is used for API calls
import { io } from 'socket.io-client';

const API_URL = '/api/calls';

class CallService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    /**
     * Initialize socket connection for calling
     * @param {string} token - Auth token
     */
    initSocket(token) {
        if (this.socket) return;

        this.socket = io({
            auth: { token },
            transports: ['websocket']
        });

        this._setupSocketListeners();
    }

    // ========================================================================
    // REST API METHODS (History & Stats)
    // ========================================================================

    async getHistory(params = {}) {
        const response = await axios.get(`${API_URL}/history`, { params });
        return response.data;
    }

    async getActiveCall() {
        const response = await axios.get(`${API_URL}/active`);
        return response.data;
    }

    async getStats(period = 30) {
        const response = await axios.get(`${API_URL}/stats/overview`, { params: { period } });
        return response.data;
    }

    async submitFeedback(callId, feedback) {
        const response = await axios.post(`${API_URL}/${callId}/feedback`, feedback);
        return response.data;
    }

    // ========================================================================
    // REAL-TIME SOCKET ACTIONS
    // ========================================================================

    /**
     * Start a new call in a specific chat
     */
    startCall(chatId, type = 'video') {
        this.socket.emit('call:start', { chatId, type });
    }

    /**
     * Join an existing call
     */
    joinCall(callId, mediaState = { video: true, audio: true }) {
        this.socket.emit('call:join', { callId, mediaState });
    }

    /**
     * WebRTC Signaling: Send Offer
     */
    sendOffer(callId, offer, targetUserId) {
        this.socket.emit('call:offer', { callId, offer, targetUserId });
    }

    /**
     * WebRTC Signaling: Send Answer
     */
    sendAnswer(callId, answer, targetUserId) {
        this.socket.emit('call:answer', { callId, answer, targetUserId });
    }

    /**
     * WebRTC Signaling: Send ICE Candidate
     */
    sendIceCandidate(callId, candidate, targetUserId) {
        this.socket.emit('call:ice-candidate', { callId, candidate, targetUserId });
    }

    /**
     * Update local media state (Mute/Camera Off)
     */
    updateMediaState(callId, mediaState) {
        this.socket.emit('call:media-state', { callId, mediaState });
    }

    /**
     * Leave the call
     */
    leaveCall(callId) {
        this.socket.emit('call:leave', { callId });
    }

    /**
     * End call for everyone (Host only)
     */
    endCall(callId) {
        this.socket.emit('call:end', { callId });
    }

    // ========================================================================
    // INTERNAL EVENT HANDLING
    // ========================================================================

    _setupSocketListeners() {
        // Core Events
        this.socket.on('call:incoming', (data) => this._emit('onIncomingCall', data));
        this.socket.on('call:joined', (data) => this._emit('onJoined', data));
        this.socket.on('call:ended', (data) => this._emit('onCallEnded', data));
        this.socket.on('call:error', (data) => this._emit('onError', data));

        // Signaling Events
        this.socket.on('call:offer', (data) => this._emit('onOfferReceived', data));
        this.socket.on('call:answer', (data) => this._emit('onAnswerReceived', data));
        this.socket.on('call:ice-candidate', (data) => this._emit('onIceCandidateReceived', data));

        // Participant Events
        this.socket.on('call:participant-joined', (data) => this._emit('onParticipantJoined', data));
        this.socket.on('call:participant-left', (data) => this._emit('onParticipantLeft', data));
        this.socket.on('call:participant-media-update', (data) => this._emit('onMediaUpdate', data));
    }

    /**
     * Simple event emitter pattern for UI components
     */
    on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
    }

    _emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }
}

export default new CallService();