import { supabase } from "../supabase/supabase";

export const fetchCategoriesByRegionAndDevice = async (c) => {
    const regionId = c.req.param('region_id');
    const deviceId = c.req.param('device_id');

    try {
        const { data: multipliers, error } = await supabase
            .from('ad_multipliers')
            .select('category_id')
            .eq('region_id', regionId)
            .eq('device_id', deviceId);

        if (error) {
            console.error('Error fetching multipliers:', error);
            return c.json({ error: 'Error fetching categories' }, 500);
        }

        const categoryIds = multipliers.map(item => item.category_id);

        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .in('id', categoryIds);

        if (categoriesError) {
            console.error('Error fetching categories:', categoriesError);
            return c.json({ error: 'Error fetching categories' }, 500);
        }

        return c.json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const fetchDeviceByCategory = async (c) => {
    const categoryId = c.req.param('category_id');

    try {
        const { data, error } = await supabase
            .from('ad_multipliers')
            .select('device_id')
            .eq('category_id', categoryId);

        if (error) {
            console.error('Error fetching devices:', error);
            return c.json({ error: 'Error fetching devices' }, 500);
        }

        const deviceIds = data.map((item) => item.device_id);

        const { data: devices, error: devicesError } = await supabase
            .from('devices')
            .select('*')
            .in('id', deviceIds);

        if (devicesError) {
            console.error('Error fetching devices:', devicesError);
            return c.json({ error: 'Error fetching devices' }, 500);
        }

        return c.json(devices);
    } catch (err) {
        console.error('Error fetching devices:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const calculateRevenue = async (c) => {
    const { region_id, category_id, device_id, mau } = await c.req.json();

    if (!region_id || !category_id || !device_id || !mau) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    try {
        // Fetch multiplier
        const { data, error } = await supabase
            .from('ad_multipliers')
            .select('multiplier')
            .eq('region_id', region_id)
            .eq('category_id', category_id)
            .eq('device_id', device_id)
            .single();

        if (error || !data) {
            return c.json({ error: 'Multiplier not found' }, 404);
        }

        const { multiplier } = data;
        const revenue = mau * multiplier;

        return c.json({ revenue });
    } catch (err) {
        console.error('Error  calculating revenue:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const fetchRegions = async (c) => {
    try {
        const { data, error } = await supabase
            .from('regions')
            .select('*');

        if (error) {
            console.error('Error fetching regions:', error);
            return c.json({ error: 'Error fetching regions' }, 500);
        }

        return c.json(data);
    } catch (err) {
        console.error('Error fetching regions:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const fetchTotalMultiplier = async (c) => {
    try {
        // Fetch all multipliers
        const { data: multipliers, error: multipliersError } = await supabase
            .from('ad_multipliers')
            .select('region_id, multiplier');

        if (multipliersError) {
            console.error('Error fetching multipliers:', multipliersError);
            return c.json({ error: 'Error fetching multipliers' }, 500);
        }

        // Fetch region names
        const regionIds = Array.from(new Set(multipliers.map(item => item.region_id)));
        const { data: regions, error: regionsError } = await supabase
            .from('regions')
            .select('id, name')
            .in('id', regionIds);

        if (regionsError) {
            console.error('Error fetching regions:', regionsError);
            return c.json({ error: 'Error fetching regions' }, 500);
        }

        // Aggregate multipliers by region
        const multiplierByRegion = multipliers.reduce((acc: any, item) => {
            if (!acc[item.region_id]) {
                acc[item.region_id] = 0;
            }
            acc[item.region_id] += item.multiplier;
            return acc;
        }, {});

        // Combine with region names
        const result = regions.map(region => ({
            region: region.name,
            total_multiplier: multiplierByRegion[region.id] || 0,
        }));

        return c.json(result);
    } catch (err) {
        console.error('Error fetching total multiplier by region:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const fetchCategoriesByRegion = async (c) => {
    try {
        // Fetch all multipliers to get category and region relationships
        const { data: multipliers, error: multipliersError } = await supabase
            .from('ad_multipliers')
            .select('region_id, category_id');

        if (multipliersError) {
            console.error('Error fetching multipliers:', multipliersError);
            return c.json({ error: 'Error fetching categories by region' }, 500);
        }

        // Fetch region names
        const regionIds = Array.from(new Set(multipliers.map(item => item.region_id)));
        const { data: regions, error: regionsError } = await supabase
            .from('regions')
            .select('id, name')
            .in('id', regionIds);

        if (regionsError) {
            console.error('Error fetching regions:', regionsError);
            return c.json({ error: 'Error fetching regions' }, 500);
        }

        // Fetch category names
        const categoryIds = Array.from(new Set(multipliers.map(item => item.category_id)));
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name')
            .in('id', categoryIds);

        if (categoriesError) {
            console.error('Error fetching categories:', categoriesError);
            return c.json({ error: 'Error fetching categories' }, 500);
        }

        // Map regions and their associated categories
        const categoriesByRegion = regions.map(region => {
            const regionCategories = multipliers
                .filter(item => item.region_id === region.id)
                .map(item => {
                    const category = categories.find(cat => cat.id === item.category_id);
                    return category ? category.name : null;
                })
                .filter(name => name !== null);

            return {
                region: region.name,
                categories: regionCategories
            };
        });

        return c.json(categoriesByRegion);
    } catch (err) {
        console.error('Error fetching categories by region:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const fetchRevenueByCategory = async (c) => {
    const { mau, platform } = c.req.query();

    if (!mau || !platform) {
        return c.json({ error: 'Missing required query parameters' }, 400);
    }

    try {
        const { data: multipliers, error } = await supabase
            .from('ad_multipliers')
            .select('region_id, category_id, multiplier')
            .eq('platform', platform);

        if (error) {
            console.error('Error fetching multipliers:', error);
            return c.json({ error: 'Error fetching revenue data' }, 500);
        }

        // Compute revenue
        const revenueByCategory = multipliers.map(item => ({
            region_id: item.region_id,
            category_id: item.category_id,
            revenue: mau * item.multiplier
        }));

        return c.json(revenueByCategory);
    } catch (err) {
        console.error('Error fetching revenue by category:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const getMAURequired = async (c) => {
    const { revenue, platform } = c.req.query();

    if (!revenue || !platform) {
        return c.json({ error: 'Missing required query parameters' }, 400);
    }

    try {
        const { data: multipliers, error } = await supabase
            .from('ad_multipliers')
            .select('region_id, category_id, multiplier')
            .eq('platform', platform);

        if (error) {
            console.error('Error fetching multipliers:', error);
            return c.json({ error: 'Error fetching MAU data' }, 500);
        }

        // Compute MAU required
        const mauRequired = multipliers.map(item => ({
            region_id: item.region_id,
            category_id: item.category_id,
            mau: revenue / item.multiplier
        }));

        return c.json(mauRequired);
    } catch (err) {
        console.error('Error fetching MAU required:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const getTopRegionsOrCategories = async (c) => {
    const { mau, dimension, platform } = c.req.query(); // dimension: 'region' or 'category'

    if (!mau || !dimension || !platform) {
        return c.json({ error: 'Missing required query parameters' }, 400);
    }

    try {
        const { data: multipliers, error } = await supabase
            .from('ad_multipliers')
            .select('region_id, category_id, multiplier')
            .eq('platform', platform);

        if (error) {
            console.error('Error fetching multipliers:', error);
            return c.json({ error: 'Error fetching top regions or categories' }, 500);
        }

        const revenueByDimension = multipliers.reduce((acc, item) => {
            const key = dimension === 'region' ? item.region_id : item.category_id;
            if (!acc[key]) {
                acc[key] = 0;
            }
            acc[key] += mau * item.multiplier;
            return acc;
        }, {});

        const topItems = Object.entries(revenueByDimension)
            .sort(([, a], [, b]) => b - a)
            .map(([key, revenue]) => ({ [dimension]: key, revenue }));

        return c.json(topItems);
    } catch (err) {
        console.error('Error fetching top regions or categories:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const getEfficientRegionsOrPlatforms = async (c) => {
    const { revenue, dimension, platform } = c.req.query(); // dimension: 'region' or 'platform'

    if (!revenue || !dimension || !platform) {
        return c.json({ error: 'Missing required query parameters' }, 400);
    }

    try {
        const { data: multipliers, error } = await supabase
            .from('ad_multipliers')
            .select('region_id, platform, multiplier')
            .eq('platform', platform);

        if (error) {
            console.error('Error fetching multipliers:', error);
            return c.json({ error: 'Error fetching efficient regions or platforms' }, 500);
        }

        const efficientItems = multipliers.map(item => ({
            [dimension]: item.region_id, // Adjust if dimension is 'platform'
            required_mau: revenue / item.multiplier
        }));

        return c.json(efficientItems);
    } catch (err) {
        console.error('Error fetching efficient regions or platforms:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const getRevenueGrowth = async (c) => {
    const { mau_ranges, dimension, platform } = c.req.query(); // dimension: 'region' or 'platform'

    if (!mau_ranges || !dimension || !platform) {
        return c.json({ error: 'Missing required query parameters' }, 400);
    }

    try {
        const rangeArray = mau_ranges.split(',').map(Number);
        const results = [];

        for (const mau of rangeArray) {
            const { data: multipliers, error } = await supabase
                .from('ad_multipliers')
                .select('region_id, category_id, multiplier')
                .eq('platform', platform);

            if (error) {
                console.error('Error fetching multipliers:', error);
                return c.json({ error: 'Error fetching revenue growth data' }, 500);
            }

            const growthData = multipliers.reduce((acc, item) => {
                const key = dimension === 'region' ? item.region_id : item.category_id;
                if (!acc[key]) {
                    acc[key] = 0;
                }
                acc[key] += mau * item.multiplier;
                return acc;
            }, {});

            results.push({ mau, data: growthData });
        }

        return c.json(results);
    } catch (err) {
        console.error('Error comparing revenue growth:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export const getUnderPerformingRegions = async (c) => {
    const { category, platform } = c.req.query();

    if (!category || !platform) {
        return c.json({ error: 'Missing required query parameters' }, 400);
    }

    try {
        const { data: multipliers, error } = await supabase
            .from('ad_multipliers')
            .select('region_id, platform, multiplier')
            .eq('platform', platform);

        if (error) {
            console.error('Error fetching multipliers:', error);
            return c.json({ error: 'Error fetching underperforming regions or platforms' }, 500);
        }

        const underperforming = multipliers.map(item => ({
            region_id: item.region_id,
            revenue_per_mau: item.multiplier
        }));

        return c.json(underperforming);
    } catch (err) {
        console.error('Error identifying underperforming regions or platforms:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}