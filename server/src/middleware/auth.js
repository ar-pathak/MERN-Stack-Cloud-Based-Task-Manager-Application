const userAuth = (req, res, next) => {
    console.log(req.params)
    const token = "121";
    const isAuthorized = (token === req.params.id);
    (!isAuthorized ? res.status(400).send("Not Authorized") : next())
}

module.exports = { userAuth }