const express = require('express');
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















app.get('/', (req, res)=>{
    res.send('FluencyMastery server is running...')
})

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})