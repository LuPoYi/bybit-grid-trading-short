const { RestClient } = require('bybit-api')
const dotenv = require('dotenv')

const websocketSubscribe = require('./src/websocket')
const settings = require('./settings.json')
const { priceList, step, symbol, high, low, grids, totalQty, qty } = settings

dotenv.config()
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY
const restClient = new RestClient(API_KEY, PRIVATE_KEY)

const main = async () => {
  let currentPosition
  let currentNoOrderPriceList
  let shouldPlacePriceList

  // Get bybit latest price
  const latestInformationResponse = await restClient.getLatestInformation({ symbol: symbol })
  const latestPrice = latestInformationResponse?.['result']?.find((item) => item.symbol === symbol)
    ?.last_price
  console.log('Latest Price', latestPrice)

  // Get bybit current unfiled orders
  let bybitUnfilledPriceList = []
  const orderResponse = await restClient.queryActiveOrder({ symbol: symbol })
  for (const item of orderResponse?.result) {
    if (
      item.order_status === 'New' &&
      item.qty === qty &&
      priceList.includes(parseFloat(item.price))
    ) {
      bybitUnfilledPriceList.push(parseFloat(item.price))
    }
  }

  // Get price list of no order
  currentNoOrderPriceList = priceList.filter((p) => !bybitUnfilledPriceList.includes(p))

  const closestPrice = currentNoOrderPriceList.reduce(function (prev, curr) {
    return Math.abs(curr - latestPrice) < Math.abs(prev - latestPrice) ? curr : prev
  })
  console.log('currentNoOrderPriceList', currentNoOrderPriceList)

  // Find which prices should place new order
  shouldPlacePriceList = currentNoOrderPriceList.filter((price) => price !== closestPrice)
  console.log('shouldPlacePriceList', shouldPlacePriceList)

  // Place order
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
    await restClient.placeActiveOrder(params)
    console.log(`[IMP] Place Limit ${side} ${price} ${qty}`)
  }

  // do the market
  // Get bybit position
  const positionResponse = await restClient.getPosition({ symbol: symbol })
  if (['None', 'Sell'].includes(positionResponse?.result?.side)) {
    currentPosition = positionResponse.result.size
  } else {
    throw `getPosition API fail or position is not Sell`
  }

  let expectPosition = 0
  const orderResponse2 = await restClient.queryActiveOrder({ symbol: symbol })

  for (const item of orderResponse2?.result) {
    if (
      item.order_status === 'New' &&
      item.qty === qty &&
      item.side === 'Buy' &&
      priceList.includes(parseFloat(item.price))
    ) {
      expectPosition += qty
    }
  }

  if (expectPosition > currentPosition) {
    const marketQty = parseInt(expectPosition - currentPosition)
    console.log('marketQty', marketQty)
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
  console.log('expectPosition', expectPosition)
  console.log('currentPosition', currentPosition)
  console.log('priceList', priceList)

  // Final: After every order is placed, start websocket
  // websocketSubscribe({ key: API_KEY, secret: PRIVATE_KEY })
}

try {
  main()
} catch (e) {
  console.err('error', e)
}
