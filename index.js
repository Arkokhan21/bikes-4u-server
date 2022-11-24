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