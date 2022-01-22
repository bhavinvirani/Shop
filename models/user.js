const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: 'string',
        required: true
    },
    password: {
        type: 'string',
        required: true
    },
    resetToken: String,
    resetTokenExp: Date,
    cart: {
        items: [{
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }],
        total: {
            type: Number,
            default: 0,
            require: true
        }
    }
}, {
    timestamps: true
});

userSchema.methods.addToCart = function (product) {
    //* if product allredy available in cart then return "index" of product in cart.items array else null
    const cartProductIndex = this.cart.items.findIndex(cartProduct => {
        return cartProduct.productId.toString() === product._id.toString();
    });

    let newQuantity = 1;
    let total = this.cart.total;
    const updatedCartItems = [...this.cart.items];   //* make copy of items belongs to user


    if (cartProductIndex >= 0) {  // if product available
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;  // upadate quantity of product in cart
        updatedCartItems[cartProductIndex].quantity = newQuantity;     // set new quantity into copy cart
        total = total + product.price;
    } else {
        updatedCartItems.push({
            productId: product._id,      
            quantity: newQuantity
        });  // if new product then push into copy cart
        total = total + product.price;
    }
    
    const updatedCart = {   //* set items array to updated copy items array
        items: updatedCartItems
    };
    this.cart = updatedCart;
    this.cart.total = total;
    return this.save()
};

/**
 * @param  {} productId
 * @param  {} price
 */
userSchema.methods.removeFromCart = function (productId, price, quantity) {
    const updatedCartItems = this.cart.items.filter(item => {     //* set all items of cart to updatedCartItems accsept delete one
        return item.productId.toString() !== productId.toString();
    }); 

    this.cart.items = updatedCartItems;
    this.cart.total = this.cart.total - (price * quantity);
    return this.save();
};

userSchema.methods.clearCart = function () {
    this.cart = { items: [] }
    return this.save()
}


module.exports = mongoose.model('User', userSchema)
