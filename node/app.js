const express = require('express');
const http = require('http');
const https = require('https');

const app = express()
const port = 3000

app.get('/', (req, res) => {

  // Sample URL 
  const url = 'https://us-central1-nvvservice.cloudfunctions.net/test-function'; 
  
  console.log('test');

  const request = https.request(url, (response) => { 
    let data = ''; 
    response.on('data', (chunk) => { 
      data = data + chunk.toString(); 
    }); 
  
    response.on('end', () => { 
      console.log(data); 
    }); 
  }) 
  
  request.on('error', (error) => { 
    console.log('An error', error); 
  }); 
  
  request.end() 
  

  res.send('Hello  555555 World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
