import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const dBURL = process.env.MONGODB_URL_CUSTOMERS;


const mongoURI = dBURL;
mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log(err));

app.use(cors());
app.use(bodyParser.json());

const adminEmail = 'hope@gmail.com';
const adminPassword = 'Hope@123';

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    });
};

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    referenceId: { type: String, required: true },
    place: { type: String, required: true },
    mobile: { type: String, required: true },
    customerID: { type: String, required: true, unique: true },
});

const Customer = mongoose.model('CData', customerSchema, 'CData');

// Function to generate unique customerID
const generateCustomerID = async () => {
    let customerID;
    let isUnique = false;

    while (!isUnique) {
        // Generate a random 10-digit number
        const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000);
        customerID = `SS${randomNumber}`;

        // Check if the generated customerID already exists in the database
        const existingCustomer = await Customer.findOne({ customerID });
        if (!existingCustomer) {
            isUnique = true;
        }
    }

    return customerID;
};

// Admin Login
app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;

    if (email === adminEmail && password === adminPassword) {
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ message: 'Login successful', token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Admin User Add
app.post('/admin/adduser', async (req, res) => {
    try {
        const { name, referenceId, place, mobile } = req.body;

        if (!name || !referenceId || !place || !mobile) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Generate a unique customerID
        const customerID = await generateCustomerID();

        const newCustomer = new Customer({
            name,
            referenceId,
            place,
            mobile,
            customerID,  // Add the unique customerID
        });

        await newCustomer.save();

        res.status(200).json({ message: 'Customer added successfully', customer: newCustomer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin Sheet - Get all customers
app.get('/admin/sheet', authenticateJWT, async (req, res) => {
    try {
        const customers = await Customer.find();

        res.status(200).json({ message: 'Customers data fetched successfully', customers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
