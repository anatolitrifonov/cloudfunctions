const http = require('http');

http
.request(
  {
    hostname: "neverssl.com",
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
