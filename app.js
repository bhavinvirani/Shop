require("dotenv").config();

const path = require("path");
const fs = require("fs");
const https = require("https");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session"); //? create sessions
// Take instance of "express-session module" to connect then return MongoDBStore "Class" latter on that can be use of store session
const MongoDBStore = require("connect-mongodb-session")(session); //? session store   //? store sessions at database
const csrf = require("csurf"); //? for prevent csrf atteck
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const errorController = require("./controllers/error/error");
const User = require("./models/user");
const ErrorHandler = require("./error/ErrorHandler");

// console.log(process.env.NODE_ENV)
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@shop.g1yco.mongodb.net/${process.env.MONOG_DEFAULT_DATABASE}`;
const app = express();

// crating new object of class which is returns from "connect-mongodb-session"
//? seting up session store
const store = new MongoDBStore({
  uri: MONGODB_URI, // DB uri

  collection: "sessions", // collection name in database
  // expires: 1000 * 24 * 60 * 60 * 30,
  connectionOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  },
});
const csrfProtection = csrf(); //? type of middleware

// const privateKey = fs.readFileSync("server.key");
// const certificate = fs.readFileSync("server.cert");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    //* where to store incoming files
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname); //* set incomig file name
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set("view engine", "ejs"); //? ejs
app.set("views", "views"); //? render views

// * Routers
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

const accsessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

//* production fase
app.use(helmet()); //* set secured HTTP heders
app.use(compression()); //* compression of asset
app.use(morgan("combined", { stream: accsessLogStream })); //* log request data

//* Globel MiddleWare
app.use(bodyParser.urlencoded({ extended: false })); //? Body-parser middleware  // extract content of incoming request
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
); //? multer middleware // parse incoming file content

app.use(express.static("public"));
app.use("/images", express.static("images"));
//? cofigur session
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: store, //? where to satore
    cookie: {},
  })
);

app.use(csrfProtection); //? Globel middleware look for csrf token for every "non-get" request
app.use(flash());

//req.locals.<key> = <value> store filed in req object till this request is alive
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggdIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

//? only run for incoming request not for database
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

//? Routes Middleware
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  console.log("From 500", error);
  res.status(500).render("error/500", {
    pageTitle: "Error",
    path: "/500",
    isAuthenticated: req.session.isLoggdIn,
  });
});

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => {
    //* create certificate and key  ==> openssl req -nodes -x509 -keyout server.key -out server.cert
    // https.createServer({
    //   key: privateKey,
    //   cert: certificate
    // }, app).listen(process.env.PORT || process.env.LOCAL_HOST);
    app.listen(process.env.PORT || process.env.LOCAL_HOST);
    console.log("Connected");
  })
  .catch((err) => console.log(err));
