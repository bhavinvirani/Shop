require('dotenv').config();

const { MongoClient } = require('mongodb');   //* mongoDB object

const URI = process.env.DB_URI
let _db;

const mongoConnect = (callback) => {    //* here callback is parameter function which is passed from where it calls as anonymous function

    MongoClient.connect(URI,
        {
            useUnifiedTopology: true
        })
        .then(client => {
            console.log("Connected");
            _db = client.db("shop");       //* store Accsess of database ==> ("client.db")
            callback();
        }).catch(err => {
            console.log(err)
            throw err;
        })

} //* return client object inside callback function 

const getDb = () => {
    if (_db) {
        return _db     //* return accsess of data
    }
    throw `No Database Found !!!`;
}

//* exporting functions
// exports.mongoConnect = mongoConnect;
// exports.getDb = getDb;
module.exports = { mongoConnect, getDb };