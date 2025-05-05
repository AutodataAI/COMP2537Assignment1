require('dotenv').config();
const { MongoClient } = require("mongodb");

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;

const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true&w=majority`;

let mongoClient;

module.exports = {
  database: {
    db: (dbName) => {
      if (!mongoClient) {
        mongoClient = new MongoClient(atlasURI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
      }

      return mongoClient.db(dbName);
    },
  },
};
