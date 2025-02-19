const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.spmab.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const databaseCollection = client.db("users").collection("user");

    app.post("/adduser", async (req, res) => {
      try {
        const user = req.body;
        const result = await databaseCollection.insertOne(user);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to add user" });
      }
    });

    app.get("/allusers", async (req, res) => {
      try {
        const cursor = databaseCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to pull all users" });
      }
    });

    app.put("/userUpdate", async (req, res) => {
      try {
        const { _id, ...updateFields } = req.body; // Destructure _id separately
        if (!_id) return res.status(400).json({ error: "Missing user ID" });

        const query = { _id: new ObjectId(_id) }; // Convert to ObjectId
        const updateDoc = { $set: updateFields }; // Use $set for partial updates

        const result = await databaseCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User updated successfully", result });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user info" });
      }
    });

    // Delete a user
    app.delete("/deleteuser", async (req, res) => {
      try {
        const { _id } = req.body;

        if (!_id) return res.status(400).send({ error: "Missing user ID" });

        const query = { _id: new ObjectId(_id) };
        const result = await databaseCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res.send({ message: "User deleted successfully" });
        } else {
          res.status(404).send({ error: "User not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to delete user" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Yesss...");
});

app.listen(port, () => {
  console.log("request responded");
});
