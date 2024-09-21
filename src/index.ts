import { createApp } from './loaders/appLoader';
import { createClient } from '@supabase/supabase-js';
import appRoutes from './routes/admob';

// Initialize Hono app
const app = createApp();

// Initialize Supabase client
const supabaseUrl = 'https://skotefhdkqtrmykssrxa.supabase.co';
const supabaseKey = 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS middleware function
const corsMiddleware = (c: any, next: any) => {
	c.res.headers.set('Access-Control-Allow-Origin', '*');
	c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');

	if (c.req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: c.res.headers });
	}

	return next();
};

// Apply CORS middleware
app.use(corsMiddleware);

// Use the routes from routes.ts
app.use('/', appRoutes);

export default app;