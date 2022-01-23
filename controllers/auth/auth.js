require("dotenv").config();
const crypto = require("crypto"); // builtin library

const User = require("../../models/user");
const bcrypt = require("bcryptjs");

const { validationResult } = require("express-validator");

var nodemailer = require("nodemailer");
var sgTransport = require("nodemailer-sendgrid-transport");
const { log, table } = require("console");
const mailerOptions = {
  auth: {
    api_key: process.env.SENDGRID_APIKEY,
  },
};
const mailer = nodemailer.createTransport(sgTransport(mailerOptions)); //? create third-party transpoter

exports.getLogin = (req, res, next) => {
  // const isLoggdIn = req.get('Cookie').split(';')[0].trim().split('=')[1];
  let message = req.flash("error"); //? takes error filed from current request which is pass from previouse any function
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: { email: "" },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: { email: "" },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email },
      validationErrors: errors.array(),
    });
  }
  // valid inputs
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        //? id user not found in DB
        // req.flash('error', 'Invalid Email or Password');    //? flash add filed in next req object
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "User not found please Signup",
          oldInput: { email: "" },
          validationErrors: [],
        });
      }
      bcrypt //? if found then compare founded user with request user
        .compare(password, user.password) //request user password, founded use password
        //? return true if match else false (Boolean)
        .then((doMatch) => {
          //* password match or not in both case we make into the then block
          if (doMatch) {
            // if true (valid user)
            req.session.isLoggdIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              res.redirect("/");
            });
          }
          // req.flash('error', 'Invalid Email or Password');
          // res.redirect('/login');   //? if false / wrong credentials
          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: "Invalid Password",
            oldInput: { email: email },
            validationErrors: [],
          });
        })
        .catch((err) => {
          (err) => console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => console.log(err, "Invalid Login credentials"));
};

exports.postSignup = (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req); //? validate data from route middleware

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email },                //? keep old input of user
      validationErrors: errors.array(),          //? for field heighlight
    });
  }

  return bcrypt
    .hash(password, 9)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      res.redirect("/login");
      const signupEmail = {
        to: [email],
        from: "viranibhavin45@gmail.com",
        subject: "Signup Succsesfully ☺",
        text: "Welcome to our shop",
        html: "<h1>You Succsesfully Signed Up</h1>",
      };
      mailer.sendMail(signupEmail, function (err, res) {
        //? sending email
        if (err) {
          console.log(err, "Sent email error");
        }
        console.log(res, "Email Sent");
      });
    })
    .catch((err) => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset-password", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buf) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buf.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account found assosiated with that email ");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExp = Date.now() + 10 * 60 * 60 * 60 * 100;
        id = user._id.toString();
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        const resetEmail = {
          to: req.body.email,
          from: "viranibhavin45@gmail.com",
          subject: "Password Reset",
          text: "Welcome to our shop",
          html: `
                    <p>You requested a password reset</p>
                    <p>Click this <a href="http://localhost:${process.env.LOCAL_HOST}/reset/${id}/${token}">here</a>
                     to set new password</p>
                `,
        };
        mailer.sendMail(resetEmail, function (err, res) {
          //? sending email
          if (err) {
            console.log(err, "password reset email error");
          }
          console.log(res, "password reset Email Sent");
        });
      })
      .catch((err) => console.log(err));
  });
};

exports.getNewPassword = (req, res, next) => {      //? from Mail
  const token = req.params.token;
  const id = req.params.id;
  User.findOne({ _id: id, resetTokenExp: { $gt: Date.now() } })
    .then((user) => {
      if(!user) {
        console.log("resetToken not exist");
        return res.redirect('/login');
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "Set Your New Password",
        userId: id,
        errorMessage: "",
        passwordToken: token,
        validationErrors: []
      });
    })
    .catch((err) => {
      console.log("invalid url of reset password");
      console.log(err);
    });
};

exports.postNewPassword = (req, res, next) => {
  const { newPassword, confirmNewPassword, userId, passwordToken } = req.body;
  const token = req.params.token;
  const id = req.params.id;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/new-password", {
      path: "/new-password",
      pageTitle: "Set Your New Password",
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
      passwordToken: token,
      userId: id,
    });
  }
  let resetUser;
  User.findOne({
    _id: userId,
    resetTokenExp: { $gt: Date.now() },
    resetToken: passwordToken,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 9);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExp = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => console.log(err));
};
