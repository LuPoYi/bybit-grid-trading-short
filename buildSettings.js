// #20201223_ETHUSD_580_680_8cu8j8 ETHUSD Sell 580->680 Step:2 Grids:51 Qty:10 Total Qty:510
const inquirer = require('inquirer')
const fs = require('fs')

const gridTradingInquirerPrompt = [
  {
    type: 'rawlist',
    name: 'symbol',
    message: 'Which Pair?',
    choices: ['BTCUSD', 'ETHUSD'],
    default: 0,
  },
  {
    type: 'input',
    name: 'high',
    message: 'High?',
    default: 30000,
  },
  {
    type: 'input',
    name: 'low',
    message: 'Low?',
    default: 100,
  },
  {
    type: 'input',
    name: 'grids',
    message: 'How many grids?',
    default: 31,
  },
  {
    type: 'input',
    name: 'totalQty',
    message: 'Total Qty(USD)?',
    default: 300,
  },
]

const buildGridTradingSettings = ({ symbol, high, low, grids, totalQty }) => {
  totalQty = parseInt(totalQty)
  grids = parseInt(grids)
  high = parseFloat(high)
  low = parseFloat(low)

  let minStep
  if (symbol === 'BTCUSD') {
    minStep = 0.5
  } else if (symbol === 'ETHUSD') {
    minStep = 0.05
  }

  let priceList = []
  const qty = parseInt(totalQty / grids)
  const step = parseFloat(parseFloat((high - low) / (grids - 1)).toFixed(2))

  for (let i = 0; i < grids; i++) {
    // 599.48 => 599.45
    // 598.79 => 598.75
    // 604.31 => 604.30
    let price = high - step * i
    price = parseFloat(parseFloat(parseInt(price / minStep) * minStep).toFixed(2))

    priceList.push(price)
  }
  return {
    priceList,
    step,
    symbol,
    high,
    low,
    grids,
    totalQty,
    qty,
  }
}

const buildSetting = async () => {
  const answers = await inquirer.prompt(gridTradingInquirerPrompt)
  const gridTradingSettings = buildGridTradingSettings(answers)

  let data = JSON.stringify(gridTradingSettings)
  fs.writeFileSync('settings.json', data)
  console.log('Build settings.json Done', data)
}

buildSetting()
