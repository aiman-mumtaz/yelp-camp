var mongoose = require("mongoose");

var campgroundSchema = new mongoose.Schema({
   	name: String,
	price: String,
   	image: String,
   	description: String,
	createdAt: { type: Date, default: Date.now},
   	author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User"
      },
      username: String
   	},
	likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
   comments: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Comment"
      }
   ]
});

module.exports = mongoose.model("Campground", campgroundSchema);