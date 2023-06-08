const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000 ;
const jwt = require('jsonwebtoken');

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


// verify jwt 

const verifyJwt = (req,res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
   return res.status(401).send({error: true, message: 'unauthorized access'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next()
  })
}


async function run() {
  try {

    const userCollection =  client.db('fluencyDb').collection('users');
    const courseCollection =  client.db('fluencyDb').collection('courses');

    // jwt related api
      app.post('/jwt', (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h',
      })

      res.send({ token })
    })

    // verify admin role 
    const verifyAdmin = async (req, res, next) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user  = await userCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message: 'forbidden access'});
      }
      next()
    }
    // verify instructor role
    const verifyInstructor = async(req,res, next) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      if(user?.role !== 'instructor'){
        return res.status(403).send({error: true, message: 'forbidden access'});
      }
      next()
    }


    // user related api and role set
    //  user info save to database 
    app.put('/users/:email', async(req, res)=>{
        const user = req.body;
        const email = req.params.email;
        const query = {email: email};
        const option = {upsert: true};
        console.log(user, email);
        const updatedDoc = {
          $set: user
        }
        const result = await userCollection.updateOne(query,updatedDoc, option);
        res.send(result);
    })
    // get user to db only admin access to get data
    app.get('/users', verifyJwt, verifyAdmin, async (req,res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // make admin role
    app.patch('/users/admin/:email', async(req,res)=>{
      const email = req.params.email;
      const {role} = req.body;
      const filter = {email: email};
      const updatedDoc = {
        $set: {
          role: role
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })
    app.patch

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