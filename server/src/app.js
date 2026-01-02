const express = require('express')
const cookieParser = require('cookie-parser')
require("dotenv").config();

const connectDB = require('./config/database')

const authRoutes = require('./modules/auth/auth.routes')
const workspaceRoutes = require('./modules/workspace/workspace.routes')
const teamsRoutes = require('./modules/team/teams.routes')
const projectsRoutes = require('./modules/projects/project.routes')
const tasksRoutes = require('./modules/tasks/tasks.routes')
const usersRoutes = require('./modules/user/user.routes')



const app = express();
const port = 3000;


app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/workspaces', workspaceRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/user', usersRoutes)

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


