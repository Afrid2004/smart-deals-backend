//creating server
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//connecting to database
const uri =
  "mongodb+srv://smart_deals:Afrid_Smart_Deals_5433@cluster0.irfgud5.mongodb.net/?appName=Cluster0";

//middleware
app.use(cors());
app.use(express.json());

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
