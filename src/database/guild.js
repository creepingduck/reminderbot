const mongoose = require("mongoose");
const { Schema, Document, Model} = mongoose;

const guildSchema = new Schema({
    //_id: Schema.Types.ObjectId,
    guildID: String,
    timer: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Guild', guildSchema);