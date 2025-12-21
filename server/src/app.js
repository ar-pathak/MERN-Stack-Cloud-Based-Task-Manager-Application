const express = require('express')
require("dotenv").config();

const { userAuth } = require('./middleware/auth')
const connectDB = require('./config/database')


const app = express();
const port = 3000;

app.get('/hello/:id', userAuth, (req, res) => {
    res.status(200).json({ "success": true })
})


connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`server are Listening on port ${port}`)
            console.log("DB connected successfully")
        })
    })

app.use('/', (err, req, res, next) => {
    if (err) {
        res.status(500).send("something went wrong");
    }
    res.send("Hello world");
})