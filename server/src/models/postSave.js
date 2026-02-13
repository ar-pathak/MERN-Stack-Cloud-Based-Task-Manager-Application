const mongoose = require("mongoose");
const { Schema } = mongoose;

const postSaveSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        post: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

postSaveSchema.index({ user: 1, post: 1 }, { unique: true });
postSaveSchema.index({ user: 1, createdAt: -1 });

postSaveSchema.statics.checkMultipleSaved = async function (userId, postIds = []) {
    if (!userId || !Array.isArray(postIds) || postIds.length === 0) {
        return {};
    }

    const saves = await this.find({
        user: userId,
        post: { $in: postIds }
    })
        .select("post")
        .lean();

    const map = {};
    postIds.forEach((id) => {
        map[String(id)] = false;
    });

    saves.forEach((entry) => {
        map[String(entry.post)] = true;
    });

    return map;
};

module.exports = mongoose.model("PostSave", postSaveSchema);

