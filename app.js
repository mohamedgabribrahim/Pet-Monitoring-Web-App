var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var   mongoose 				= require('mongoose'),
	  nodemon				= require('nodemon'),
	  passport 				= require('passport'),
	  bodyParser 			= require('body-parser'),
	  LocalStrategy 		= require('passport-local'),
	  passportLocalMongoose = require('passport-local-mongoose'),
	  User					= require('./models/user');


mongoose.connect(process.env.DATABASEURL);

const port = process.env.PORT || 3000;
app.use(express.static('views'));

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(require('express-session')({
	secret: 'Mary had a little lamb',
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ROUTES
app.get('/', function(req, res){
	res.render('home');
})

app.get('/secret', isLoggedIn, function(req, res){
	res.render('secret');
})

// AUTH ROUTES
// displays sign up form
app.get('/register', function(req, res){
	res.render('register');
})

// handles user sign up
app.post('/register', function(req, res){
	req.body.username
	req.body.password
	User.register(new User({ 
		username: req.body.username
	}), req.body.password, function(err, user){
		if(err){
			req.flash("error", "username already exists!");
			return res.render('register');
		}
		passport.authenticate('local')(req, res, function(){
			res.redirect('/secret');
		});
	});
});

// LOGIN ROUTES
app.get('/login', function(req, res){
	res.render('login');
});

// login logic
app.post('/login', passport.authenticate('local', {
	successRedirect: '/secret',
	failureRedirect: '/login'
}), function(req, res){

});

// LOGOUT ROUTE
app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

// check if user is logged in and has access to secret page
// passed as middleware to secret route
function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "Please login first!");
	res.redirect('/login');
}

// signaling
io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('create or join', function (room) {
       console.log('create or join to room ', room);
        
        var myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        var numClients = myRoom.length;

        console.log(room, ' has ', numClients, ' clients');

        if (numClients == 0) {
            socket.join(room);
            socket.emit('created', room);
        } else if (numClients == 1) {
            socket.join(room);
            socket.emit('joined', room);
        } else {
            socket.emit('full', room);
        }
    });

    socket.on('ready', function (room){
        socket.broadcast.to(room).emit('ready');
    });

    socket.on('candidate', function (event){
        socket.broadcast.to(event.room).emit('candidate', event);
    });

    socket.on('offer', function(event){
        socket.broadcast.to(event.room).emit('offer',event.sdp);
    });

    socket.on('answer', function(event){
        socket.broadcast.to(event.room).emit('answer',event.sdp);
    });

});

http.listen(port || 3000, function () {
    console.log('listening on', port);
});

