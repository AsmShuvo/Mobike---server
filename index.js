const express = require("express");
const app = express();
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PORT = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jgp414t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const bikesCollection = client.db("bikeDB").collection("bikes");
    const reviewCollection = client.db("bikeDB").collection("reviews");
    const cartCollection = client.db("bikeDB").collection("carts");
    const blogCollection = client.db("bikeDB").collection("blogs");
    const userCollection = client.db("bikeDB").collection("users");
    const paymentCollection = client.db("bikeDB").collection("payments");
    // ==============ALL GET REQUESTS===================================
    app.get("/bikes", async (req, res) => {
      const result = await bikesCollection.find().toArray();
      res.send(result);
    });
    app.get("/bike-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bikesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      if (!email) {
        return res.status(400).send({ error: "Invalid email address" });
      }
      try {
        const query = { email: email };
        const result = await paymentCollection.find(query).toArray();

        if (result.length === 0) {
          return res
            .status(404)
            .send({ message: "No bikes found for this email" });
        }

        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching bike details:", error);
        res
          .status(500)
          .send({ error: "An error occurred while fetching bike details" });
      }
    });

    app.get("/cart", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });
    app.get("/cart/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    app.get("/blogs", async (req, res) => {
      const result = await blogCollection.find().toArray();
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/payments", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    // ==============ALL POST REQUESTS=======================================
    app.post("/cart", async (req, res) => {
      const newBike = req.body;
      const result = await cartCollection.insertOne(newBike);
      res.send(result);
    });
    app.post("/blogs", async (req, res) => {
      const newBlog = req.body;
      const result = await blogCollection.insertOne(newBlog);
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });
    app.post("/bikes", async (req, res) => {
      const newBike = req.body;
      const result = await bikesCollection.insertOne(newBike);
      res.send(result);
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });

    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;

        if (isNaN(price) || price <= 0) {
          return res.status(400).send({
            error: "Invalid price value. Price must be a positive number.",
          });
        }

        const amount = Math.round(price * 100);

        // Create the payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({
          error: "Internal Server Error",
        });
      }
    });

    // ================ALL DELETE REQUESTS==========================================
    app.delete("/cart/:id/:email", async (req, res) => {
      const deletedId = req.params.id;
      const deletedEmail = req.params.email;
      const query = { _id: new ObjectId(deletedId), email: deletedEmail };
      const result = cartCollection.deleteOne(query);
      console.log("#", result);
      res.send(result);
    });
    app.delete("/bikes/:id/", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = bikesCollection.deleteOne(query);
      console.log("#", result);
      res.send(result);
    });

    // ============================= ALL PATCH REQUESTS ============================
    app.patch("/payments/:id/:email/:confirmation", async (req, res) => {
      const id = req.params.id;
      const email = req.params.email;
      const confirmation = req.params.confirmation;
      console.log(id);
      console.log("#", email);
      const filter = { _id: new ObjectId(id) };
      const updatedPayment = {
        $set: {
          status: confirmation,
        },
      };
      console.log(updatedPayment);
      const result = await paymentCollection.updateOne(filter, updatedPayment);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("MOBIKE is running");
});

app.listen(PORT, () => {
  console.log(`MOBIKE is running on ${PORT}`);
});

module.exports = app;