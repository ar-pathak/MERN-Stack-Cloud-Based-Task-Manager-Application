const express = require('express')

const { userAuth } = require('./middleware/auth')


const app = express();
const port = 3000;

app.get('/hello/:id', userAuth, (req, res) => {
    res.status(200).json({ "success": true })
})

app.use('/', (err, req, res, next) => {
    if (err) {
        res.status(500).send("something went wrong");
    }
    res.send("Hello world");
})


app.listen(port, () => {
    console.log(`server are Listening on port ${port}`)
})
