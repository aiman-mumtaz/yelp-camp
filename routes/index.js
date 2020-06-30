//require('dotenv').config();

var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Campground = require("../models/campground");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
const { isLoggedIn } = require("../middleware");

// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/account/apikeys
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


//root route
router.get("/", function(req, res){
    res.render("landing");
});

// show register form
router.get("/register", function(req, res){
   res.render("register", { page: "register"}); 
});

//handle sign up logic
router.post("/register", function(req, res){
	var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar
      });
    if(req.body.adminCode === 'aimanisthebest') {
      newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.redirect("/register", {error: err.message});
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Successfully Signed Up! Welcome to YelpCamp " + req.body.firstName + "!");
           res.redirect("/checkout"); 
        });
    });
});

//show login form
router.get("/login", function(req, res){
   res.render("login",{ page: "login"}); 
});

//handling login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login",
		failureFlash: true,
        successFlash: 'Welcome to YelpCamp!'
    }), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
   req.logout();
   req.flash("success", 'See you later!');
   res.redirect("/login");
});


// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour in millisecs

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) { //sends mail
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'aimanmumtaz20@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'aimanmumtaz20@gmail.com',
        subject: 'YelpCamp Account Password Reset',
        text: 'You are receiving this mail because you (or someone else) requested the reset of the password for your YelpCamp account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n' + 
		  'Link valid only for 1 hour.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired. Please try again.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match. Try Again!");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'aimanmumtaz20@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'aimanmumtaz20@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello ' + user.firstName + ',\n\n' +
          'The password for your account ' + user.email + ' has been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Your password has been changed!');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});



// USER PROFILE
router.get("/users/:id", function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if(err) {
      req.flash("error", "Something went wrong.");
      return res.redirect("/");
    }
    Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
      if(err) {
        req.flash("error", "Something went wrong.");
        return res.redirect("/");
      }
      res.render("users/show", {user: foundUser, campgrounds: campgrounds});
    })
  });
});


//CHECKOUT - GET route
router.get('/checkout',isLoggedIn, (req, res) => {
	if(req.user.isPaid){
		req.flash("success","Your account is already paid.");
		return res.redirect("/campgrounds");
	}
	res.render('checkout', { amount: 2000});			
});

//PAY - POST route
router.post('/pay', isLoggedIn, async (req, res) => {
	
	const { paymentMethodId, items, currency } = req.body;

	const amount = 2000;

  	try {
		// Create new PaymentIntent with a PaymentMethod ID from the client.
		const intent = await stripe.paymentIntents.create({
		  amount,
		  currency,
		  payment_method: paymentMethodId,
		  error_on_requires_action: true,
		  confirm: true
		});

		console.log("💰 Payment received!");
		
		req.user.isPaid = true;
		await req.user.save();
		// The payment is complete and the money has been moved
		// You can add any post-payment code here (e.g. shipping, fulfillment, etc)

		// Send the client secret to the client to use in the demo
		res.send({ clientSecret: intent.client_secret });
	  } catch (e) {
		// Handle "hard declines" e.g. insufficient funds, expired card, card authentication etc
		// See https://stripe.com/docs/declines/codes for more
		if (e.code === "authentication_required") {
			res.send({
			error:
			  "This card requires authentication in order to proceeded. Please use a different card."
			});
			
		} else {
		  res.send({ error: e.message });
		}
 	}
});



module.exports = router;