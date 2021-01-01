const { RestClient } = require('bybit-api')
const dotenv = require('dotenv')

const websocketSubscribe = require('./src/websocket')
const settings = require('./settings.json')
const { priceList, symbol, qty } = settings

const {
  getShouldPlacePriceList,
  getShouldPlacePosition,
  areYouSureQuestion,
} = require('./src/helper')
// TODO: check available balance is enougth
// TODO: test api key first

dotenv.config()
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY
const useLivenet = process.env.LIVENET === 'true'

const main = async () => {
  console.log('API_KEY', API_KEY)
  console.log('PRIVATE_KEY', PRIVATE_KEY)
  console.log('useLivenet', useLivenet)
  console.log('symbol', symbol)
  console.log('priceList', priceList)
  const restClient = new RestClient(API_KEY, PRIVATE_KEY, useLivenet)

  const ans = await areYouSureQuestion()
  if (ans !== 'Y') {
    process.exit()
  }

  // Get bybit latest price
  const latestInformationResponse = await restClient.getLatestInformation({ symbol: symbol })
  const latestPrice = latestInformationResponse?.['result']?.find((item) => item.symbol === symbol)
    ?.last_price
  console.log('Latest Price', latestPrice)

  // Place Limit order
  const shouldPlacePriceList = await getShouldPlacePriceList({
    restClient: restClient,
    latestPrice: latestPrice,
    priceList: priceList,
    symbol: symbol,
    qty: qty,
  })

  for (const price of shouldPlacePriceList) {
    const side = price > latestPrice ? 'Sell' : 'Buy'
    const params = {
      side: side,
      symbol: symbol,
      order_type: 'Limit',
      qty: qty,
      price: price,
      reduce_only: false,
      time_in_force: 'GoodTillCancel',
    }
    const result = await restClient.placeActiveOrder(params)
    console.log(`[IMP] Place Limit ${side} ${price}`)
  }

  // Place makret order (position)
  const shouldPlacePosition = await getShouldPlacePosition({
    restClient: restClient,
    priceList: priceList,
    symbol: symbol,
    qty: qty,
  })
  if (shouldPlacePosition > 0) {
    const marketQty = parseInt(shouldPlacePosition)
    const params = {
      side: 'Sell',
      symbol: symbol,
      order_type: 'Market',
      qty: marketQty,
      time_in_force: 'GoodTillCancel',
    }
    console.log('qty', qty)
    await restClient.placeActiveOrder(params)
    console.log(`[IMP] Place Market ${marketQty}`)
  }
  console.log('priceList', priceList)

  // Final: After every order is placed, start websocket
  websocketSubscribe({
    key: API_KEY,
    secret: PRIVATE_KEY,
    priceList: priceList,
    livenet: useLivenet,
  })
}

try {
  main()
} catch (e) {
  console.err('error', e)
}
