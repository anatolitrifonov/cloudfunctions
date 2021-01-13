const express = require('express')
const http = require('http')

const app = express()
const port = 3000

app.get('/', (req, res) => {

	http
  .request(
    {
	  hostname: "localhost",
	  port: 8080,
      path: "/"
    },
    res => {
      let data = ""

      res.on("data", d => {
        data += d
      })
      res.on("end", () => {
        console.log(data)
      })
    }
  )
  .end()


  res.send('Hello  555555 World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
