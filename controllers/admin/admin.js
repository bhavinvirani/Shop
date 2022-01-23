const mongoose = require("mongoose");
const deleteFileHelper = require('../../util/file')

const { validationResult } = require("express-validator");
const Product = require("../../models/product"); //? importing model


// /admin/products => GET
exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        path: "/admin/products",
        pageTitle: "Admin Products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// /admin/add-product => GET
exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

// /admin/add-product => POST     //* adding new product
exports.postAddProduct = (req, res, next) => {
  const { title, price, description } = req.body;
  const image = req.file;
  if (!image) {    //* validat image file
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: { title: title, price: price, description: description },
      errorMessage: "Attched file is not an image",
      validationErrors: [{
        msg: 'Invalid File formate',
        param: 'image',
      }
    ],
    });
  }
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    //* if validation error
    console.log(errors.array());
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        imageUrl: imageUrl,
        price: price,
        description: description,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  const imageUrl = image.path;

  const product = new Product({
    // _id: new mongoose.Types.ObjectId("60d1ca8ee50d3a332c3880b8"),   //* make allredy exist
    title: title,
    price: price,
    description: description,
    imageUrl: "/" + imageUrl,
    userId: req.user._id,
  });
  product
    .save()
    .then((result) => {
      // technically we don't return promise but mongoose give us then message
      console.log("Product created");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      // res.redirect('/500'); //
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("here")
      return next(error);
    });
};

// /admin/:productId?edit=true  => GET
exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/admin/products");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/admin/products");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        hasError: false,
        product: product,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// /admin/edit-product  => POST
exports.postEditProduct = (req, res, next) => {
  const {
    productId: prodId,           //* give alias name
    title: updatedTitle,
    price: updatedPrice,
    description: updatedDesc,
  } = req.body;
  const image = req.file;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }
  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        //? if someone who not match to product creator's id
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        deleteFileHelper.deleteFile(product.imageUrl.substring(1))
        product.imageUrl = '/' + image.path;
        console.log(product.imageUrl);
      }
      return product.save().then((result) => {
        console.log("PRODUCT UPDATED");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// /admin/delete-product  => POST
exports.deleteProduct = (req, res, next) => {
  console.log("deleted")
  
  const prodId = req.params.productId;
  Product.findById(prodId).then((product) => {
    if(!product) {
      return next(new Error('Product not found'))
    }
    deleteFileHelper.deleteFile(product.imageUrl.substring(1))
    return Product.deleteOne({ _id: prodId, userId: req.user._id })

  })
  .then(() => {
    // res.redirect("/admin/products");
    res.status(200).json({message: 'Product deleted'})
  })
  .catch((err) => {
    res.status(500).json({message: "Deleting product failed"})
  });

};
