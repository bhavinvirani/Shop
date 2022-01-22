require("dotenv").config();
const fs = require("fs");
const path = require("path");

// const stripe = require("./payment/stripe");

const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const ITEMS_PER_PAGE = parseInt(process.env.ITEMS_PER_PAGE); //* items per page

// GET => /
exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems = 0;

  Product.find()
    .countDocuments()
    .then((numOfProducts) => {
      totalItems = numOfProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      let userEmail;
      if (req.user) {
        userEmail = req.user.email;
      }
      res.render("shop/index", {
        path: "/",
        pageTitle: "Shop",
        prods: products,
        userEmail: userEmail,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviosPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// GET => /products
exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems = 0;

  Product.find()
    .countDocuments()
    .then((numOfProducts) => {
      totalItems = numOfProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      let userEmail;
      if (req.user) {
        userEmail = req.user.email;
      }
      res.render("shop/product-list", {
        path: "/products",
        pageTitle: "All Products",
        prods: products,
        userEmail: userEmail,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviosPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => console.log(err));
};

// GET => products/:productId     //* render only one item accrding productId
exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-details", {
        path: "/products",
        pageTitle: product.title,
        prod: product, // returns array of one element
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// GET => /cart
exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId") // by default dose not return promice   // here items is array of product inside user's cart having items and quantity in object
    .execPopulate() // return promice
    .then((user) => {
      const products = user.cart.items; // return items array of each object
      const total = user.cart.total;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
        total: total,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// POST => /cart  //* create order
exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// POST => /cart-delete-item
exports.postCartDeleteProduct = (req, res, next) => {
  const { productId, price, quantity } = req.body;
  req.user
    .removeFromCart(productId, price, quantity)
    .then((result) => res.redirect("/cart"))
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// GET => /orders
exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      // console.log(orders);
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// POST => /create-order
exports.getCheckoutSuccess = (req, res, next) => {
  const { name, email, _id } = req.user;
  req.user
    .populate("cart.items.productId") // by defoult dose not return promice
    .execPopulate() // return promice
    .then((user) => {
      //* product in side productId filed cause of populate ()
      // console.log(user.cart.items);
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } }; // in product store whole produt document using (_doc) insted of only _id
      });
      const order = new Order({
        user: {
          name: name,
          email: email,
          userId: _id, // can also use (req.user._id)
        },
        products: products,
        total_amount: user.cart.total,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => res.redirect("/orders"))
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        //* if no order found assosiated with this order id
        return next(new Error("No order found"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        //* oreder blongs to currently loggdin user
        return next(new Error("Unauthorized user"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline   ; filename = "' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invice", {
        underline: true,
      });
      pdfDoc.text("---------------------");
      pdfDoc.fontSize(16).text("Order Id: " + order._id);
      pdfDoc.text("");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              " - " +
              prod.quantity +
              " x " +
              "$" +
              prod.product.price
          );
      });
      pdfDoc.text("-----");
      pdfDoc.fontSize(18).text("Total Price: $" + totalPrice);

      pdfDoc.end();
    })
    .catch((err) => console.log(err));
};


exports.getCheckout = (req, res, next) => {
  let products
  let total
  req.user
    .populate("cart.items.productId") // by default dose not return promice   // here items is array of product inside user's cart having items and quantity in object
    .execPopulate() // return promice
    .then((user) => {
      products = user.cart.items; // return items array of each object
      total = user.cart.total;

      return stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: products.map(prod => {
          return {
            name: prod.productId.title,
            description: prod.productId.description,
            amount: prod.productId.price * 100,
            currency: 'inr',
            quantity: prod.quantity,
          };
        }),
        success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
        cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
    });

      // return {
      //   products: products,
      //   total: total,
      //   session: session
      // };
    })
    .then(session => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        total: total,
        sessionId: session.id,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
