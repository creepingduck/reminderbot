const mongoose = require("mongoose");

const dbOptions = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    autoIndex: false,
    useFindAndModify: false,
    //reconnectTries: Number.MAX_VALUE,
    //reconnectInterval: 500,
    poolSize: 5,
    connectTimeoutMS: 5000,
    //family: 4
};

const connectionUrl = process.env.MONGODB_URL;

module.exports = async function init() {
    mongoose.Promise = global.Promise;
    
    mongoose.connection.on('connected', () => {
        console.log('Mongoose connection successfully opened!');
    });
    
    mongoose.connection.on('err', err => {
        console.error(`Mongoose connection error: \n ${err.stack}`);
    });
    
    mongoose.connection.on('disconnected', () => {
        console.log('Mongoose connection disconnected');
    });
    await mongoose.connect(connectionUrl, dbOptions);
}