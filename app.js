const express = require("express");
const bodyParser = require("body-parser");
const https = require('https');
const mongoose = require('mongoose');
const ejs = require("ejs");

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");


// Connect to MongoDB locally
mongoose.connect('mongodb://localhost:27017/quadb', { useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Database connected');
});


// model schema
const tickerSchema = new mongoose.Schema({
  base_unit: String,
  name: String,
  last: Number,
  volume: Number,
  sell: Number,
  buy: Number
});

// creating collection ticker
const Ticker = mongoose.model('Ticker', tickerSchema);

// Fetching data from API
https.get('https://api.wazirx.com/api/v2/tickers', (response) => {
  let data = '';
  
  response.on('data', (chunk) => {
    data += chunk;
  });
  
  response.on('end', () => {
    const tickerData = JSON.parse(data);
    // Map the ticker data to an array of Ticker model instances
    const tickers = Object.keys(tickerData).map((key) => {
      const ticker = new Ticker(tickerData[key]);
      ticker.base_unit = key;
      return ticker;
    });
    // Insert the tickers into the database
    Ticker.insertMany(tickers.slice(0, 10))
      .then(() => {
        console.log('Top 10 tickers inserted successfully!');
      })
      .catch((error) => {
        console.error(error);
      });
  });
  
}).on('error', (error) => {
  console.error(error);
});

app.get("/", function(req, res){
    Ticker.find({})
      .then((tickers) => {
         res.render("index.ejs", { tickers: tickers });
      })
      .catch((err) => {
        console.error(err);
        res.send("Error retrieving ticker data");
    });
});  
  

app.listen(3000, function(){
    console.log("Server is up and running!");
});