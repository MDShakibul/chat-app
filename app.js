import express from 'express';
const app = express();
import bcrypt from 'bcrypt';

//connect db
import './db/connection.js';

//import files
import Users from './models/Users.js';

//
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const port = process.env.PORT || 5000;

//Routes
app.get('/', (req, res) => {
	res.send('Welcome');
});

app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        const isAlreadyExist = await Users.findOne({ email });
        if (isAlreadyExist) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create a new user object with fullName and email
        const newUser = new Users({ fullName, email });

        // Hash the password and set it on the new user object
        bcrypt.hash(password, 10, async (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ message: 'Error hashing password' });
            }

            newUser.password = hashedPassword; // Set the hashed password
            await newUser.save(); // Save the user to the database

            return res.status(200).json({ message: 'User registered successfully' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/* app.post('', async()=>{
    try{
        const {email, p}
    }catch(error){
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}) */

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
