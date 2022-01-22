const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    user: {
        // name: {
        //     type: String,
        //     required: true
        // },
        email: {
            type: String,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    },
    products: [{
        product: {
            type: Object,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    total_amount: {
        type: Number,
        required: true,
        default: 0
    }
    
}, 
{
    timestamps: true
}
);

module.exports = mongoose.model('Order', orderSchema);   // in DB Order == orders
