const http = require('http');

// function returns a Promise
function getPromise() {
	return new Promise((resolve, reject) => {
		http.get('http://usefulangle.com/post/356/javascript-detect-element-added-to-dom', (response) => {
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
    console.log('error');
		console.log(error);
	}
}

console.log(1);

// anonymous async function to execute some code synchronously after http request
(async function () {
	// wait to http request to finish
	await makeSynchronousRequest();
	
	// below code will be executed after http request is finished
	console.log(2);
})();

console.log(3);
