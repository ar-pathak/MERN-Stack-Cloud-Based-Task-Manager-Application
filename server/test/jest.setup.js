const shouldShowLogs = /^1|true$/i.test(String(process.env.SHOW_TEST_LOGS || "").trim());

if (!shouldShowLogs) {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
}
