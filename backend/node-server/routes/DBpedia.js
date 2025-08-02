const express = require("express");

const router = express.Router();

/**
 * Fetch detailed information from DBpedia.
 * @param {string} topic - The topic to search for.
 * @returns {Promise<object>} - Returns an object with details from DBpedia.
 */
async function fetchDBpediaDetails(topic) {
    const endpoint = "http://dbpedia.org/sparql";

    // Encode topic properly for SPARQL
    const formattedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    const query = `
        PREFIX dbo: <http://dbpedia.org/ontology/>
        PREFIX dbp: <http://dbpedia.org/property/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        
        SELECT ?abstract ?thumbnail ?wikiPage
        WHERE {
            ?subject rdfs:label "${formattedTopic}"@en .
            OPTIONAL { ?subject dbo:abstract ?abstract . FILTER (lang(?abstract) = 'en') }
            OPTIONAL { ?subject dbo:thumbnail ?thumbnail }
            OPTIONAL { ?subject foaf:isPrimaryTopicOf ?wikiPage }
        }
        LIMIT 1
    `;

    const url = `${endpoint}?query=${encodeURIComponent(query)}&format=json`;

    try {
        console.log("🔍 Fetching DBpedia Data:", url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`DBpedia returned ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.results.bindings.length) {
            return { error: "No data found for this topic." };
        }

        const result = data.results.bindings[0];

        return {
            topic: formattedTopic,
            abstract: result.abstract?.value || "No summary available.",
            image: result.thumbnail?.value || null,
            wikiPage: result.wikiPage?.value || `https://en.wikipedia.org/wiki/${formattedTopic.replace(/ /g, "_")}`
        };
    } catch (error) {
        console.error("❌ DBpedia Fetch Error:", error);
        return { error: `Failed to fetch data from DBpedia: ${error.message}` };
    }
}

// **📌 GET Route to Fetch Data from DBpedia**
router.get("/:topic", async (req, res) => {
    try {
        const topic = req.params.topic;
        if (!topic) {
            return res.status(400).json({ error: "Topic parameter is required." });
        }

        const data = await fetchDBpediaDetails(topic);
        res.status(200).json(data);
    } catch (error) {
        console.error("❌ Error Fetching DBpedia Data:", error.message);
        res.status(500).json({ error: "Server error fetching DBpedia data" });
    }
});

module.exports = router;
