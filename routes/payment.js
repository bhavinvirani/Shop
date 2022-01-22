const express = require('express');
const shopPayment = require('../controllers/payment/payment');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/', shopPayment.getIndex);