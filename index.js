//creating server
const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
//firebase Token(optional if we not use jwt)
// const admin = require("firebase-admin");

//firabase admin sdk (optional if we not use jwt)
// var serviceAccount = require("./smart-deals-firebase-adminsdk.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

//connecting to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.irfgud5.mongodb.net/?appName=Cluster0`;

//middleware
app.use(cors());
app.use(express.json());

//jwt middleware
const verifyJWTtoken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "unathorized user" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unathorized user" });
  }
  jwt.verify(token, process.env.JWT_SECRET_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: "unathorized user" });
    }
    req.token_email = decoded.email;
    next();
  });
};

// firebase Middleware(optional if we not use jwt)
// const verifyFirebaseToken = async (req, res, next) => {
//   if (!req.headers.authorization) {
//     return res.status(401).send({ message: "Unauthorized User" });
//   }
//   const token = req.headers.authorization.split(" ")[1];
//   if (!token) {
//     return res.status(401).send({ message: "Unauthorized User" });
//   }
//   try {
//     const userInfo = await admin.auth().verifyIdToken(token);
//     req.token_email = userInfo.email;
//     next();
//   } catch {
//     return res.status(401).send({ message: "Unauthorized User" });
//   }
// };

app.get("/", (req, res) => {
  res.send("Smart server is running");
});

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("smartDeals_db");
    const productCollections = db.collection("products");
    const bidCollections = db.collection("bids");
    const userCollections = db.collection("users");

    //get JWT token (optional if we use firebase SDK)
    app.post("/get-jwt-token", (req, res) => {
      const emailBody = req.body;
      const token = jwt.sign(emailBody, process.env.JWT_SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //create user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = req.body.email;
      const query = {
        email: email,
      };
      const isExist = await userCollections.findOne(query);
      if (isExist) {
        res.send({
          message:
            "User email already exist. Please try another email or account",
        });
        return;
      } else {
        const result = await userCollections.insertOne(user);
        res.send(result);
      }
    });

    //create data
    app.post("/products", async (req, res) => {
      const body = req.body;
      const insertData = await productCollections.insertOne(body);
      res.send(insertData);
    });

    //read data
    app.get("/products", async (req, res) => {
      const cursor = productCollections.find();
      const allValues = await cursor.toArray();
      res.send(allValues);
    });

    //read a specefic data
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollections.findOne(query);
      res.send(result);
    });

    //update data
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          productName: body.productName,
          price: body.price,
        },
      };
      const options = {};
      const result = await productCollections.updateOne(query, update, options);
      res.send(result);
    });

    //delete data
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const deleteData = await productCollections.deleteOne(query);
      res.send(deleteData);
    });

    //latest products
    app.get("/latest-products", async (req, res) => {
      const cursor = productCollections.find().sort({ created_at: 1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    //===============bids api=====================//

    //create bids
    app.post("/bids", async (req, res) => {
      const body = req.body;
      const result = await bidCollections.insertOne(body);
      res.send(result);
    });

    //delete bids
    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidCollections.deleteOne(query);
      res.send(result);
    });

    //read bids by product
    app.get("/products/bid/:productID", async (req, res) => {
      const productID = req.params.productID;
      const query = { product: productID };
      const cursor = bidCollections.find(query).sort({ bid_price: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    //read bids with specific user email query with JWT token
    app.get("/bids", verifyJWTtoken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        if (email !== req.token_email) {
          return res.status(403).send({ message: "Forbidden Access" });
        }
        query.buyer_email = email;
      }
      const cursor = bidCollections.find(query);
      const bids = await cursor.toArray();
      for (let bid of bids) {
        const productQuery = {
          _id: new ObjectId(bid.product),
        };
        let product = await productCollections.findOne(productQuery);
        bid.productData = product;
      }
      res.send(bids);
    });

    //read bids with specific user email query with firebase sdk (optinal if we not use JWT) token
    // app.get("/bids", logger, verifyFirebaseToken, async (req, res) => {
    //   const email = req.query.email;
    //   const token = req.headers;
    //   const query = {};
    //   if (email) {
    //     if (email !== req.token_email) {
    //       return res.status(403).send({ message: "Forbidden Access" });
    //     }
    //     query.buyer_email = email;
    //   }
    //   const cursor = bidCollections.find(query);
    //   const bids = await cursor.toArray();

    //   //bids wise product
    //   for (let bid of bids) {
    //     const productQuery = {
    //       _id: new ObjectId(bid.product),
    //     };
    //     let product = await productCollections.findOne(productQuery);
    //     bid.productData = product;
    //   }
    //   res.send(bids);
    // });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Smart server is running on port ${port}`);
});
