const express = require('express')
const cors = require('cors')
const app = express();
const port  = process.env.port ||5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRECT);
//middleware

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rrnpcbx.mongodb.net/?retryWrites=true&w=majority`;
//console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    //console.log(token)
    jwt.verify(token, process.env.JWT_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message:'forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}


async function run(){
try {

const serviceCollection = client.db('a2zHomeServices').collection('services');
const orderCollection = client.db('a2zHomeServices').collection('orders');
const categoriesCollection = client.db('a2zHomeServices').collection('categories');
const usersCollection = client.db('a2zHomeServices').collection('users');
const paymentsCollection = client.db('a2zHomeServices').collection('payments');




app.get('/services', async(req, res) =>{
    const query = {};
    const services = await serviceCollection.find(query).toArray();
    res.send(services)
})

app.get('/services/:id', async(req, res) =>{
    const id= req.params.id;
    const query = { _id:ObjectId(id)}
    const service = await serviceCollection.findOne(query);
    res.send(service)
})

//categories api

app.get('/categories', async(req, res) =>{
    const query ={};
    const categories = await categoriesCollection.find(query).toArray();
    res.send(categories)
})

app.get('/categories/:id', async(req, res) =>{
    const id = req.params.id;
     const query = { _id:ObjectId(id)}
     const categories = await categoriesCollection.findOne(query);
     res.send(categories)
})

//orders api
//get all orders
app.get('/orders', verifyJWT, async(req, res) =>{
    let query ={};
    const email = req.query.email;
    const decodedEmail = req.decoded.email
    if(email !== decodedEmail){
        return res.status(403).send({message:'forbidden access'})
    }
    if(req.query.email){
        query ={
            email: req.query.email
        }   
    }
    
    
    const orders = await orderCollection.find(query).toArray();
    res.send(orders)
})

app.post('/create-payment-intent', async(req, res) =>{
    const order = req.body;
    const price = order.price;
    const amount = price * 100;

    const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        "payment_method_types":[
            "card"
        ]
    });
    res.send({
        clientSecret: paymentIntent.client_secret,
    });
})

app.post('/payments', async(req, res) =>{
    const payment = req.body;
    const result = await paymentsCollection.insertOne(payment);
    const id= payment.orderId
    const filter ={ _id:ObjectId(id)}
    const updateDoc ={
        $set:{
            paid:true,
            transactionId: payment.transactionId
        }
    }
    const updateResult = await orderCollection.updateOne(filter, updateDoc)
    res.send(result)
})




app.get('/jwt', async(req,res) =>{
    const email = req.query.email;
    const query= {email: email};
    const user = await usersCollection.findOne(query)
    if(user && user.email){
        const token = jwt.sign({email}, process.env.JWT_TOKEN, {expiresIn:'1h'});
        return res.send({accessToken: token});
        
    }
    
    console.log(user)
    res.status(403).send({accessToken:''})
})


app.post('/users', async(req, res) =>{
    const user = req.body;
    const result = await usersCollection.insertOne(user)
    res.send(result)
})


//insert orders

app.get('/orders/:id', async(req, res) =>{
    const id = req.params.id;
    const query = { _id:ObjectId(id)}
    const order = await orderCollection.findOne(query)
    res.send(order)
})


app.post('/orders', async(req,res) =>{
    const order = req.body;
    const result = await orderCollection.insertOne(order)
    res.send(result);
});

app.patch('/orders/:id', async(req, res) =>{
    const id = req.params.id;
    const status = req.body.status;
    const query ={ _id:ObjectId(id)}
    const updatedDoc ={
        $set:{
            status: status
        }
    }
    const result = await orderCollection.updateOne(query, updatedDoc);
    res.send(result)
})



app.delete('/orders/:id', async(req, res) =>{
    const id= req.params.id;
    const query = { _id:ObjectId(id)}
    const result = await orderCollection.deleteOne(query);
    res.send(result)
})





}

finally{

}

}

run().catch(error =>console.error(error))








app.get('/', (req,res) =>{
    res.send('home services server is running')
})

app.listen(port,() =>{
    console.log(`home services server running on${port}`)
})