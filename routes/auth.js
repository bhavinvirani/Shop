const express = require("express");
const { check, body } = require("express-validator");

const router = express.Router();
const authController = require("../controllers/auth/auth");

const User = require("../models/user");

router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter valid email")
      .normalizeEmail(),
    body("password", "Invalid Password")
      .isLength({ min: 3 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.get("/signup", authController.getSignup);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter valid email") //? custom message
      .custom((value, { req }) => {
        //? custom validator
        //? express-validator wait till full-fill this promise
        return User.findOne({ email: value }) //? async validation(intraction with DB)
          .then((userDoc) => {
            if (userDoc) {
              return Promise.reject("Email allredy exist"); //? if error then store this message in error
            }
          });
      })
      .normalizeEmail(),
    body("password", "please enter atlest 6 charectors in password").isLength({
      min: 3,
      max: 24,
    }),
    body("password", "Use only letters and numbers").isAlphanumeric().trim(),
    body("confirmPassword")
      .isLength({ min: 3, max: 24 })
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Password dose note match"); //TODO:
        }
        return true;
      }),
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset); //?Whene only email sent

router.get("/reset/:id/:token", authController.getNewPassword);

router.post(
  "/new-password",
  [
    body("newPassword", "please enter atlest 6 charectors in password")
        .isLength({ min: 3, max: 24 }),
    body("newPassword", "Use only letters and numbers").isAlphanumeric().trim(),
    body("confirmNewPassword")
      .isLength({ min: 3, max: 24 })
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error("Password dose note match"); //TODO:
        }
        return true;
      }),
  ],
  authController.postNewPassword
);

module.exports = router;
