const vercelModule = require('../dist/vercel');

function resolveHandler(mod) {
    if (typeof mod === 'function') return mod;
    if (mod && typeof mod.default === 'function') return mod.default;
    if (mod && typeof mod.handler === 'function') return mod.handler;
    return null;
}

const handler = resolveHandler(vercelModule);

module.exports = async function (req, res) {
    return new Promise(async (resolve, reject) => {
        // Ensure Vercel waits for Express to finish the response
        res.once('finish', resolve);
        res.once('error', reject);

        try {
            if (typeof handler !== 'function') {
                throw new TypeError('Resolved Vercel handler is not a function')
            }

            await handler(req, res);
} catch (err) {
            console.error("BOOTSTRAP ERROR:", err);

            // Mask the password in the connection string if it exists
            const dbUrl = (process.env.DATABASE_URL || "NOT_SET");
            const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');

            // Send clean JSON payload based on environment
            if (process.env.NODE_ENV === 'production') {
                // Production: Generic error message only
                res.status(500).json({
                    error: "Internal Server Error",
                    message: "Something went wrong. Please try again later."
                });
            } else {
                // Non-production: Include debug information
                res.status(500).json({
                    error: "NestJS Bootstrap Initialization Failed",
                    message: err.message || String(err),
                    stack: err.stack,
                    debug_database_url: maskedDbUrl
                });
            }

            // Resolve the promise so Vercel doesn't mark it as a thrown error
            resolve();
        }
    });
};
