const mongoose = require('mongoose');
const Post = require('../../models/post');
const Like = require('../../models/like');
const Comment = require('../../models/comment');
const Follow = require('../../models/follow');
const User = require('../../models/user');

class PostService {

    /**
     * Create a new post
     * @param {ObjectId} userId - Author user ID
     * @param {Object} postData - Post data
     * @returns {Promise<Object>} Created post
     */
    async createPost(userId, postData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Validate user exists and is active
            const user = await User.findById(userId)
                .select('accountStatus')
                .session(session);

            if (!user || user.accountStatus !== 'active') {
                throw new Error('User not found or inactive');
            }

            // Process mentions - validate users exist
            if (postData.mentions && postData.mentions.length > 0) {
                const mentionedUsers = await User.find({
                    _id: { $in: postData.mentions },
                    accountStatus: 'active'
                }).select('_id').session(session);

                postData.mentions = mentionedUsers.map(u => u._id);
            }

            // Create post
            const [post] = await Post.create([{
                ...postData,
                author: userId
            }], { session });

            await session.commitTransaction();

            // Populate author info
            await post.populate('author', 'username name avatar isVerified');

            // TODO: Trigger notifications for mentions
            // TODO: Process media uploads if needed

            return post.toPublicJSON();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get a single post by ID
     * @param {ObjectId} postId - Post ID
     * @param {ObjectId} currentUserId - Current user ID (optional)
     * @returns {Promise<Object>} Post with engagement data
     */
    async getPostById(postId, currentUserId = null) {
        const post = await Post.findById(postId)
            .populate('author', 'username name avatar isVerified followersCount')
            .populate('originalPost')
            .lean();

        if (!post) {
            throw new Error('Post not found');
        }

        // Check visibility permissions
        const canView = post.author._id.toString() === currentUserId?.toString() ||
            post.visibility === 'public' ||
            post.visibility === 'unlisted';

        if (!canView && post.visibility === 'followers' && currentUserId) {
            // Check if current user follows the author
            const isFollowing = await Follow.exists({
                follower: currentUserId,
                following: post.author._id,
                status: 'active',
                isApproved: true
            });

            if (!isFollowing) {
                throw new Error('You do not have permission to view this post');
            }
        } else if (!canView) {
            throw new Error('You do not have permission to view this post');
        }

        // Add user engagement data if logged in
        if (currentUserId) {
            const [hasLiked, isFollowingAuthor] = await Promise.all([
                Like.checkUserLiked(currentUserId, postId),
                currentUserId.toString() !== post.author._id.toString()
                    ? Follow.checkRelationship(currentUserId, post.author._id)
                    : { isFollowing: false }
            ]);

            post.userEngagement = {
                hasLiked,
                isFollowingAuthor: isFollowingAuthor.isFollowing
            };
        }

        // Increment view count (async, don't wait)
        Post.findByIdAndUpdate(postId, { $inc: { viewsCount: 1 } }).exec();

        return post;
    }

    /**
     * Update a post
     * @param {ObjectId} postId - Post ID
     * @param {ObjectId} userId - User ID (must be author)
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated post
     */
    async updatePost(postId, userId, updateData) {
        const post = await Post.findById(postId);

        if (!post) {
            throw new Error('Post not found');
        }

        if (post.author.toString() !== userId.toString()) {
            throw new Error('You do not have permission to edit this post');
        }

        if (post.status !== 'active') {
            throw new Error('Cannot edit a deleted or hidden post');
        }

        // Only allow updating certain fields
        const allowedUpdates = ['content', 'media', 'visibility', 'settings'];
        const updates = {};

        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = updateData[key];
            }
        });

        // Update the post
        Object.assign(post, updates);
        await post.save();

        await post.populate('author', 'username name avatar isVerified');
        return post.toPublicJSON();
    }

    /**
     * Delete a post
     * @param {ObjectId} postId - Post ID
     * @param {ObjectId} userId - User ID (must be author)
     * @returns {Promise<Object>} Result
     */
    async deletePost(postId, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const post = await Post.findById(postId).session(session);

            if (!post) {
                throw new Error('Post not found');
            }

            if (post.author.toString() !== userId.toString()) {
                throw new Error('You do not have permission to delete this post');
            }

            // Soft delete by updating status
            post.status = 'deleted';
            await post.save({ session });

            // Or hard delete (uncomment if preferred)
            // await Post.findByIdAndDelete(postId).session(session);

            await session.commitTransaction();
            return { success: true, message: 'Post deleted successfully' };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get user's feed (posts from followed users)
     * @param {ObjectId} userId - Current user ID
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @returns {Promise<Object>} Feed with posts
     */
    async getUserFeed(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        // Get list of users that current user follows
        const following = await Follow.find({
            follower: userId,
            status: 'active',
            isApproved: true
        }).distinct('following');

        // Include own posts
        following.push(userId);

        // Build query
        const query = {
            author: { $in: following },
            status: 'active',
            visibility: { $in: ['public', 'followers'] }
        };

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .populate({
                    path: 'originalPost',
                    populate: { path: 'author', select: 'username name avatar isVerified' }
                })
                .lean(),
            Post.countDocuments(query)
        ]);

        // Add engagement data
        const postsWithEngagement = await this.addUserEngagementData(posts, userId);

        return {
            posts: postsWithEngagement,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get public/explore feed
     * @param {ObjectId} currentUserId - Current user ID (optional)
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @returns {Promise<Object>} Public feed
     */
    async getPublicFeed(currentUserId = null, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const query = {
            status: 'active',
            visibility: 'public'
        };

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .lean(),
            Post.countDocuments(query)
        ]);

        // Add engagement data if user is logged in
        const postsWithData = currentUserId
            ? await this.addUserEngagementData(posts, currentUserId)
            : posts;

        return {
            posts: postsWithData,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get user's posts
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} currentUserId - Current user ID (optional)
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @returns {Promise<Object>} User's posts
     */
    async getUserPosts(userId, currentUserId = null, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        // Check if profile is private and if current user can view
        const user = await User.findById(userId).select('isPrivate');

        if (!user) {
            throw new Error('User not found');
        }

        // Build query based on permissions
        let query = {
            author: userId,
            status: 'active'
        };

        // If viewing own profile, show all posts
        if (currentUserId && currentUserId.toString() === userId.toString()) {
            // Show all posts including private
        }
        // If profile is private, check follow status
        else if (user.isPrivate) {
            if (!currentUserId) {
                throw new Error('This profile is private');
            }

            const isFollowing = await Follow.exists({
                follower: currentUserId,
                following: userId,
                status: 'active',
                isApproved: true
            });

            if (!isFollowing) {
                throw new Error('This profile is private');
            }

            query.visibility = { $in: ['public', 'followers'] };
        }
        // Public profile
        else {
            query.visibility = 'public';
        }

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ isPinned: -1, createdAt: -1 }) // Pinned posts first
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .lean(),
            Post.countDocuments(query)
        ]);

        const postsWithData = currentUserId
            ? await this.addUserEngagementData(posts, currentUserId)
            : posts;

        return {
            posts: postsWithData,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get trending/popular posts
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @param {String} timeframe - 'day', 'week', 'month'
     * @returns {Promise<Object>} Trending posts
     */
    async getTrendingPosts(page = 1, limit = 20, timeframe = 'day') {
        const skip = (page - 1) * limit;

        // Calculate time range
        const timeRanges = {
            day: 24,
            week: 24 * 7,
            month: 24 * 30
        };

        const hours = timeRanges[timeframe] || 24;
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const query = {
            status: 'active',
            visibility: 'public',
            createdAt: { $gte: since }
        };

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({
                    likesCount: -1,
                    commentsCount: -1,
                    viewsCount: -1,
                    createdAt: -1
                })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .lean(),
            Post.countDocuments(query)
        ]);

        return {
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Search posts
     * @param {String} query - Search query
     * @param {Number} page - Page number
     * @param {Number} limit - Results per page
     * @returns {Promise<Object>} Search results
     */
    async searchPosts(query, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const searchQuery = {
            status: 'active',
            visibility: 'public',
            $text: { $search: query }
        };

        const [posts, total] = await Promise.all([
            Post.find(searchQuery)
                .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .lean(),
            Post.countDocuments(searchQuery)
        ]);

        return {
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Get posts by hashtag
     * @param {String} hashtag - Hashtag (without #)
     * @param {Number} page - Page number
     * @param {Number} limit - Posts per page
     * @returns {Promise<Object>} Posts with hashtag
     */
    async getPostsByHashtag(hashtag, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const query = {
            status: 'active',
            visibility: 'public',
            hashtags: hashtag.toLowerCase()
        };

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'username name avatar isVerified')
                .lean(),
            Post.countDocuments(query)
        ]);

        return {
            hashtag: `#${hashtag}`,
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        };
    }

    /**
     * Add user engagement data to posts
     * @param {Array} posts - Array of posts
     * @param {ObjectId} userId - Current user ID
     * @returns {Promise<Array>} Posts with engagement data
     */
    async addUserEngagementData(posts, userId) {
        if (!posts.length || !userId) return posts;

        const postIds = posts.map(p => p._id);

        // Check which posts user has liked
        const likedMap = await Like.checkMultipleLikes(userId, postIds);

        // Check which authors user is following
        const authorIds = [...new Set(posts.map(p => p.author._id))];
        const followingMap = await Follow.checkMultipleRelationships(userId, authorIds);

        return posts.map(post => ({
            ...post,
            userEngagement: {
                hasLiked: likedMap[post._id.toString()],
                isFollowingAuthor: followingMap[post.author._id.toString()]
            }
        }));
    }
}

module.exports = new PostService();