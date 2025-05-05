

require("./utils.js");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const saltRounds = 12;

const port = process.env.PORT || 3000;
const app = express();

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
  if (!req.session.authenticated) {
    res.send(`
      <h1>Welcome!</h1>
      <a href="/signup">Sign Up</a> | <a href="/login">Log In</a>
    `);
  } else {
    res.send(`
      <h1>Hello, ${req.session.name}!</h1>
      <a href="/members">Members Area</a> | <a href="/logout">Logout</a>
    `);
  }
});

app.get("/signup", (req, res) => {
  res.send(`
    <form action="/signup" method="post">
      Name: <input name="name"><br>
      Email: <input name="email"><br>
      Password: <input name="password" type="password"><br>
      <button>Sign Up</button>
    </form>
  `);
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.send("All fields required. <a href='/signup'>Try again</a>");
  }

  const schema = Joi.object({
    name: Joi.string().max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().max(30).required(),
  });

  const { error } = schema.validate({ name, email, password });
  if (error) return res.send("Validation failed. <a href='/signup'>Try again</a>");

  const hashed = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({ name, email, password: hashed });

  req.session.authenticated = true;
  req.session.name = name;
  req.session.email = email;
  res.redirect("/members");
});

app.get("/login", (req, res) => {
  res.send(`
    <form action="/login" method="post">
      Email: <input name="email"><br>
      Password: <input name="password" type="password"><br>
      <button>Login</button>
    </form>
  `);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate({ email, password });
  if (error) return res.send("Invalid input. <a href='/login'>Try again</a>");

  const user = await userCollection.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.send("Invalid credentials. <a href='/login'>Try again</a>");
  }

  req.session.authenticated = true;
  req.session.name = user.name;
  req.session.email = email;
  res.redirect("/members");
});

app.get("/members", (req, res) => {
  if (!req.session.authenticated) return res.redirect("/");
  const images = ["cat1.jpg", "cat2.jpg", "cat3.jpg"];
  const random = images[Math.floor(Math.random() * images.length)];
  res.send(`
    <h1>Hello, ${req.session.name}!</h1>
    <img src="/${random}" style="width:300px;"><br>
    <a href="/logout">Logout</a>
  `);
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("*", (req, res) => {
  res.status(404).send("Page not found - 404");
});

app.listen(port, () => {
  console.log("Node application listening on port " + port);
});
