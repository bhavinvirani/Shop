require("dotenv").config();
// Set your secret key. Remember to switch to your live secret key in production.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.stripeSession = () => {
    return stripe.checkout.sessions.create({
        payment_method_types: ['card']
    });
}
