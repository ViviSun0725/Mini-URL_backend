import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './src/routes/auth.js';
import urlsRoutes from './src/routes/urls.js';
import pageRoutes from './src/routes/page.js';
import redirectRoutes from './src/routes/redirect.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(express.json());
app.use(helmet());

app.use(cors({
  origin: allowedOrigins
}));

app.use('/api/auth', authRoutes);
app.use('/api/urls', urlsRoutes);
app.use('/api/page', pageRoutes);
app.use('/', redirectRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Server Error');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;