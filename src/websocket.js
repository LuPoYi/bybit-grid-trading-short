const { WebsocketClient, DefaultLogger } = require('bybit-api')

const websocketSubscribe = ({ key, secret }) => {
  console.log('Websocket', 'Subscribe!')

  DefaultLogger.silly = () => {}

  const ws = new WebsocketClient({ key, secret }, DefaultLogger)

  ws.subscribe(['order'])

  ws.on('open', function () {
    console.log('websocket open')
  })

  ws.on('update', function (message) {
    switch (message?.topic) {
      case 'order': {
        console.log('[order] ', message)
        break
      }
      default:
    }
  })

  ws.on('response', function (response) {
    console.log('[websocket] response', response)
  })

  ws.on('close', function () {
    console.log('[websocket] connection closed')
  })

  ws.on('error', function (err) {
    console.error('[websocket] ERR', err)
  })
}

module.exports = websocketSubscribe
