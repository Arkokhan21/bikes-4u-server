const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

// middleware - 
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xj7qmnz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// get the token and verify - (middleWare)
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1]

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next();
    })
}

async function run() {
    const categoriesCollection = client.db('bikes4u').collection('categories');
    const bikeOrdersCollection = client.db('bikes4u').collection('bikeOrders');
    const usersCollection = client.db('bikes4u').collection('users');
    const addedBikeCollection = client.db('bikes4u').collection('addedBikes');
    const paymentsCollection = client.db('bikes4u').collection('payments');

    try {
        // get all categories from database - 
        app.get('/categories', async (req, res) => {
            const query = {}
            const options = await categoriesCollection.find(query).toArray()
            res.send(options)
        })

        // get specific categories by id - 
        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await categoriesCollection.findOne(query)
            res.send(result)
        })

        // post modal data(bike-orders) in database - 
        app.post('/bikeorders', async (req, res) => {
            const bikeOrder = req.body
            const result = await bikeOrdersCollection.insertOne(bikeOrder)
            res.send(result)
        })

        // get specific bike-orders data from database - (for payment)
        app.get('/bikeorders/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const bikes = await bikeOrdersCollection.findOne(query)
            res.send(bikes)
        })

        // post payment data (clientSecret) - 
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const orderedBike = req.body
            const price = orderedBike.price

            const amount = parseInt(price) * 100

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        // Posting payment data to database and updating data in bikeOrdersCollection - 
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body
            const result = await paymentsCollection.insertOne(payment)

            const id = payment.orderedbikeId
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bikeOrdersCollection.updateOne(filter, updateDoc)

            res.send(result)
        })

        // get modal data(bike-orders) from database and token by user email - 
        app.get('/bikeorders', verifyJWT, async (req, res) => {
            const email = req.query.email
            const decodedEmail = req.decoded.email

            // verify user - 
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const bikeOrders = await bikeOrdersCollection.find(query).toArray()
            res.send(bikeOrders)
        })

        // post users to the database - 
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        // post token, if the user exist - 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '8h' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })

        // get all users from database - 
        app.get('/users', async (req, res) => {
            const query = {}
            const users = await usersCollection.find(query).toArray()
            res.send(users)
        })

        // delete users from daabase - 
        app.delete('/users/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })

        // check admin by users email - 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({ isAdmin: user?.role === 'admin' })
        })

        // check buyer by users email - 
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({ isBuyer: user?.accountType === 'Buyer' })
        })

        // check seller by users email -
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({ isSeller: user?.accountType === 'Seller' })
        })

        // post addedbikes in database -
        app.post('/addedbikes', verifyJWT, async (req, res) => {
            const addedbikes = req.body
            const result = await addedBikeCollection.insertOne(addedbikes)
            res.send(result)
        })

        // get addedbikes by seller email - 
        app.get('/addedbikes', verifyJWT, async (req, res) => {
            const email = req.query.email
            const query = { sellerEmail: email }
            const bikes = await addedBikeCollection.find(query).toArray()
            res.send(bikes)
        })

        // get all addedbikes from database - 
        app.get('/addedbikesss', async (req, res) => {
            const query = {}
            const bikes = await addedBikeCollection.find(query).toArray()
            res.send(bikes)
        })

        // delete addedbikes from database - 
        app.delete('/addedbikes/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await addedBikeCollection.deleteOne(filter)
            res.send(result)
        })

        // update (select products for advertise) - 
        app.put('/addedbikes/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    isAdvertise: 'advertise'
                }
            }
            const result = await addedBikeCollection.updateOne(filter, updateDoc, options)
            res.send(result);
        })

    }
    finally {

    }
}
run().catch(console.log);

app.get('/', (req, res) => {
    res.send('Hello From Bikes 4U')
})

app.listen(port, () => {
    console.log(`Bikes 4U running on port ${port}`)
})