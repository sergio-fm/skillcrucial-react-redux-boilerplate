/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import axios from 'axios'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'

import cookieParser from 'cookie-parser'
import Html from '../client/html'

let connections = []

const port = process.env.PORT || 8080
const server = express()
const { readFile, writeFile, unlink } = require('fs').promises
// stat,

const saveFile = (users) => {
  writeFile(`${__dirname}/test.json`, JSON.stringify(users), { encoding: 'utf8' })
}

const ownReadFile = async () => {
  return readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => JSON.parse(data))
    .catch(async () => {
      const { data: users } = await axios('https://jsonplaceholder.typicode.com/users')
      await saveFile(users)
      return users
    })
}

server.use(cors())

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())

server.use((req, res, next) => {
  res.set('x-skillcrucial-user', '5e20b979-5408-4285-9b32-2b5234fee420')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
})

server.get('/api/v1/users/', async (req, res) => {
  const users = await ownReadFile()
  res.json(users)
})

server.post('/api/v1/users/', async (req, res) => {
  let temp = {}
  await readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => {
      temp = JSON.parse(data)
      temp = [...temp, { id: temp[temp.length - 1].id + 1 }]
    })
    .catch(() => {
      temp = { id: 1 }
      return temp
    })
  await saveFile(temp)
  res.json({ status: 'success' })
})

// patch /api/v1/users/:userId - дополняет юзера в users.json с id равным userId и возвращает { status: 'success', id: userId }
// delete /api/v1/users/:userId - удаляет юзера в users.json с id равным userId и возвращает { status: 'success', id: userId }

server.delete('/api/v1/users/:userId', async (req, res) => {
  const { userId } = req.params
  let temp = {}
  await readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => {
      temp = JSON.parse(data).filter((it) => it.id !== +userId)
    })
    .catch(() => {})
  await saveFile(temp)
  res.json({ status: 'success', id: userId })
})

server.patch('/api/v1/users/:userId', async (req, res) => {
  const { userId } = req.params
  let temp = {}
  await readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => {
      temp = JSON.parse(data)
      temp = [...temp, { id: +userId }]
    })
    .catch(() => {
      temp = { id: +userId }
      return temp
    })
  await saveFile(temp)
  res.json({ status: 'success', id: userId })
})

server.delete('/api/v1/users/', async (req, res) => {
  await unlink(`${__dirname}/test.json`)
  res.json({ status: 'File deleted' })
})

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
