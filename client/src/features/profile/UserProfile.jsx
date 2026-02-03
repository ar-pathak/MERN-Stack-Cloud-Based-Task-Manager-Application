import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Link as LinkIcon, Calendar, MoreHorizontal,
    MessageSquare, Edit3, Grid, Image as ImageIcon, Info, Loader2,
    Share2, Ban, Flag, Copy, Check, ArrowLeft
} from "lucide-react";

// Services
import { getUserById } from "../../service/user.service";
import { getUserPosts } from "../../service/post.service";
import { followUser, unfollowUser } from "../../service/follow.service";
import { useAuth } from "../../context/AuthContext";

const UserProfile = () => {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("posts");

    // Action States
    const [followLoading, setFollowLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch Data
    useEffect(() => {
        const fetchProfileData = async () => {
            setIsLoading(true);
            try {
                const userRes = await getUserById(id);
                const postsRes = await getUserPosts(id);

                // Handle API variations (response.data vs direct data)
                const userData = userRes.user || userRes;
                const postsData = postsRes.posts || postsRes || [];

                setProfile(userData);
                setPosts(postsData);
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchProfileData();
    }, [id]);

    // --- Handlers ---

    const handleFollowAction = async () => {
        if (!profile) return;
        setFollowLoading(true);
        try {
            const isFollowing = profile.relationship?.isFollowing;

            if (isFollowing) {
                await unfollowUser(id);
                setProfile((prev) => ({
                    ...prev,
                    followersCount: Math.max(0, (prev.followersCount || 0) - 1),
                    relationship: { ...prev.relationship, isFollowing: false, isPending: false }
                }));
            } else {
                const res = await followUser(id);
                const isPending = res.isPending;
                setProfile((prev) => ({
                    ...prev,
                    followersCount: isPending ? prev.followersCount : (prev.followersCount || 0) + 1,
                    relationship: { ...prev.relationship, isFollowing: !isPending, isPending: isPending }
                }));
            }
        } catch (error) {
            console.error("Follow action failed", error);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleMessage = () => {
        // Navigate to chat route with this user selected
        navigate(`/chat/${id}`, { state: { targetUser: profile } })
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        setIsMenuOpen(false);
    };

    const handleBlockUser = async () => {
        if (!window.confirm(`Are you sure you want to block ${profile.name}?`)) return;

        try {
            // await blockUser(id);
            // navigate("/feed"); // Redirect to feed after blocking
            // You could also show a toast notification here

            console.log(`you blocked ${profile.name}`)
        } catch (error) {
            console.error("Failed to block user", error);
            alert("Could not block user. Try again later.");
        }
    };

    const isOwnProfile = currentUser?._id === id;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            <button onClick={() => navigate(-1)} className="fixed top-4 left-4 z-50 p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-100 border border-slate-700/50 hover:bg-slate-800 transition-all">
                <ArrowLeft className="h-5 w-5" />
            </button>
            {/* --- Cover Image --- */}
            <div className="relative h-48 md:h-64 w-full bg-slate-900">
                {profile.coverImage ? (
                    <img src={profile.coverImage} alt="Cover" className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full bg-gradient-to-r from-slate-800 to-slate-900" />
                )}
                <button onClick={() => navigate(-1)} className="absolute left-4 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur-md hover:bg-black/60 md:hidden">
                    {/* Simple Back Arrow SVG */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
            </div>

            <div className="mx-auto max-w-4xl px-4 sm:px-6">

                {/* --- Profile Header Info --- */}
                <div className="relative -mt-16 mb-6 flex flex-col items-start sm:flex-row sm:items-end sm:gap-6">

                    {/* Avatar */}
                    <div className="relative">
                        <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-slate-950 bg-slate-800 sm:h-40 sm:w-40">
                            {profile.avatar ? (
                                <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-indigo-500 text-4xl font-bold text-white">
                                    {profile.name?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Name & Actions */}
                    <div className="mt-4 flex-1 w-full sm:mt-0 sm:pb-2">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div>
                                <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                                    {profile.name}
                                    {profile.isVerified && (
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] text-white">✓</span>
                                    )}
                                </h1>
                                <p className="text-sm font-medium text-slate-400">@{profile.username}</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                {isOwnProfile ? (
                                    <button onClick={() => navigate("/settings/profile")} className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors">
                                        <Edit3 className="h-4 w-4" />
                                        Edit Profile
                                    </button>
                                ) : (
                                    <>
                                        {/* Follow Button */}
                                        <button
                                            onClick={handleFollowAction}
                                            disabled={followLoading}
                                            className={`flex min-w-[120px] items-center justify-center gap-2 rounded-xl px-6 py-2 text-sm font-semibold transition-all ${profile.relationship?.isFollowing
                                                ? "bg-slate-800 text-slate-200 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 border border-transparent"
                                                : "bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20"
                                                }`}
                                        >
                                            {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (profile.relationship?.isFollowing ? "Following" : "Follow")}
                                        </button>

                                        {/* Message Button */}
                                        <button
                                            onClick={handleMessage}
                                            className="flex items-center justify-center rounded-xl bg-slate-800 p-2.5 text-slate-200 hover:bg-sky-500/10 hover:text-sky-400 transition-colors"
                                            title="Send Message"
                                        >
                                            <MessageSquare className="h-5 w-5" />
                                        </button>

                                        {/* Menu (Three Dots) Button */}
                                        <div className="relative" ref={menuRef}>
                                            <button
                                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                                className="flex items-center justify-center rounded-xl bg-slate-800 p-2.5 text-slate-200 hover:bg-slate-700 transition-colors"
                                            >
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            <AnimatePresence>
                                                {isMenuOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-800 bg-slate-900 shadow-xl z-50 overflow-hidden"
                                                    >
                                                        <div className="py-1">
                                                            <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                                                                {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                                                {copiedLink ? "Copied!" : "Copy Link"}
                                                            </button>

                                                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                                                                <Share2 className="h-4 w-4" />
                                                                Share Profile
                                                            </button>

                                                            <div className="h-px bg-slate-800 my-1" />

                                                            <button
                                                                onClick={handleBlockUser}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                            >
                                                                <Ban className="h-4 w-4" />
                                                                Block User
                                                            </button>

                                                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                                                                <Flag className="h-4 w-4" />
                                                                Report
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Bio & Metadata --- */}
                <div className="mb-8 space-y-4">
                    {profile.bio && <p className="text-base text-slate-300 max-w-2xl leading-relaxed">{profile.bio}</p>}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                        {profile.location && <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /><span>{profile.location}</span></div>}
                        {profile.website && <div className="flex items-center gap-1.5"><LinkIcon className="h-4 w-4" /><a href={profile.website} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{profile.website.replace(/^https?:\/\//, '')}</a></div>}
                        <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /><span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span></div>
                    </div>
                    <div className="flex items-center gap-6 border-y border-slate-800/50 py-3">
                        {/* Stats Counters (Same as before) */}
                        <div className="flex items-center gap-1.5"><span className="font-bold text-slate-100">{profile.postsCount || posts.length}</span><span className="text-slate-500">Posts</span></div>
                        <div className="flex items-center gap-1.5"><span className="font-bold text-slate-100">{profile.followersCount || 0}</span><span className="text-slate-500">Followers</span></div>
                        <div className="flex items-center gap-1.5"><span className="font-bold text-slate-100">{profile.followingCount || 0}</span><span className="text-slate-500">Following</span></div>
                    </div>
                </div>

                {/* --- Tabs & Content (Same as before) --- */}
                <div className="mb-6 border-b border-slate-800">
                    <div className="flex gap-8">
                        <button onClick={() => setActiveTab("posts")} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === "posts" ? "border-sky-500 text-sky-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}><Grid className="h-4 w-4" />Posts</button>
                        <button onClick={() => setActiveTab("media")} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === "media" ? "border-sky-500 text-sky-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}><ImageIcon className="h-4 w-4" />Media</button>
                        <button onClick={() => setActiveTab("about")} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === "about" ? "border-sky-500 text-sky-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}><Info className="h-4 w-4" />About</button>
                    </div>
                </div>

                {/* --- Tab Content --- */}
                <div className="min-h-[200px]">
                    {activeTab === "posts" && (
                        <div className="space-y-4">
                            {posts.length > 0 ? (
                                posts.map((post) => (
                                    <div key={post._id} onClick={() => navigate(`/post/${post._id}`)} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors cursor-pointer">
                                        <p className="text-sm text-slate-300 mb-2 line-clamp-3">{post.content}</p>
                                        {post.media?.length > 0 && <div className="h-48 w-full rounded-lg bg-slate-800 overflow-hidden"><img src={post.media[0].url} alt="" className="h-full w-full object-cover" /></div>}
                                    </div>
                                ))
                            ) : (<div className="text-center text-slate-500 py-10">No posts yet</div>)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;