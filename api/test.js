module.exports = function handler(req, res) {
  res.status(200).json({ 
    message: 'API routes are working',
    method: req.method,
    query: req.query,
    timestamp: new Date().toISOString()
  });
}
