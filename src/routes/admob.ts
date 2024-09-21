import { Hono } from 'hono';
import {
    calculateRevenue,
    fetchCategoriesByRegion,
    fetchCategoriesByRegionAndDevice,
    fetchDeviceByCategory,
    fetchRegions,
    fetchRevenueByCategory,
    fetchTotalMultiplier,
    getEfficientRegionsOrPlatforms,
    getMAURequired,
    getRevenueGrowth,
    getTopRegionsOrCategories,
    getUnderPerformingRegions
} from '../controllers/admob';

// Create a new Hono instance for routes
const app = new Hono();

// Endpoint for fetching categories by region and device
app.get('/categories/:region_id/:device_id', fetchCategoriesByRegionAndDevice);

// Endpoint for fetching devices by category
app.get('/devices/:category_id', fetchDeviceByCategory);

// Endpoint for calculating revenue
app.post('/calculate-revenue', calculateRevenue);

// Endpoint for fetching regions
app.get('/regions', fetchRegions);

app.get('/total-multiplier-by-region', fetchTotalMultiplier);

// Endpoint for fetching categories by region
app.get('/categories-by-region', fetchCategoriesByRegion);

// Revenue Variation Across Categories for a Specified MAU
app.get('/revenue-by-category', fetchRevenueByCategory);

// MAU Required to Reach a Certain Revenue
app.get('/mau-required', getMAURequired);

// Top Regions or Categories by Revenue
app.get('/top-regions-or-categories', getTopRegionsOrCategories);

// Regions/Platforms Requiring Less MAU for Significant Revenue
app.get('/efficient-regions-or-platforms', getEfficientRegionsOrPlatforms);

// Compare Revenue Growth Across Regions and Platforms
app.get('/revenue-growth', getRevenueGrowth);

// Underperforming Regions or Platforms
app.get('/underperforming-regions-or-platforms', getUnderPerformingRegions);

export default app;