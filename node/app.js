const express = require('express')
const http = require('http');

const app = express()
const port = 3000

app.get('/', (req, res) => {


  // wait to http request to finish
	await makeSynchronousRequest();  


  res.send('Hello  555555 World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


// async function to make http request
async function makeSynchronousRequest(request) {
	try {
		let http_promise = getPromise();
		let response_body = await http_promise;

		// holds response from server that is passed when Promise is resolved
		console.log(response_body);
	}
	catch(error) {
		// Promise rejected
		console.log(error);
	}
}


// function returns a Promise
function getPromise() {
	return new Promise((resolve, reject) => {
		http.get('https://usefulangle.com/post/170/nodejs-synchronous-http-request', (response) => {
			let chunks_of_data = [];

			response.on('data', (fragments) => {
				chunks_of_data.push(fragments);
			});

			response.on('end', () => {
				let response_body = Buffer.concat(chunks_of_data);
				resolve(response_body.toString());
			});

			response.on('error', (error) => {
				reject(error);
			});
		});
	});
}