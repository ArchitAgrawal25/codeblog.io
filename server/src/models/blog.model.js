const mongoose = require('mongoose');


const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  thumbnail:{
    type: String,
    // required: true,
  },
  category:{
    type: String,
    required: true,
  },
  content:{
    type: String,
    required: true,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  upVoteCount: {
    type: Number,
    default: 0,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
},{
  timestamps: true
})



const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;