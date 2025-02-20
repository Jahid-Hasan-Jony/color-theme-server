const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cloudinary = require("./cloudinary/cloudinary");
const upload = require("./multer/multer");

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

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
    const databaseCollectionGallery = client
      .db("gallery")
      .collection("galleries");

    app.post("/adduser", upload.single("file"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // Cloudinary Upload (Promise-based)
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ resource_type: "auto" }, (error, result) => {
              if (error) reject(error);
              else resolve(result);
            })
            .end(req.file.buffer);
        });

        // MongoDB Insert
        const imageUrl = result.secure_url;

        const publicId = imageUrl.split("/").pop().split(".")[0];

        const user = { ...req.body, imageUrl: imageUrl, publicId: publicId };

        const dbResult = await databaseCollection.insertOne(user);

        console.log(user);
        res
          .status(201)
          .json({ message: "User added successfully", user, dbResult });
      } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({ error: "Failed to add user" });
      }
    });

    app.post("/gallery", upload.array("files", 5), async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: "No files uploaded" });
        }

        let uploadedImages = [];

        // Upload all images to Cloudinary
        for (const file of req.files) {
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream({ resource_type: "auto" }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
              })
              .end(file.buffer);
          });

          uploadedImages.push({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
        const dbResult = await databaseCollectionGallery.insertOne(
          uploadedImages
        );

        res.status(201).json({
          message: "Images uploaded successfully",
          images: uploadedImages,
        });
      } catch (error) {
        console.error("Error uploading images:", error);
        res.status(500).json({ error: "Failed to upload images" });
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
        const { _id, publicId } = req.body;

        if (!_id) return res.status(400).send({ error: "Missing user ID" });

        await cloudinary.uploader.destroy(publicId);

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

    // app.post("/upload", upload.single("file"), async (req, res) => {
    //   try {
    //     const result = await cloudinary.uploader.upload(req.file.path, {
    //       resource_type: "auto",
    //     });

    //     fs.unlinkSync(req.file.path); // লোকাল থেকে ফাইল মুছে ফেলবে

    //     res.json({ url: result.secure_url });
    //   } catch (error) {
    //     res.status(500).json({ error: "Upload failed!" });
    //   }
    // });

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
