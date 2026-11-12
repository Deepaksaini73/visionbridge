import app from './app.js';
import { connectDatabase } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Attempt MongoDB connection; continues in resilient demo mode if MongoDB is offline
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` VisionBridge API Server is active`);
    console.log(` Port: ${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Error] Failed to launch VisionBridge server:', err);
  process.exit(1);
});

