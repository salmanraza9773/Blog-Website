const app = require('./app');
const { initDB } = require('./db');

const PORT = process.env.PORT || 3000;

// Initialize DB and start HTTP server
async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
