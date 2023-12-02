const express = require('express')
var cors = require('cors')
const app = express()
require('dotenv').config()
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(express.json())
app.use(cors())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nvdjbig.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("biaSadhiDB").collection("users");
    const bioDataCollection = client.db("biaSadhiDB").collection("biodata");
    // const reviewsCollection = client.db("biaSadhiDB").collection("reviews");
    // const cartCollection = client.db("biaSadhiDB").collection("carts");
    // const paymentCollection = client.db("biaSadhiDB").collection("payments");


    // jwt related  API
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })
    })



    // middleWires
    const verifyToken = (req, res, next) => {
      // console.log('Inside Verify Token : ', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" })
        }
        req.decoded = decoded
        next()
      });
    }


    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" })
      }
      next();
    }



    //USER RELATED API
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      //checking
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.patch('/users/admin/premium/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const premiumDoc = {
        $set: {
          customerType: 'premium'
        },
      };
      const result = await userCollection.updateOne(filter, premiumDoc);
      res.send(result);
    })


    //Biodata related Api.

    // create biodata with BiodataId.
    app.post('/biodata/:email', async (req, res) => {
      const userEmail = req.params.email
      const bioDataForPreson = req.body;
      const countStr = await bioDataCollection.countDocuments({ email: userEmail })
      const count = parseInt(countStr)
      const newData = {
        ...bioDataForPreson, biodataID: parseInt(`${count + 1}`)
      };
      const result = await bioDataCollection.insertOne(newData);
      res.send(result);
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Rezwan Taratari bia kor')
})

app.listen(port, () => {
  console.log(`Bia Sadhi is running on port :  ${port}`)
})