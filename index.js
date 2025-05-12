const { isAuthenticated, isAdmin } = require("./utils");


require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const saltRounds = 12;

const port = process.env.PORT || 3000;
const app = express();
app.set("view engine", "ejs");


const expireTime = 1 * 60 * 60 * 1000; // 1 hour

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = include("databaseConnection");
const userCollection = database.db(mongodb_database).collection("users");

app.use(express.urlencoded({ extended: false }));

const mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: { secret: mongodb_session_secret },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
    cookie: { maxAge: expireTime },
  })
);

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.render("index", {
    authenticated: req.session.authenticated,
    name: req.session.name,
    user_type: req.session.user_type,
  });
});


app.get("/signup", (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render("signup", {
    authenticated: req.session.authenticated,
    user_type: req.session.user_type,
    error,
  });
});



app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    req.session.error = "All fields are required.";
    return res.redirect("/signup");
  }
  

  const schema = Joi.object({
    name: Joi.string().max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().max(30).required(),
  });

  const { error } = schema.validate({ name, email, password });
  if (error) {
    req.session.error = "Validation failed. Please check your input.";
    return res.redirect("/signup");
  }
  

  const hashed = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({
    name,
    email,
    password: hashed,
    user_type: "user"  // new default role
  });
  
  req.session.authenticated = true;
  req.session.name = name;
  req.session.email = email;
  res.redirect("/members");
});

app.get("/login", (req, res) => {
  const error = req.session.error;
  req.session.error = null;
  res.render("login", {
    authenticated: req.session.authenticated,
    user_type: req.session.user_type,
    error,
  });
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate({ email, password });
  if (error) {
    req.session.error = "Invalid input.";
    return res.redirect("/login");
  }
  
  const user = await userCollection.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    req.session.error = "Invalid email or password.";
    return res.redirect("/login");
  }
  

  req.session.authenticated = true;
  req.session.name = user.name;
  req.session.email = email;
  req.session.user_type = user.user_type;
  res.redirect("/members");
});

app.get("/members", (req, res) => {
  if (!req.session.authenticated) return res.redirect("/");

  const images = ["cat1.jpg", "cat2.jpg", "cat3.jpg"];
  res.render("members", {
    authenticated: req.session.authenticated,
    name: req.session.name,
    user_type: req.session.user_type,
    images,
  });
});


app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});







// Admin dashboard to view all users
app.get("/admin", isAuthenticated, isAdmin, async (req, res) => {
  const users = await userCollection.find().toArray();
  res.render("admin", {
    authenticated: true,
    user_type: req.session.user_type,
    name: req.session.name,
    users,
  });
});

// Promote user to admin
app.get("/promote/:email", isAuthenticated, isAdmin, async (req, res) => {
  await userCollection.updateOne(
    { email: req.params.email },
    { $set: { user_type: "admin" } }
  );
  res.redirect("/admin");
});

// Demote admin to user
app.get("/demote/:email", isAuthenticated, isAdmin, async (req, res) => {
  await userCollection.updateOne(
    { email: req.params.email },
    { $set: { user_type: "user" } }
  );
  res.redirect("/admin");
});

app.get("*", (req, res) => {
  res.status(404).render("404", {
    authenticated: req.session.authenticated,
    user_type: req.session.user_type,
  });
});

app.listen(port, () => {
  console.log("Node application listening on port " + port);
});