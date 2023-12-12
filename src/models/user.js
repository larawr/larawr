const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    accountID: {
        type: Number,
        required: true,
    },
    displayname: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post',
        },
    ],
    comments: [
        {
            postID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Post',
            },
            comment_num: Number,
        },
    ],
});

const User = mongoose.model('User', userSchema);

module.exports = User;
