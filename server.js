require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE, // Ensure this matches 'bullwork_mobility_db'
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        // In a production environment, you might want to exit the process here
        // process.exit(1);
    } else {
        console.log('PostgreSQL connected successfully at:', res.rows[0].now);
    }
});

// Middleware
app.use(cors()); // Enable CORS for all origins (for development)
app.use(express.json()); // Parse JSON request bodies

// --- General API Routes ---

/**
 * @route GET /
 * @desc Welcome message for the API
 * @access Public
 */
app.get('/', (req, res) => {
    res.send('Welcome to Bullwork Mobility Backend API!');
});

// --- CRUD Operations for Blogs ---

/**
 * @route GET /api/blogs
 * @desc Get all blog posts
 * @access Public
 */
app.get("/api/blogs", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM blogs ORDER BY publication_date DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching blogs:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/blogs/:id
 * @desc Get a single blog post by ID
 * @access Public
 */
app.get("/api/blogs/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching blog:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/blogs
 * @desc Create a new blog post
 * @access Public (No authentication required)
 */
app.post("/api/blogs", async (req, res) => {
    const { title, slug, content, author, image_url, video_url, tags } = req.body;
    if (!title || !slug || !content || !author) {
        return res.status(400).json({ error: "Missing required fields: title, slug, content, author" });
    }

    try {
        const result = await pool.query(
            'INSERT INTO blogs (title, slug, content, author, image_url, video_url, tags) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, slug, content, author, image_url, video_url, tags]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating blog:', err.message);
        if (err.code === '23505') { // PostgreSQL unique violation error code
            return res.status(409).json({ error: 'Blog with this slug already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/blogs/:id
 * @desc Update an existing blog post
 * @access Public (No authentication required)
 */
app.put("/api/blogs/:id", async (req, res) => {
    const { id } = req.params;
    const { title, slug, content, author, image_url, video_url, tags } = req.body;

    try {
        const result = await pool.query(
            'UPDATE blogs SET title = $1, slug = $2, content = $3, author = $4, image_url = $5, video_url = $6, tags = $7 WHERE id = $8 RETURNING *',
            [title, slug, content, author, image_url, video_url, tags, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating blog:', err.message);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Blog with this slug already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route DELETE /api/blogs/:id
 * @desc Delete a blog post
 * @access Public (No authentication required)
 */
app.delete("/api/blogs/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM blogs WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json({ message: 'Blog deleted successfully', deletedBlog: result.rows[0] });
    } catch (err) {
        console.error('Error deleting blog:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- CRUD Operations for Products ---

/**
 * @route GET /api/products
 * @desc Get all products
 * @access Public
 */
app.get("/api/products", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching products:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/products/:id
 * @desc Get a single product by ID
 * @access Public
 */
app.get("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching product:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/products
 * @desc Create a new product
 * @access Public (No authentication required)
 */
app.post("/api/products", async (req, res) => {
    const { name, tagline, description, price, main_image_url, image_urls, video_url, category, features_text, tco_savings_text, tco_savings_image_url, specifications, related_products_ids } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Missing required field: name" });
    }
    try {
        const result = await pool.query(
            'INSERT INTO products (name, tagline, description, price, main_image_url, image_urls, video_url, category, features_text, tco_savings_text, tco_savings_image_url, specifications, related_products_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
            [name, tagline, description, price, main_image_url, image_urls, video_url, category, features_text, tco_savings_text, tco_savings_image_url, specifications, related_products_ids]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating product:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/products/:id
 * @desc Update an existing product
 * @access Public (No authentication required)
 */
app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const { name, tagline, description, price, main_image_url, image_urls, video_url, category, features_text, tco_savings_text, tco_savings_image_url, specifications, related_products_ids } = req.body;
    try {
        const result = await pool.query(
            'UPDATE products SET name = $1, tagline = $2, description = $3, price = $4, main_image_url = $5, image_urls = $6, video_url = $7, category = $8, features_text = $9, tco_savings_text = $10, tco_savings_image_url = $11, specifications = $12, related_products_ids = $13 WHERE id = $14 RETURNING *',
            [name, tagline, description, price, main_image_url, image_urls, video_url, category, features_text, tco_savings_text, tco_savings_image_url, specifications, related_products_ids, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating product:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route DELETE /api/products/:id
 * @desc Delete a product
 * @access Public (No authentication required)
 */
app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully', deletedProduct: result.rows[0] });
    } catch (err) {
        console.error('Error deleting product:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- CRUD Operations for QNA ---

/**
 * @route GET /api/qna
 * @desc Get all Q&A entries
 * @access Public
 */
app.get("/api/qna", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM qna ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching Q&A:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/qna/:id
 * @desc Get a single Q&A entry by ID
 * @access Public
 */
app.get("/api/qna/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM qna WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Q&A entry not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching Q&A entry:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/qna
 * @desc Create a new Q&A entry
 * @access Public (No authentication required)
 */
app.post("/api/qna", async (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) {
        return res.status(400).json({ error: "Missing required fields: question, answer" });
    }
    try {
        const result = await pool.query(
            'INSERT INTO qna (question, answer) VALUES ($1, $2) RETURNING *',
            [question, answer]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating Q&A entry:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/qna/:id
 * @desc Update an existing Q&A entry
 * @access Public (No authentication required)
 */
app.put("/api/qna/:id", async (req, res) => {
    const { id } = req.params;
    const { question, answer } = req.body;
    try {
        const result = await pool.query(
            'UPDATE qna SET question = $1, answer = $2 WHERE id = $3 RETURNING *',
            [question, answer, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Q&A entry not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating Q&A entry:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route DELETE /api/qna/:id
 * @desc Delete a Q&A entry
 * @access Public (No authentication required)
 */
app.delete("/api/qna/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM qna WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Q&A entry not found' });
        }
        res.json({ message: 'Q&A entry deleted successfully', deletedQna: result.rows[0] });
    } catch (err) {
        console.error('Error deleting Q&A entry:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- CRUD Operations for Awards ---

/**
 * @route GET /api/awards
 * @desc Get all awards
 * @access Public
 */
app.get("/api/awards", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM awards ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching awards:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/awards/:id
 * @desc Get a single award by ID
 * @access Public
 */
app.get("/api/awards/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM awards WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Award not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching award:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/awards
 * @desc Create a new award entry
 * @access Public (No authentication required)
 */
app.post("/api/awards", async (req, res) => {
    const { image_url } = req.body;
    if (!image_url) {
        return res.status(400).json({ error: "Missing required field: image_url" });
    }
    try {
        const result = await pool.query(
            'INSERT INTO awards (image_url) VALUES ($1) RETURNING *',
            [image_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating award:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/awards/:id
 * @desc Update an existing award entry
 * @access Public (No authentication required)
 */
app.put("/api/awards/:id", async (req, res) => {
    const { id } = req.params;
    const { image_url } = req.body;
    try {
        const result = await pool.query(
            'UPDATE awards SET image_url = $1 WHERE id = $2 RETURNING *',
            [image_url, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Award not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating award:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route DELETE /api/awards/:id
 * @desc Delete an award entry
 * @access Public (No authentication required)
 */
app.delete("/api/awards/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM awards WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Award not found' });
        }
        res.json({ message: 'Award deleted successfully', deletedAward: result.rows[0] });
    } catch (err) {
        console.error('Error deleting award:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- CRUD Operations for Media ---

/**
 * @route GET /api/media
 * @desc Get all media entries
 * @access Public
 */
app.get("/api/media", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM media ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching media:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/media/:id
 * @desc Get a single media entry by ID
 * @access Public
 */
app.get("/api/media/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM media WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Media entry not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching media entry:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/media
 * @desc Create a new media entry
 * @access Public (No authentication required)
 */
app.post("/api/media", async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: "Missing required field: url" });
    }
    try {
        const result = await pool.query(
            'INSERT INTO media (url) VALUES ($1) RETURNING *',
            [url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating media entry:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/media/:id
 * @desc Update an existing media entry
 * @access Public (No authentication required)
 */
app.put("/api/media/:id", async (req, res) => {
    const { id } = req.params;
    const { url } = req.body;
    try {
        const result = await pool.query(
            'UPDATE media SET url = $1 WHERE id = $2 RETURNING *',
            [url, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Media entry not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating media entry:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route DELETE /api/media/:id
 * @desc Delete a media entry
 * @access Public (No authentication required)
 */
app.delete("/api/media/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM media WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Media entry not found' });
        }
        res.json({ message: 'Media entry deleted successfully', deletedMedia: result.rows[0] });
    } catch (err) {
        console.error('Error deleting media entry:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- API for Requests (Demo and Order Forms) ---

/**
 * @route GET /api/requests
 * @desc Get all requests (demos and orders)
 * @access Public (for demonstration; implement authentication in production)
 */
app.get("/api/requests", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM requests ORDER BY request_date DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching requests:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/requests/:id
 * @desc Get a single request by ID
 * @access Public (for demonstration; implement authentication in production)
 */
app.get("/api/requests/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching request:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/requests
 * @desc Create a new demo or order request
 * @access Public (No authentication required)
 */
app.post("/api/requests", async (req, res) => {
    const {
        request_type, product_name, full_name, email, phone_number,
        company_name, address, country, state, city, pincode,
        aadhar_number, pan_number, message, quantity
    } = req.body;

    // Basic validation for required fields
    if (!request_type || !full_name || !email || !phone_number) {
        return res.status(400).json({ error: "Missing required fields: request_type, full_name, email, phone_number" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO requests (
                request_type, product_name, full_name, email, phone_number,
                company_name, address, country, state, city, pincode,
                aadhar_number, pan_number, message, quantity
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                request_type, product_name, full_name, email, phone_number,
                company_name, address, country, state, city, pincode,
                aadhar_number, pan_number, message, quantity
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating request:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/requests/:id
 * @desc Update an existing request
 * @access Public (for demonstration; implement authentication in production)
 */
app.put("/api/requests/:id", async (req, res) => {
    const { id } = req.params;
    const {
        request_type, product_name, full_name, email, phone_number,
        company_name, address, country, state, city, pincode,
        aadhar_number, pan_number, message, quantity, status
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE requests SET
                request_type = $1, product_name = $2, full_name = $3, email = $4, phone_number = $5,
                company_name = $6, address = $7, country = $8, state = $9, city = $10, pincode = $11,
                aadhar_number = $12, pan_number = $13, message = $14, quantity = $15, status = $16
            WHERE id = $17
            RETURNING *`,
            [
                request_type, product_name, full_name, email, phone_number,
                company_name, address, country, state, city, pincode,
                aadhar_number, pan_number, message, quantity, status,
                id
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating request:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route DELETE /api/requests/:id
 * @desc Delete a request
 * @access Public (for demonstration; implement authentication in production)
 */
app.delete("/api/requests/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM requests WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }
        res.json({ message: 'Request deleted successfully', deletedRequest: result.rows[0] });
    } catch (err) {
        console.error('Error deleting request:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- CRUD Operations for Apply Table ---

/**
 * @route GET /api/apply
 * @desc Get all job applications
 * @access Public
 */
app.get("/api/apply", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM apply ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching applications:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/apply/:id
 * @desc Get a single job application by ID
 * @access Public
 */
app.get("/api/apply/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM apply WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching application:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/apply
 * @desc Create a new job application
 * @access Public (No authentication required)
 */
app.post("/api/apply", async (req, res) => {
    const { name, email, position } = req.body; // Added 'position'
    if (!name || !email) { // 'position' is optional for now, adjust if needed
        return res.status(400).json({ error: "Missing required fields: name, email" });
    }
    try {
        const result = await pool.query(
            'INSERT INTO apply (name, email, position) VALUES ($1, $2, $3) RETURNING *', // Added 'position'
            [name, email, position] // Added 'position'
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating application:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/apply/:id
 * @desc Update an existing job application
 * @access Public (No authentication required)
 */
app.put("/api/apply/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, position } = req.body; // Added 'position'
    if (!name || !email) {
        return res.status(400).json({ error: "Missing required fields: name, email" });
    }
    try {
        const result = await pool.query(
            'UPDATE apply SET name = $1, email = $2, position = $3 WHERE id = $4 RETURNING *', // Added 'position'
            [name, email, position, id] // Added 'position'
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating application:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route DELETE /api/apply/:id
 * @desc Delete a job application
 * @access Public (No authentication required)
 */
app.delete("/api/apply/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM apply WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json({ message: 'Application deleted successfully', deletedApplication: result.rows[0] });
    } catch (err) {
        console.error('Error deleting application:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- CRUD Operations for Subscribe Table ---

/**
 * @route GET /api/subscribe
 * @desc Get all newsletter subscriptions
 * @access Public
 */
app.get("/api/subscribe", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM subscribe ORDER BY subscribed_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching subscriptions:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/subscribe/:id
 * @desc Get a single newsletter subscription by ID
 * @access Public
 */
app.get("/api/subscribe/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM subscribe WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching subscription:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route POST /api/subscribe
 * @desc Create a new newsletter subscription
 * @access Public (No authentication required)
 */
app.post("/api/subscribe", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Missing required field: email" });
    }
    try {
        const result = await pool.query(
            'INSERT INTO subscribe (email) VALUES ($1) RETURNING *',
            [email]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating subscription:', err.message);
        if (err.code === '23505') { // PostgreSQL unique violation error code for duplicate email
            return res.status(409).json({ error: 'This email is already subscribed' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/subscribe/:id
 * @desc Update an existing newsletter subscription
 * @access Public (No authentication required)
 */
app.put("/api/subscribe/:id", async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Missing required field: email" });
    }
    try {
        const result = await pool.query(
            'UPDATE subscribe SET email = $1 WHERE id = $2 RETURNING *',
            [email, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating subscription:', err.message);
        if (err.code === '23505') { // PostgreSQL unique violation error code for duplicate email
            return res.status(409).json({ error: 'This email is already subscribed to another entry' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route DELETE /api/subscribe/:id
 * @desc Delete a newsletter subscription
 * @access Public (No authentication required)
 */
app.delete("/api/subscribe/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM subscribe WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        res.json({ message: 'Subscription deleted successfully', deletedSubscription: result.rows[0] });
    } catch (err) {
        console.error('Error deleting subscription:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});


// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
