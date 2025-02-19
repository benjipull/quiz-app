const axios = require('axios');
require('dotenv').config();

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

async function getImageForCategory(category) {
    try {
        const encodedCategory = encodeURIComponent(category);
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(encodedCategory)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1`;

        const response = await axios.get(url);
        if (response.data.results.length > 0) {
            return response.data.results[0].urls.small; // Return the first image URL
        } else {
            return null; // No images found
        }
    } catch (error) {
        console.error('Error fetching image from Unsplash:', error);
        return null;
    }
}

module.exports = getImageForCategory;
