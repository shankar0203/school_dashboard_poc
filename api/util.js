// wraps an async route so thrown errors reach the error handler
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { h };
