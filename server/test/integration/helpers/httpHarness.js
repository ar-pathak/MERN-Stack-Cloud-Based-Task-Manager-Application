const { httpServer, io } = require("../../../src/app");

const startHttpServer = async () => {
    if (!httpServer.listening) {
        await new Promise((resolve) => {
            httpServer.listen(0, "127.0.0.1", resolve);
        });
    }

    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) {
        throw new Error("Failed to start HTTP server for integration tests");
    }

    return `http://127.0.0.1:${port}`;
};

const stopHttpServer = async () => {
    await new Promise((resolve) => io.close(resolve));
    if (httpServer.listening) {
        await new Promise((resolve) => httpServer.close(resolve));
    }
};

const requestJson = async (baseUrl, route, options = {}) => {
    const response = await fetch(`${baseUrl}${route}`, options);
    const body = await response.json();
    return { response, body };
};

module.exports = {
    startHttpServer,
    stopHttpServer,
    requestJson
};
