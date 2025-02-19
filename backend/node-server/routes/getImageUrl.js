const express = require('express');
const router = express.Router();
const getImageForCategory = require('../utils/fetchImage');

router.get('/', async (req, res) => {
    try {
        const { description } = req.query; // Get the category name from the query parameter

        if (!description) {
            return res.status(400).json({ message: 'Description is required' });
        }

        const imageUrl = await getImageForCategory(description);

        if (imageUrl) {
            return res.json({ description, imageUrl });
        } else {
            return res.status(404).json({ message: 'No image found' });
        }
    } catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
