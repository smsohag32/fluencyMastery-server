const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000 ;
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STIPE_SECRET_KEY)
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
    const cartCollection =  client.db('fluencyDb').collection('carts');
    const paymentCollection =  client.db('fluencyDb').collection('payments');

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
        const updatedDoc = {
          $set: user
        }
        const result = await userCollection.updateOne(query,updatedDoc, option);
        res.send(result);
    })
    // get user to db only admin access to get data
    app.get('/users', verifyJwt,verifyAdmin, async (req,res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // user role verify
    app.get('/users/admin/:email',verifyJwt, async(req, res) =>{

      const email = req.params.email;
      if(req.decoded.email !== email){
      return res.send({role: false})
      }
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const result = {role : user?.role === 'admin'}
      
      res.send(result)
    })
    // instructor role verification
    app.get('/users/instructor/:email',verifyJwt, async(req, res)=>{
      const email = req.params.email;
      console.log(email);
      if(req.decoded.email !== email){
      return res.send({role: false})
      }
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const result = {role : user?.role === 'instructor'}  
      res.send(result)
    })


    // make admin role
    app.patch('/users/:email', verifyJwt,verifyAdmin, async(req,res)=>{
      const email = req.params.email;
      const {role} = req.body;
      console.log(email, role);
      const query = {email: email};
      const updatedDoc = {
        $set: {
          role: role
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result)
    })


    // delete user
      app.delete('/users/:email', verifyJwt, verifyAdmin, async(req, res)=>{
        const email= req.params.email;  
        const query = {email: email};
        const result = await userCollection.deleteOne(query);
        res.send(result);
      })




      //here course related apis 
      // get all courses in db
      // TODO: PROJECTION 
      app.get('/courses', async(req,res) =>{
        const result = await courseCollection.find().toArray();
        res.send(result);
      })
      
      // save a new course to db 

      app.post('/courses', verifyJwt, verifyInstructor, async(req, res)=>{
        const newCourse = req.body;
        const result = await courseCollection.insertOne(newCourse);
        res.send(result)
      })

      // get instructor filter  course 
      app.get('/courses/:email', verifyJwt, verifyInstructor, async(req, res)=>{
        const email = req.params.email;
        const query = {instructor_email: email};
        const result = await courseCollection.find(query).toArray();
        res.send(result);

      })

      // manage courses api only admin 
      app.patch('/courses/:id', verifyJwt, verifyAdmin, async(req,res)=>{
        const id = req.params.id;
        const {status} = req.body;
        const query = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
            status: status
          }
        }
        const result = await courseCollection.updateOne(query, updatedDoc);
        res.send(result)
      })

      // admin send to feed back of the any courses
        app.patch('/courses/feedback/:id',verifyJwt, verifyAdmin, async(req, res)=>{
          const id = req.params.id;
          const {message} = req.body;
          const query = {_id: new ObjectId(id)};
          const updatedDoc = {
            $set: {
              feedback: message
            }
          }
          const result = await courseCollection.updateOne(query, updatedDoc)
          res.send(result)
        })
        
        
        // student all api 

        // post cart in db
        app.post('/carts', verifyJwt, async(req, res)=>{
          const newCart = req.body;
          const result = await cartCollection.insertOne(newCart);
          res.send();
        })
        // get Selected cart
        app.get('/carts/:email', async(req, res)=>{
          const email = req.params.email;

          const query = {student_email: email};
          const result = await cartCollection.find(query).toArray();
          res.send(result);
        })



      // payment related apis 

      // create payment intent and confirm payment
      app.post('/confirm-payment', verifyJwt, async(req, res)=>{
        const {amount} = req.body;
        const stAmount = parseInt(amount * 100);
        const paymentIntent = await stripe.paymentIntents.create({
        amount: stAmount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      console.log(paymentIntent);
      res.send({
        clientSecret: paymentIntent.client_secret
      })
      })

      // post payment information in db
      app.post('/payments', verifyJwt, async(req, res)=>{
        const payment = req.body;
        const result = await paymentCollection.insertOne(payment);
        res.send(result)
      })

    // get student enroll payment history
    app.get('/payment-history/:email', verifyJwt, async(req, res)=>{
      const email = req.params.email;
      console.log(email);
      const query = {student_email: email};
      const result = await paymentCollection.find(query).sort({data: -1}).toArray();
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