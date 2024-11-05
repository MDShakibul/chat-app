import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();

//connect db
import './db/connection.js';

//import files
import Conversations from './models/Conversations.js';
import Users from './models/Users.js';
import Messages from './models/Messages.js';

//
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
const port = process.env.PORT || 5000;

//Routes
app.get('/', (req, res) => {
	res.send('Welcome');
});

app.post('/api/register', async (req, res) => {
	try {
		const { fullName, email, password } = req.body;

		if (!fullName || !email || !password) {
			return res
				.status(400)
				.json({ message: 'Please fill in all required fields' });
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

app.post('/api/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res
				.status(400)
				.json({ message: 'Please fill in all required fields' });
		}

		const user = await Users.findOne({ email });
		if (!user) {
			return res
				.status(400)
				.json({ message: 'User email or password is incorrect' });
		}

		const validateUser = await bcrypt.compare(password, user.password);
		if (!validateUser) {
			return res
				.status(400)
				.json({ message: 'User email or password is incorrect' });
		}

		const payload = {
			userId: user._id,
			email: user.email,
		};

		const JWT_SECRET_KEY =
			process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';
		jwt.sign(
			payload,
			JWT_SECRET_KEY,
			{ expiresIn: 84600 },
			async (err, token) => {
				if (err) {
					return res.status(500).json({ message: 'Token generation error' });
				}

				// Update the user record with the new token
				await Users.updateOne({ _id: user._id }, { $set: { token } });
				const { token: userToken, ...userInfo } = user.toObject();

				// Send user data and token in the response
				return res.status(200).json({
					user: userInfo,
					token,
				});
			}
		);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Server error' });
	}
});

app.post('/api/conversation', async (req, res) => {
	try {
		const { senderId, receiverId } = req.body;
		const newConversation = new Conversations({
			members: [senderId, receiverId],
		});
		await newConversation.save();
		res.status(200).json({ message: 'Conversation created successfully' });
	} catch (error) {
		console.error(error);
	}
});

app.get('/api/conversations/:userId', async (req, res) =>{
	try {
		const userId = req?.params?.userId;
		const conversations = await Conversations.find({members:{$in : [userId]}});

		const conversationUserData = Promise.all(conversations?.map(async(conversation) =>{
			const receiverId = conversation?.members.find(member => member !== userId);
			const user =  await Users.findById(receiverId);
			return {user: {email: user.email, fullName: user.fullName}, conversationId: conversation._id };
		}))

		res.status(200).json(await conversationUserData);
	} catch (error) {
		console.error(error);
	}
});

app.post('/api/message', async (req, res) =>{
	try {
		const {conversationId, senderId, message, receiverId =''}=req.body;

		if(!senderId || !message){
			return res.status(400).json({message: 'Please fill all required fields'})
		}
		if (!conversationId && receiverId) {
			const newConversation = new Conversations({
				members: [senderId, receiverId],
			});
			await newConversation.save();

			const newMessage = new Messages({conversationId: newConversation._id, senderId, message})
			await newMessage.save();
			return res.status(200).json({message: 'Message sent successfully'})
		}else if(!conversationId && !receiverId){
			return res.status(200).json({message: 'Please fill all required fields'})
		}

		const newMessage = new Messages({conversationId, senderId, message});
		await newMessage.save();
		res.status(200).json({message: 'Message sent successfully'});
	} catch (error) {
		console.error(error);
	}
})

app.get('/api/message/:conversationId', async (req, res) => {
	try {
		const conversationId = req.params.conversationId;

		if (conversationId === 'new') {
			return res.status(200).json([]);
		}
		const messages = await Messages.find({ conversationId });
		const messageUserData = await Promise.all(
			messages.map(async (message) => {
				const user = await Users.findById(message.senderId);
				return {
					user: { email: user.email, fullName: user.fullName },
					message: message.message
				};
			})
		);
		res.json(messageUserData); // Send the response back
	} catch (error) {
		console.error(error);
		res.status(500).send('Internal Server Error'); // Send an error response
	}
});

app.get('/api/users', async(req, res) =>{
	try {
		const users = await Users.find();
		const userData = await Promise.all(
			users.map(async (user) => {
				return {
					user: { email: user.email, fullName: user.fullName },
					userId: user?._id
				};
			})
		);
		res.status(200).json(userData);
	} catch (error) {
		console.error(error);
	}
})


app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
