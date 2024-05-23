//Modules
const fs = require("fs");
const http = require("http");
const https = require("https");
const querystring = require("querystring");
const credentials = require("./auth/credentials.json");
//port server will listen
const port = 3000;
const server = http.createServer();
//give message when its listening
server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
    console.log(`Now Listening on Port ${port}`);
}
//handles incoming http requests
server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
    if(req.url === "/"){ //give form
        const form = fs.createReadStream("html/index.html");
        res.writeHead(200, {"Content-Type": "text/html"});
        form.pipe(res);
    }
    else if (req.url.startsWith("/search")){ //handle search requests
        const user_input = new URL(req.url, `http://${req.headers.host}`).searchParams;
        let type = user_input.get('type') || ''; //if empty string
        res.writeHead(200, {"Content-Type": "text/html"});
        get_activity(type.trim(), res);
    }
    else{
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end(`<h1>404 Not Found</h1>`);
    }
}
//get activity from BORED API
function get_activity(type, res){ //make url without a type
    const url = type ? `http://www.boredapi.com/api/activity?type=${querystring.escape(type)}` : `http://www.boredapi.com/api/activity`;
    http.get(url, apiRes => {
        let data = '';
        apiRes.on('data', chunk => data += chunk); //get the data 1 by 1
        apiRes.on('end', () => { //once all the data is recienved
            try {
                const activityData = JSON.parse(data);
                if (activityData.error || !activityData.activity) {
                    res.end(`<h1>No Activity Found for '${type}'</h1>`);
                    //no activity then do this
                } else {
                    //get gif related to activity
                    fetch_gif(activityData.activity, res);
                }
            } catch (e) {
                res.writeHead(500);
                res.end('Error processing the Bored API response');
            }
        });
    }).on('error', err => {
        console.error(`Error calling Bored API: ${err.message}`);
        res.writeHead(500);
        res.end('Failed to retrieve activity');
    });
}
//GIF API
function fetch_gif(activity, res){
    //api request with the activity as the search term
    const query = querystring.stringify({ q: activity, api_key: credentials["Authorization-Key"], limit: 1 });
    const url = `https://api.giphy.com/v1/gifs/search?${query}`;
    https.get(url, apiRes => {
        let data = '';
        apiRes.on('data', chunk => data += chunk); //get data one by one
        apiRes.on('end', () => {
            try {
                const gifData = JSON.parse(data);
                const imageUrl = gifData.data.length > 0 ? gifData.data[0].images.fixed_height.url : "https://via.placeholder.com/200";
                end(activity, imageUrl, res); //sends the final respond to the server saying we did it
            } catch (e) {
                res.writeHead(500);
                res.end('Error with Giphy API response');
            }
        });
    }).on('error', err => {
        console.error(`Error calling Giphy API: ${err.message}`);
        res.writeHead(500);
        res.end('Failed to retrieve GIF');
    });
}
// the end funtion after we completed so we can output the activity and corresponding gif
function end(activity, imageUrl, res){
    res.end(`
        <h1>Activity: ${activity}</h1>
        <img src="${imageUrl}" alt="Activity GIF"><br>
        <button onclick="window.location.href='/'">Back to Home</button>
    `);
}

