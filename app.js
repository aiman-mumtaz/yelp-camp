require('dotenv').config();

var express = require("express"),
	app = express(),
	bodyParser = require("body-parser"),
	mongoose = require("mongoose"),
	flash = require("connect-flash"),
	passport = require("passport"),
	localStrategy = require("passport-local"),
	methodOverride = require("method-override"),
	Campground = require("./models/campground"),
	Comment = require("./models/comment"),
	User = require("./models/user"),
	seedDB = require("./seeds");



//requiring routes
var commentRoutes = require("./routes/comments"),
	campgroundRoutes = require("./routes/campgrounds"),
 	indexRoutes = require("./routes/index");

mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

// var url = process.env.DATABASEURL || "mongodb://localhost/yelp_camp";
// mongoose.connect(url);

mongoose.connect('mongodb+srv://aiman-mumtaz:Alohomora21@cluster0.ctl6o.mongodb.net/yelp_camp?retryWrites=true&w=majority');

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

//seedDB(); //seed the database 
app.locals.moment = require('moment');

//PASSPORT CONFIGURATION
app.use(require("express-session")({
	secret: "Aiman is the best",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser= req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

    

app.listen(3000,function(){
	console.log("The YelpCamp server has started!");
});

