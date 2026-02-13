import api from "../config/axios";

const BASE_URL = "/api/stories";

export const getStoryFeed = async () => {
    try {
        const response = await api.get(`${BASE_URL}/feed`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load stories",
            status: error.response?.status
        };
    }
};

export const getUserStories = async (userId) => {
    try {
        const response = await api.get(`${BASE_URL}/user/${userId}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load user stories",
            status: error.response?.status
        };
    }
};

export const getStoryById = async (storyId) => {
    try {
        const response = await api.get(`${BASE_URL}/${storyId}`);
        return response.data?.data?.story || response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to load story details",
            status: error.response?.status
        };
    }
};

export const createStory = async (storyData) => {
    try {
        const response = await api.post(`${BASE_URL}`, storyData);
        return response.data?.data?.story || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to create story",
            status: error.response?.status
        };
    }
};

export const markStoryViewed = async (storyId) => {
    try {
        const response = await api.post(`${BASE_URL}/${storyId}/view`);
        return response.data?.data?.story || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to mark story as viewed",
            status: error.response?.status
        };
    }
};

export const reactToStory = async (storyId, emoji) => {
    try {
        const response = await api.post(`${BASE_URL}/${storyId}/react`, { emoji });
        return response.data?.data?.story || response.data?.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to react to story",
            status: error.response?.status
        };
    }
};

export const deleteStory = async (storyId) => {
    try {
        const response = await api.delete(`${BASE_URL}/${storyId}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete story",
            status: error.response?.status
        };
    }
};
