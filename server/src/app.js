const express = require('express')
require("dotenv").config();

const { userAuth } = require('./middleware/auth')
const connectDB = require('./config/database')

const User = require('./models/user')
const authRoutes = require('./modules/auth/auth.routes')



const app = express();
const port = 3000;


app.use(express.json())

app.use('/auth',authRoutes)


app.use('/', (err, req, res, next) => {
    if (err) {
        res.status(500).send("something went wrong");
    }
    res.send("Hello world");
})

connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log("DB connected successfully")
            console.log(`server are Listening on port ${port}`)
        })
    })
    .catch((err) => {
        console.log('MongoDb connection ERROR: ', err)
    })


