import './app.css'

const { KintoneRestAPIClient } = require('@kintone/rest-api-client')

const ordersAppId = 34
const APP_ID = kintone.app.getId()
const manager = kintone.getLoginUser().code
let statusCheck = false
let yearMonth
let amountBefore

const client = new KintoneRestAPIClient({
  baseUrl: process.env.BASE_URL,
  auth: {
    name: process.env.USER_NAME,
    password: process.env.PASSWORD,
  },
})
async function updateAmount(query, deliveryAmount, category) {
  const resp = await client.record.getRecords({
    app: ordersAppId,
    query,
    fields: ['记录编号', '当月订单额', '当年订单累计', '当年退货累计', '年月'],
  }) 
  const recordsOut = []
  const recordsIn = []
  const { records } = resp
  if (records.length > 0) {
    for (let i = 0; i < records.length; i += 1) {
      recordsIn.push({
        id: records[i].记录编号.value,
        record: {
          当年退货累计: {
            value: Number(records[i].当年退货累计.value) + deliveryAmount,
          },
        },
      })
      if (yearMonth === records[i].年月.value) {
        recordsOut.push({
          id: records[i].记录编号.value,
          record: {
            当年订单累计: {
              value: Number(records[i].当年订单累计.value) + deliveryAmount,
            },
            当月订单额: {
              value: Number(records[i].当月订单额.value) + deliveryAmount,
            },
          },
        })
      } else
        recordsOut.push({
          id: records[i].记录编号.value,
          record: {
            当年订单累计: {
              value: Number(records[i].当年订单累计.value) + deliveryAmount,
            },
          },
        })
    }
    if (category === '销售订单') {
      client.record.updateRecords({
        app: ordersAppId,
        records: recordsOut,
      })
    } else
      client.record.updateRecords({
        app: ordersAppId,
        records: recordsIn,
      })
  }
}

kintone.events.on('app.record.detail.show', (event) => {
  const { record } = event
  const customerName = record.客户名称.value
  const region = record.区域.value
  const category = record.分类.value

  const deliveryAmount = Number(record.发货金额合计.value)

  const managers = []
  if (record.物流担当.value.length > 0) {
    for (let i = 0; i < record.物流担当.value.length; i += 1) {
      managers.push(record.物流担当.value[i].code)
    }
  }
  let yearMonths = []
  if (record.订货日期.value) {
    const month = record.订货日期.value.split('-')[1]
    yearMonth = record.订货日期.value.split('-', 2).join('')
    for (let i = Number(month); i > 0; i -= 1) {
      yearMonths.push(Number(yearMonth) - i + 1)
    }
    yearMonths = JSON.stringify(yearMonths)
    yearMonths = yearMonths.replace('[', '(')
    yearMonths = yearMonths.replace(']', ')')
  }

  if (record.状态.value === '出货中' || record.状态.value === '退货中') {
    statusCheck = true
  }
  if (statusCheck) {
    if (record.状态.value === '完成') {
      updateAmount(`年月 in ${yearMonths} and 客户= "${customerName}"`, deliveryAmount, category)
      updateAmount(`年月 in ${yearMonths} and 汇总区分 in ("全区域")`, deliveryAmount, category)
      updateAmount(`年月 in ${yearMonths} and 汇总区分 in ("各区域") and 地区= "${region}"`, deliveryAmount, category)
    }
  }
  if (
    record.修改前实际金额.value !== record.发货金额合计.value &&
    record.修改前实际金额.value.length > 0 &&
    managers.length > 0 &&
    managers.indexOf(manager) !== -1 &&
    record.状态.value === '完成'
  ) {
    const myContainer = document.querySelector('.gaia-app-statusbar-actionmenu-wrapper')
    myContainer.innerHTML = '<button id="update">更新</button>'
    const button = document.getElementById('update')
    button.addEventListener('click', () => {
      button.disabled = true
      const amount = Number(record.发货金额合计.value) - Number(record.修改前实际金额.value)
      updateAmount(`年月 in ${yearMonths} and 客户= "${customerName}"`, amount, category)
      updateAmount(`年月 in ${yearMonths} and 汇总区分 in ("全区域")`, amount, category)
      updateAmount(`年月 in ${yearMonths} and 汇总区分 in ("各区域") and 地区= "${region}"`, amount, category)
      client.record
        .updateRecord({
          app: APP_ID,
          id: record.记录编号.value,
          record: {
            修改前实际金额: {
              value: Number(record.发货金额合计.value),
            },
          },
        })
        .then(() => {
          window.location.reload()
        })
    })
  }
  return event
})

kintone.events.on(
  [
    'app.record.create.show',
    'app.record.edit.show',
    'app.record.create.change.订单明细',
    'app.record.edit.change.订单明细',
  ],
  (event) => {
    const { record, type } = event
    amountBefore = record.发货金额合计.value
    const table = record.订单明细.value
    const managers = []
    if (record.物流担当.value.length > 0) {
      for (let i = 0; i < record.物流担当.value.length; i += 1) {
        managers.push(record.物流担当.value[i].code)
      }
    }
    for (let i = 0; i < table.length; i += 1) {
      table[i].value.出货数量.disabled = true
    }

    if (type === 'app.record.edit.show' || type === 'app.record.edit.change.订单明细') {
      if (type === 'app.record.edit.show') {
        if (record.修改前实际金额.value.length === 0) {
          record.修改前实际金额.value = record.发货金额合计.value
        }
      }

      if (managers.length > 0 && managers.indexOf(manager) !== -1 && record.状态.value === '完成') {
        for (let i = 0; i < table.length; i += 1) {
          table[i].value.出货数量.disabled = false
        }
      }
    }

    return event
  },
)
kintone.events.on(['app.record.edit.submit'], (event) => {
  const { record } = event
  if (amountBefore !== record.发货金额合计.value) {
    record.修改前实际金额.value = record.发货金额合计.value
  }
})
