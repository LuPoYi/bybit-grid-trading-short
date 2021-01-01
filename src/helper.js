const { RestClient } = require('bybit-api')
const dotenv = require('dotenv')
const settings = require('../settings.json')
const { priceList, symbol, qty } = settings

dotenv.config()
const API_KEY = process.env.API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY
const restClient = new RestClient(API_KEY, PRIVATE_KEY)

const getNewOrderPriceAndSide = ({ price, side, priceList }) => {
  let isShouldPlaceNewOrder = false
  let newSide, newPriceIndex, newPrice
  if (side === 'Buy') {
    newSide = 'Sell'
    newPriceIndex = priceList.indexOf(price) - 1
  } else if (side === 'Sell') {
    newSide = 'Buy'
    newPriceIndex = priceList.indexOf(price) + 1
  }

  if (newPriceIndex >= 0 && newPriceIndex < priceList.length) {
    isShouldPlaceNewOrder = true
    newPrice = priceList[newPriceIndex]
  }

  return { isShouldPlaceNewOrder, newPrice, newSide }
}

const getShouldPlacePriceList = async ({ latestPrice }) => {
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
  let currentNoOrderPriceList = priceList.filter((p) => !bybitUnfilledPriceList.includes(p))

  const closestPrice = currentNoOrderPriceList.reduce(function (prev, curr) {
    return Math.abs(curr - latestPrice) < Math.abs(prev - latestPrice) ? curr : prev
  })

  return currentNoOrderPriceList.filter((price) => price !== closestPrice)
}

const getShouldPlacePosition = async () => {
  // Get bybit position
  let currentPosition = 0
  const positionResponse = await restClient.getPosition({ symbol: symbol })
  if (['None', 'Sell'].includes(positionResponse?.result?.side)) {
    currentPosition = positionResponse.result.size
  } else {
    throw `getPosition API fail or position is not Sell`
  }

  // Calculate `expectPosition` - from current buy order
  let expectPosition = 0
  const orderResponse = await restClient.queryActiveOrder({ symbol: symbol })
  for (const item of orderResponse.result) {
    if (
      item.order_status === 'New' &&
      item.qty === qty &&
      item.side === 'Buy' &&
      priceList.includes(parseFloat(item.price))
    ) {
      expectPosition += qty
    }
  }
  console.log('expectPosition', expectPosition, 'currentPosition', currentPosition)

  return expectPosition - currentPosition
}

module.exports = {
  getNewOrderPriceAndSide,
  getShouldPlacePriceList,
  getShouldPlacePosition,
}
