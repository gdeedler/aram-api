import mongoose from "mongoose";

const database = mongoose.connect('mongodb://localhost:27017/aram-matches')

export default database;