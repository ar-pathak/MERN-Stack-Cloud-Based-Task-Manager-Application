const assert = require("node:assert/strict");

const { getCookieOptions } = require("../../src/helpers/cookieHelper");

const withEnv = (envValues, run) => {
    const previousValues = {};
    Object.keys(envValues).forEach((key) => {
        previousValues[key] = process.env[key];
        const nextValue = envValues[key];
        if (nextValue == null) {
            delete process.env[key];
        } else {
            process.env[key] = String(nextValue);
        }
    });

    try {
        run();
    } finally {
        Object.keys(envValues).forEach((key) => {
            if (previousValues[key] == null) {
                delete process.env[key];
            } else {
                process.env[key] = previousValues[key];
            }
        });
    }
};

test("forces secure cookies when sameSite is none", () => {
    withEnv(
        {
            NODE_ENV: "development",
            COOKIE_SECURE: "false",
            COOKIE_SAME_SITE: "none",
            COOKIE_DOMAIN: null
        },
        () => {
            const options = getCookieOptions();
            assert.equal(options.sameSite, "none");
            assert.equal(options.secure, true);
            assert.equal(options.httpOnly, true);
            assert.equal(options.domain, undefined);
        }
    );
});

test("applies cookie domain override and production secure default", () => {
    withEnv(
        {
            NODE_ENV: "production",
            COOKIE_SECURE: null,
            COOKIE_SAME_SITE: "strict",
            COOKIE_DOMAIN: ".example.com"
        },
        () => {
            const options = getCookieOptions();
            assert.equal(options.sameSite, "strict");
            assert.equal(options.secure, true);
            assert.equal(options.domain, ".example.com");
            assert.equal(options.httpOnly, true);
        }
    );
});
