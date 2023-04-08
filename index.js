const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const port = 5000

//middlewere
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://admin:AY9lk1JG76fuMolY@cluster0.0e8wm8t.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    console.log('authHeader', authHeader)
    if (authHeader === 'Bearer null') {
        return res.status(401).send('unauthorised')
    }
    const token = authHeader.split(' ')[1]
    
    jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
        if (err) {
            res.status(404).send('unauthorised')
        }
        req.decoded = decoded
        next()
    });
}

async function run() {
    const database = client.db("HotelBookings").collection("rooms");
    const guestList = client.db("HotelBookings").collection("guest");
    const bookingList = client.db("HotelBookings").collection("bookings");
    const reviewList = client.db("HotelBookings").collection("reviews");

    let query = {}

    const myFunction = async (res, sortNumber) => {
        query = {}
        const rooms = await database.find(query).sort({ prize: sortNumber }).toArray()
        res.send(rooms)
    }

    try {
        app.get('/rooms', async (req, res) => {
            let sale = req.query.saleRooms

            if (sale) {
                query = { status: 'sale' }
                const rooms = await database.find(query).toArray()
                return res.send(rooms)
            }


            let sortBy = req.query.filterInfo

            if (sortBy === 'rating') {
                const query = {}
                const rooms = await database.find(query).sort({ rating: -1 }).toArray()
                return res.send(rooms)
            }

            let sortNumber;

            if (sortBy === 'descending') {
                sortNumber = 1
                return myFunction(res, sortNumber)

            } else if (sortBy === 'ascending') {
                sortNumber = -1
                return myFunction(res, sortNumber)
            }

            myFunction(res)

        })

        app.get('/roomDetails/:id', verifyJWT, async (req, res) => {
            const token = req.headers.authorization
            // console.log('token', token)

            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {

            }
            const singleRoom = await database.findOne(query, options)
            res.send(singleRoom)
        })

        app.post('/user', async (req, res) => {
            const guestDetails = req.body
            const result = await guestList.insertOne(guestDetails);
            res.send(result)
        })

        app.post('/room', async (req, res) => {
            const roomDetails = req.body
            const result = await database.insertOne(roomDetails);
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const bookings = req.body
            const result = await bookingList.insertOne(bookings);
            res.send(result)
        })


        app.delete('/deleteRooms', async (req, res) => {
            const id = req.query.id
            const query = { _id: new ObjectId(id) }
            const result = await database.deleteOne(query);
            res.send(result)
        })


        app.put('/updateRooms', async (req, res) => {
            const id = req.query.id;
            const updatedData = req.body;

            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedData.name,
                    prize: updatedData.price,
                    details: updatedData.details,
                    people: { adults: updatedData.people.adults, children: updatedData.people.children },
                    img: updatedData.image,
                },
            };
            const result = await database.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.post('/review', async (req, res) => {
            const review = req.body
            const email = review.email
            const productName = review.product

            const query = { email: email }
            const findDuplicateEmail = await reviewList.find(query).toArray()


            if (findDuplicateEmail) {
                const confirmingDuplicateReview = findDuplicateEmail.filter(duplicate => duplicate.product == productName)

                if (confirmingDuplicateReview.length > 0) {
                    res.send({ message: "you can't review more than one time" })
                    return
                }
            }

            const result = await reviewList.insertOne(review);
            res.send(result)
        })

        app.get('/review', async (req, res) => {
            const productName = req.query.product
            let query = {}
            if (productName) {
                query = { product: productName }
            }

            const singleRoom = await reviewList.find(query).toArray()
            res.send(singleRoom)
        })

        app.delete('/deleteReviews', async (req, res) => {
            const id = req.query.id
            const query = { _id: new ObjectId(id) }
            const result = await reviewList.deleteOne(query);
            res.send(result)
        })

        app.get('/bookings', async (req, res) => {
            const guestEmail = req.query.email
            let query = {}
            if (guestEmail) {
                query = { email: guestEmail }
            }
            const result = await bookingList.find(query).toArray()
            res.send(result)
        })

        app.get('/verifyAdmin', async (req, res) => {
            const adminEmail = req.query.email
            const query = { email: adminEmail }
            const result = await guestList.find(query).toArray()

            const confirmingAdmin = result.filter(duplicate => duplicate.admin == 'true')
            if (confirmingAdmin.length > 0) {
                res.send({ isAdmin: true })
                return
            }
            res.send({ isAdmin: false })
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            console.log(email, email)
            const token = jwt.sign({ email }, process.env.SECRET_KEY, { expiresIn: '1h' });
            res.send({ accessToken: token })
        })

    } finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})