export const getMessagePreviewText = (message) => {
    if (!message) return "";

    const content = String(message?.content || "").trim();
    if (content) return content;

    if (message?.type === "post" || message?.sharedPost) return "Shared a post";
    if (message?.type === "image") return "Sent an image";
    if (message?.type === "video") return "Sent a video";
    if (message?.type === "audio") return "Sent an audio message";
    if (message?.type === "file") return "Sent an attachment";
    return "Sent a message";
};
