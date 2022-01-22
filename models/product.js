const mongoose = require('mongoose');

const Schema = mongoose.Schema;  //? allow as to create new schema

//TODO: defining schema for product using validators

const productSchema = new Schema({
    title: {
        type: 'string', // datatype of ttile
        required: [true, "You did't give name"], // option and message
        minlength: 1,   // minmum lenth of ttile
        maxlength: 124  // maximum lenth of title
    },
    price: {
        type: 'number',
        required: [true, "You did not give price"],
        min: 0  // range
    },
    description: {
        type: 'string',
        required: [true, "You did not give description"],
        // lowercase: true,
    },
    imageUrl: {
        type: 'string',
        required: [true, "You did not give imageUrl"]
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
},
// {
//     timestamps: true
// }
);

//TODO: exporting model of product

module.exports = mongoose.model('Product', productSchema); //? collection name, schema name // define collection
                                                           //? collection name must be in singular form
