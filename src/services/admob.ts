// services.js
import { supabase } from "../supabase/supabase";

export const fetchCategoriesByRegionAndDeviceService = async (regionId, deviceId) => {
    const { data: multipliers, error } = await supabase
        .from('ad_multipliers')
        .select('category_id')
        .eq('region_id', regionId)
        .eq('device_id', deviceId);

    if (error) {
        throw new Error('Error fetching categories');
    }

    const categoryIds = multipliers.map(item => item.category_id);

    const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .in('id', categoryIds);

    if (categoriesError) {
        throw new Error('Error fetching categories');
    }

    return categories;
};

export const fetchDeviceByCategoryService = async (categoryId) => {
    const { data, error } = await supabase
        .from('ad_multipliers')
        .select('device_id')
        .eq('category_id', categoryId);

    if (error) {
        throw new Error('Error fetching devices');
    }

    const deviceIds = data.map(item => item.device_id);

    const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .in('id', deviceIds);

    if (devicesError) {
        throw new Error('Error fetching devices');
    }

    return devices;
};

export const calculateRevenueService = async ({ region_id, category_id, device_id, mau }) => {
    const { data, error } = await supabase
        .from('ad_multipliers')
        .select('multiplier')
        .eq('region_id', region_id)
        .eq('category_id', category_id)
        .eq('device_id', device_id)
        .single();

    if (error || !data) {
        throw new Error('Multiplier not found');
    }

    const revenue = mau * data.multiplier;
    return revenue;
};

export const fetchRegionsService = async () => {
    const { data, error } = await supabase
        .from('regions')
        .select('*');

    if (error) {
        throw new Error('Error fetching regions');
    }

    return data;
};

export const fetchTotalMultiplierService = async () => {
    const { data: multipliers, error: multipliersError } = await supabase
        .from('ad_multipliers')
        .select('region_id, multiplier');

    if (multipliersError) {
        throw new Error('Error fetching multipliers');
    }

    const regionIds = Array.from(new Set(multipliers.map(item => item.region_id)));
    const { data: regions, error: regionsError } = await supabase
        .from('regions')
        .select('id, name')
        .in('id', regionIds);

    if (regionsError) {
        throw new Error('Error fetching regions');
    }

    const multiplierByRegion = multipliers.reduce((acc, item) => {
        if (!acc[item.region_id]) acc[item.region_id] = 0;
        acc[item.region_id] += item.multiplier;
        return acc;
    }, {});

    return regions.map(region => ({
        region: region.name,
        total_multiplier: multiplierByRegion[region.id] || 0,
    }));
};

export const fetchCategoriesByRegionService = async () => {
    const { data: multipliers, error: multipliersError } = await supabase
        .from('ad_multipliers')
        .select('region_id, category_id');

    if (multipliersError) {
        throw new Error('Error fetching multipliers');
    }

    const regionIds = Array.from(new Set(multipliers.map(item => item.region_id)));
    const { data: regions, error: regionsError } = await supabase
        .from('regions')
        .select('id, name')
        .in('id', regionIds);

    if (regionsError) {
        throw new Error('Error fetching regions');
    }

    const categoryIds = Array.from(new Set(multipliers.map(item => item.category_id)));
    const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds);

    if (categoriesError) {
        throw new Error('Error fetching categories');
    }

    return regions.map(region => ({
        region: region.name,
        categories: multipliers
            .filter(item => item.region_id === region.id)
            .map(item => categories.find(cat => cat.id === item.category_id)?.name)
            .filter(name => name !== null),
    }));
};

export const fetchRevenueByCategoryService = async (mau, platform) => {
    const { data: multipliers, error } = await supabase
        .from('ad_multipliers')
        .select('region_id, category_id, multiplier')
        .eq('platform', platform);

    if (error) {
        throw new Error('Error fetching revenue data');
    }

    return multipliers.map(item => ({
        region_id: item.region_id,
        category_id: item.category_id,
        revenue: mau * item.multiplier,
    }));
};

export const getMAURequiredService = async (revenue, platform) => {
    const { data: multipliers, error } = await supabase
        .from('ad_multipliers')
        .select('region_id, category_id, multiplier')
        .eq('platform', platform);

    if (error) {
        throw new Error('Error fetching MAU data');
    }

    return multipliers.map(item => ({
        region_id: item.region_id,
        category_id: item.category_id,
        mau: revenue / item.multiplier,
    }));
};

export const getTopRegionsOrCategoriesService = async (mau, dimension, platform) => {
    const { data: multipliers, error } = await supabase
        .from('ad_multipliers')
        .select('region_id, category_id, multiplier')
        .eq('platform', platform);

    if (error) {
        throw new Error('Error fetching top regions or categories');
    }

    const revenueByDimension = multipliers.reduce((acc, item) => {
        const key = dimension === 'region' ? item.region_id : item.category_id;
        if (!acc[key]) acc[key] = 0;
        acc[key] += mau * item.multiplier;
        return acc;
    }, {});

    return Object.entries(revenueByDimension)
        .sort(([, a], [, b]) => b - a)
        .map(([key, revenue]) => ({ [dimension]: key, revenue }));
};

export const getEfficientRegionsOrPlatformsService = async (revenue, dimension, platform) => {
    const { data: multipliers, error } = await supabase
        .from('ad_multipliers')
        .select('region_id, platform, multiplier')
        .eq('platform', platform);

    if (error) {
        throw new Error('Error fetching efficient regions or platforms');
    }

    return multipliers.map(item => ({
        [dimension]: item.region_id,
        required_mau: revenue / item.multiplier,
    }));
};

export const getRevenueGrowthService = async (mau_ranges, dimension, platform) => {
    const rangeArray = mau_ranges.split(',').map(Number);
    const results = [];

    for (const mau of rangeArray) {
        const { data: multipliers, error } = await supabase
            .from('ad_multipliers')
            .select('region_id, category_id, multiplier')
            .eq('platform', platform);

        if (error) {
            throw new Error('Error fetching multipliers');
        }

        const growthData = multipliers.reduce((acc, item) => {
            const key = dimension === 'region' ? item.region_id : item.category_id;
            if (!acc[key]) acc[key] = 0;
            acc[key] += mau * item.multiplier;
            return acc;
        }, {});

        results.push({ mau, data: growthData });
    }

    return results;
};

export const getUnderPerformingRegionsService = async (category, platform) => {
    const { data: multipliers, error } = await supabase
        .from('ad_multipliers')
        .select('region_id, platform, multiplier')
        .eq('platform', platform);

    if (error) {
        throw new Error('Error fetching underperforming regions or platforms');
    }

    return multipliers.map(item => ({
        region_id: item.region_id,
        revenue_per_mau: item.multiplier,
    }));
};
