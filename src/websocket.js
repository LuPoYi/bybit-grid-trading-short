const { WebsocketClient, RestClient, DefaultLogger } = require('bybit-api')
const { getNewOrderPriceAndSide } = require('./helper')

const websocketSubscribe = ({ key, secret, priceList }) => {
  console.log('Websocket', 'Subscribe!')
  DefaultLogger.silly = () => {}

  const restClient = new RestClient(key, secret)
  const ws = new WebsocketClient({ key, secret }, DefaultLogger)

  ws.subscribe(['order'])

  ws.on('open', function () {
    console.log('websocket open')
  })

  ws.on('update', async function (message) {
    switch (message?.topic) {
      case 'order': {
        for (const data of message?.data) {
          let { symbol, side, price, qty, order_status } = data
          price = parseFloat(price)
          if (
            order_status !== 'Filled' ||
            !['Buy', 'Sell'].includes(side) ||
            !priceList.includes(price)
          ) {
            continue
          }

          const { isShouldPlaceNewOrder, newPrice, newSide } = getNewOrderPriceAndSide({
            price,
            side,
            priceList,
          })

          if (isShouldPlaceNewOrder) {
            // check bybit order
            const orderResponse = await restClient.queryActiveOrder({ symbol: symbol })
            const isPriceExistInBybit = !!orderResponse?.result.find(
              (order) => parseFloat(order.price) === newPrice
            )
            if (isPriceExistInBybit) {
              console.log('!!!isPriceExistInBybit', price, newPrice)
              continue
            }

            // place order
            const params = {
              side: newSide,
              symbol: symbol,
              order_type: 'Limit',
              qty: qty,
              price: newPrice,
              reduce_only: false,
              time_in_force: 'GoodTillCancel',
            }
            await restClient.placeActiveOrder(params)
            console.log(`[IMP] Place Limit ${newSide} ${newPrice} - from ${side} ${price}`)
          }
        }
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
