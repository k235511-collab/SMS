const handler = require('./dist/vercel').default;

const mockReq = {
    method: 'GET',
    url: '/api/v1/resources',
    headers: { host: 'localhost' }
};

const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
        this.headers[key] = value;
    },
    getHeader(key) {
        return this.headers[key];
    },
    end(chunk) {
        console.log('Response ended with:', chunk ? chunk.toString() : 'no content', 'Status:', this.statusCode);
        process.exit(0);
    },
    json(data) {
        console.log('Response json:', data);
        process.exit(0);
    },
    send(data) {
        console.log('Response send:', data);
        process.exit(0);
    },
    on(event, cb) {
        console.log('Registered event:', event);
    },
    once(event, cb) {
        console.log('Registered once event:', event);
    },
    emit(event, ...args) {
        console.log('Emitted event:', event);
    }
};

async function test() {
    try {
        console.log('Invoking handler...');
        await handler(mockReq, mockRes);
    } catch (err) {
        console.error('Handler crashed:', err);
        process.exit(1);
    }
}

test();
