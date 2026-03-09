const normalizeEnvValue = (value) => String(value || "").trim();

const isTruthyEnvValue = (value) => /^(1|true|yes|on)$/i.test(normalizeEnvValue(value));

const hasMongoUrl = Boolean(normalizeEnvValue(process.env.MONGO_URL));
const runDbIntegrationTests = isTruthyEnvValue(process.env.RUN_DB_INTEGRATION_TESTS);
const isDbIntegrationEnabled = runDbIntegrationTests && hasMongoUrl;
const testWithDb = isDbIntegrationEnabled ? test : test.skip;

module.exports = {
    hasMongoUrl,
    runDbIntegrationTests,
    isDbIntegrationEnabled,
    testWithDb
};
