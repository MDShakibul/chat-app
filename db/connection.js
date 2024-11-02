import mongoose from "mongoose";


const url = `mongodb+srv://shakib6610:BzpbcQa26QMY1LcA@cluster0.6h9zc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

mongoose.connect(url)
  .then(() => {
    console.log('Connected to DB');
  })
  .catch((error) => {
    console.error('DB connection error:', error);
  });