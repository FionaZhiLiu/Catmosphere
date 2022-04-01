require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-Fiona:" + process.env.MONGODB_PW + "@cluster0.i4dfa.mongodb.net/blogDB", {
  useNewUrlParser: true
});


const postSchema = {
  title: String,
  content: String
};

const Post = mongoose.model("Post", postSchema);

const listSchema = {
  name: String,
  posts: [postSchema]
};

const List = mongoose.model("List", listSchema);


const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://radiant-fjord-20031.herokuapp.com/auth/google/compose",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);

    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));


const post1 = new Post({
  title: "User guide",
  content: "Our blog section has four categories: local event, cat food and cat health. Please go to compose page to write your blog."
});

const defaultPosts = [post1];

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/blog", function(req, res) {
  res.sendFile(__dirname + "/blog.html");
});

app.get("/auth/google",
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  })
);

app.get("/auth/google/compose",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/compose");
  });


app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/blog");
});

app.get("/compose", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});

app.get("/event", function(req, res) {
  List.findOne({
    name: "event"
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        const list = new List({
          name: "event",
          posts: defaultPosts
        });
        list.save();
        res.redirect("/event");
      } else {
        res.render("event", {
          eventPosts: foundList.posts
        });
      }
    };
  });
});



app.get("/food", function(req, res) {
  List.findOne({
    name: "food"
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        const list = new List({
          name: "food",
          posts: defaultPosts
        });
        list.save();
        res.redirect("/food");
      } else {
        res.render("food", {
          foodPosts: foundList.posts
        });
      }
    }
  });
});

app.get("/health", function(req, res) {
  List.findOne({
    name: "health"
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        const list = new List({
          name: "health",
          posts: defaultPosts
        });
        list.save();
        res.redirect("/health");
      } else {
        res.render("health", {
          healthPosts: foundList.posts
        });
      }
    }
  });
});


app.get("/error", function(req, res) {
  res.render("error");
});

app.post("/compose", function(req, res) {
  const category = _.lowerCase(req.body.postCategory);
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody,
  });
  if (category === "food") {
    List.findOne({
      name: category
    }, function(err, foundList) {
      if (!err) {
        if (!foundList) {
          const list = new List({
            name: "food",
            posts: [post]
          });
          list.save();
        } else {
          foundList.posts.push(post);
          foundList.save();
        }
        res.redirect("/food");
      }
    });
  } else if (category === "health") {
    List.findOne({
      name: category
    }, function(err, foundList) {
      if (!err) {
        if (!foundList) {
          const list = new List({
            name: "health",
            posts: [post]
          });
          list.save();
        } else {
          foundList.posts.push(post);
          foundList.save();
        }
        res.redirect("/health");
      }
    });
  } else if (category === "event") {
    List.findOne({
      name: category
    }, function(err, foundList) {
      if (!err) {
        if (!foundList) {
          const list = new List({
            name: "event",
            posts: [post]
          });
          list.save();
        } else {
          foundList.posts.push(post);
          foundList.save();
        }
        res.redirect("/event");
      }
    });
  } else {
    res.redirect("/error")
  }

});

app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.render("compose");
      });
    }
  });

});

app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.render("compose");
      });
    }
  });

});


app.get("/posts/:postCategory/:postName", function(req, res) {
      const requestedTitle = _.lowerCase(req.params.postName);
      const requestedCategoty = _.lowerCase(req.params.postCategory);
      List.findOne({
          name: requestedCategoty
        }, function(err, foundList) {
          if (!err) {
            foundList.posts.forEach(function(post) {
              const storedTitle = _.lowerCase(post.title);

              if (storedTitle === requestedTitle) {
                res.render("post", {
                  title: post.title,
                  content: post.content
                });
              }
            });
          }
        });
      });


    app.listen(3000 || process.env.PORT, function() {
      console.log("Server started on port 3000");
    });
