import axios from "axios";

// Base URL configuration (adjust if your instance is different)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Create an axios instance with auth header support
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for cookies
});

// Helper to handle errors
const handleError = (error) => {
    const message = error.response?.data?.message || "File upload failed";
    console.error("Upload Service Error:", message);
    throw new Error(message);
};

export const uploadService = {
    /**
     * Upload a single file
     * @param {File} file - The file object from input[type="file"]
     * @param {Function} onProgress - Optional callback (progress) => {}
     * @returns {Promise<{url: string, name: string, type: string, size: number}>}
     */
    uploadFile: async (file, onProgress) => {
        try {
            const formData = new FormData();
            formData.append("file", file); // Must match backend 'upload.single("file")'

            const response = await api.post("api/upload/single", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        onProgress(percentCompleted);
                    }
                },
            });

            return response.data.data; // Returns { url, name, type, size }
        } catch (error) {
            handleError(error);
        }
    },

    /**
     * Upload multiple files
     * @param {FileList | File[]} files - Array or FileList of files
     * @param {Function} onProgress - Optional callback (progress) => {}
     * @returns {Promise<Array<{url: string, name: string, type: string, size: number}>>}
     */
    uploadMultipleFiles: async (files, onProgress) => {
        try {
            const formData = new FormData();
            // Append each file with the key 'files'
            Array.from(files).forEach((file) => {
                formData.append("files", file);
            });

            const response = await api.post("/api/upload/multiple", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        onProgress(percentCompleted);
                    }
                },
            });

            return response.data.data; // Returns Array of file objects
        } catch (error) {
            handleError(error);
        }
    }
};