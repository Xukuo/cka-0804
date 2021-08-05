import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import Search from './Search.vue'
import Address from './Address.vue'

const { KintoneRestAPIClient } = require('@kintone/rest-api-client')

const client = new KintoneRestAPIClient({
  baseUrl: process.env.BASE_URL,
  auth: {
    name: process.env.USER_NAME,
    password: process.env.PASSWORD,
  },
})
const ordersAppId = 34
const APP_ID = kintone.app.getId()
const manager = kintone.getLoginUser().code
// let statusCheck = false
let yearMonth
let yearMonths
let amountBefore

async function updateAmount(query, deliveryAmount, category) {
  try {
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
        return client.record.updateRecords({
          app: ordersAppId,
          records: recordsOut,
        })
      }
      return client.record.updateRecords({
        app: ordersAppId,
        records: recordsIn,
      })
    }
    return false
  } catch (e) {
    return false
  }
}

kintone.events.on('app.record.detail.show', (event) => {
  const { record } = event
  const customerName = record.客户名称.value
  const region = record.区域.value
  const category = record.分类.value

  const managers = []
  // 作用???
  if (manager === 'Administrator') {
    kintone.app.record.setFieldShown('其它客户', false)
    kintone.app.record.setFieldShown('固定减折扣', false)
    kintone.app.record.setFieldShown('零售价', false)
  }

  if (record.物流担当.value.length > 0) {
    for (let i = 0; i < record.物流担当.value.length; i += 1) {
      managers.push(record.物流担当.value[i].code)
    }
  }
  yearMonths = []
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
    button.addEventListener('click', async () => {
      button.disabled = true
      const amount = Number(record.发货金额合计.value) - Number(record.修改前实际金额.value)
      const resp1 = await updateAmount(`年月 in ${yearMonths} and 客户= "${customerName}"`, amount, category)
      const resp2 = await updateAmount(`年月 in ${yearMonths} and 汇总区分 in ("全区域")`, amount, category)
      const resp3 = await updateAmount(
        `年月 in ${yearMonths} and 汇总区分 in ("各区域") and 地区= "${region}"`,
        amount,
        category,
      )
      if (resp1 && resp2 && resp3) {
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
      } else button.disabled = false
    })
  }
  return event
})

kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
  const { record, type } = event
  amountBefore = record.发货金额合计.value
  const table = record.订单明细.value
  const managers = []
  record.订货日期.disabled = true
  record.物流担当.disabled = false
  if (manager === 'Administrator') {
    kintone.app.record.setFieldShown('其它客户', false)
    kintone.app.record.setFieldShown('固定减折扣', false)
    kintone.app.record.setFieldShown('零售价', false)
  }

  if (record.物流担当.value.length > 0) {
    for (let i = 0; i < record.物流担当.value.length; i += 1) {
      managers.push(record.物流担当.value[i].code)
    }
  }
  for (let i = 0; i < table.length; i += 1) {
    table[i].value.出货数量.disabled = true
  }

  if (type === 'app.record.edit.show') {
    if (record.修改前实际金额.value.length === 0) {
      record.修改前实际金额.value = record.发货金额合计.value
    }
    if (record.状态.value !== '未处理') {
      record.订货编号.disabled = true
      record.分类.disabled = true
      record.申请人.disabled = true
      record.物流担当.disabled = true
      record.客户名称.disabled = true
      record.其它客户.disabled = true
      record.客户交货期.disabled = true
      record.收货人.disabled = true
      record.电话.disabled = true
      record.订货员.disabled = true
      record.送货地址.disabled = true
      record.品牌.disabled = true
      record.固定减折扣.disabled = true
      record.调整折扣.disabled = true
      record.附件.disabled = true
      for (let i = 0; i < table.length; i += 1) {
        table[i].value.品名搜选.disabled = true
        table[i].value.订单数量.disabled = true
        table[i].value.减折扣额.disabled = true
      }
      setTimeout(() => {
        $('table:eq(0)')
          .find('.add-row-image-gaia')
          .each((i, v) => {
            $(v).css('display', 'none')
          })
        $('table:eq(0)')
          .find('.remove-row-image-gaia')
          .each((i, v) => {
            $(v).css('display', 'none')
          })
      }, 100)
    }
  }
  if (managers.length > 0 && managers.indexOf(manager) !== -1 && record.状态.value === '完成') {
    for (let i = 0; i < table.length; i += 1) {
      table[i].value.出货数量.disabled = false
    }
  }
  if (type === 'app.record.create.show' || (type === 'app.record.edit.show' && record.状态.value === '未处理')) {
    const batchContainer = kintone.app.record.getSpaceElement('batch')
    const addressContainer = kintone.app.record.getSpaceElement('address')
    Vue.config.productionTip = false
    Vue.prototype.$kintone = kintone
    Vue.prototype.$client = client
    Vue.prototype.$record = record
    Vue.prototype.$type = type
    Vue.use(ElementUI)
    new Vue({
      render: (h) => h(Search),
    }).$mount(batchContainer)
    new Vue({
      render: (h) => h(Address),
    }).$mount(addressContainer)
  }

  return event
})

kintone.events.on('app.record.edit.submit', (event) => {
  const { record } = event
  if (amountBefore !== record.发货金额合计.value) {
    record.修改前实际金额.value = record.发货金额合计.value
  }
})

kintone.events.on('app.record.detail.process.proceed', async (event) => {
  const { record } = event
  const customerName = record.客户名称.value
  const region = record.区域.value
  const category = record.分类.value

  const deliveryAmount = Number(record.发货金额合计.value)
  if (event.action.value === '提交') {
    const time = new Date()
    const currentTime = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`
    record.订货日期.value = currentTime
  }
  if (event.nextStatus.value === '完成') {
    const resp1 = await updateAmount(`年月 in ${yearMonths} and 客户= "${customerName}"`, deliveryAmount, category)
    const resp2 = await updateAmount(`年月 in ${yearMonths} and 汇总区分 in ("全区域")`, deliveryAmount, category)
    const resp3 = await updateAmount(
      `年月 in ${yearMonths} and 汇总区分 in ("各区域") and 地区= "${region}"`,
      deliveryAmount,
      category,
    )
    if (resp1 && resp2 && resp3) {
      return event
    }
    return false
  }
  return event
})

kintone.events.on('app.record.print.show', (event) => {
  if (manager === 'Administrator') {
    kintone.app.record.setFieldShown('其它客户', false)
    kintone.app.record.setFieldShown('固定减折扣', false)
    kintone.app.record.setFieldShown('零售价', false)
  }
  return event
})

kintone.events.on(['app.record.create.change.订单数量', 'app.record.edit.change.订单数量'], (event) => {
  const { row } = event.changes
  if (row.value.订单数量.value < 0) {
    // eslint-disable-next-line no-alert
    window.alert('订单数量不能为负数')
    return false
  }
  row.value.出货数量.value = row.value.订单数量.value

  return event
})

kintone.events.on(['app.record.create.change.订单明细', 'app.record.edit.change.订单明细'], (event) => {
  const { record, type } = event
  const table = record.订单明细.value
  for (let i = 0; i < table.length; i += 1) {
    if (
      type === 'app.record.create.change.订单明细' ||
      (type === 'app.record.edit.change.订单明细' && record.状态.value === '未处理')
    ) {
      table[i].value.出货数量.disabled = true
    }
  }

  return event
})
