const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware - 
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xj7qmnz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    const categoriesCollection = client.db('bikes4u').collection('categories');
    const bikeOrdersCollection = client.db('bikes4u').collection('bikeOrders');
    const usersCollection = client.db('bikes4u').collection('users');

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

        // get modal data(bike-orders) from database - 
        app.get('/bikeorders', async (req, res) => {
            const email = req.query.email
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