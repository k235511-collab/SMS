module.exports = function (options, webpack) {
    const isVercel = process.env.BUILD_TARGET === 'vercel' || process.env.VERCEL === '1';

    if (isVercel) {
        return {
            ...options,
            entry: ['./src/vercel.ts'],
            output: {
                filename: 'vercel.js',
                library: {
                    type: 'commonjs2',
                },
            },
            externals: {
                '@prisma/client': 'commonjs @prisma/client'
            },
        };
    }

    // Standard NestJS local build
    return options;
};
