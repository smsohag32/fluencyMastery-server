const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000 ;

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dilnpqn.mongodb.net/?retryWrites=true&w=majority`;

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

    const userCollection = client.db('fluencyDb').collection('users');

    // jwt related api
    app.post('/jwt', (req, res)=>{
        const email = req.body;
        res.send({})
    })
    //  user info save to database 
    app.post('/users', async(req, res)=>{
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
    })
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   
  }
}
run().catch(console.dir);






app.get('/', (req, res)=>{
    res.send('FluencyMastery server is running...')
})

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})