const express = require('express')
const cookieParser = require('cookie-parser')
require("dotenv").config();

const connectDB = require('./config/database')

const authRoutes = require('./modules/auth/auth.routes')
const workspaceRoutes = require('./modules/workspace/workspace.routes')
const tasksRoutes = require('./modules/tasks/tasks.routes')



const app = express();
const port = 3000;


app.use(express.json())
app.use(cookieParser())

app.use('/auth', authRoutes)
app.use('/workspaces', workspaceRoutes)
app.use('/tasks', tasksRoutes)

app.get("/user", (req, res) => {
    console.log(req.cookies)
    res.send("checking cookie..")
})


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


