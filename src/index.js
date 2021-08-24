const ordersAppId = 34
const APP_ID = kintone.app.getId()
const manager = kintone.getLoginUser().code
let month
let yearMonth
let yearMonths
let amountBefore

kintone.events.on('app.record.detail.show', (event) => {
  const { record } = event
  const customerName = record.客户名称.value
  const region = record.区域.value
  const category = record.分类.value

  const managers = []

  if (record.物流担当.value.length > 0) {
    for (let i = 0; i < record.物流担当.value.length; i += 1) {
      managers.push(record.物流担当.value[i].code)
    }
  }
  yearMonths = []
  if (record.订货日期.value) {
    const [, m] = record.订货日期.value.split('-')
    month = m
    yearMonth = record.订货日期.value.split('-', 2).join('')
    console.log(yearMonth)
    if (month === '01') {
      yearMonths.push(Number(yearMonth))
    } else {
      yearMonths.push(Number(yearMonth))
      yearMonths.push(Number(yearMonth) - 1)
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
      return kintone
        .api('/k/v1/records', 'GET', {
          app: ordersAppId,
          // query: `年月 in ${yearMonths} and 客户= "${customerName}" or 年月 in ${yearMonths} and 汇总区分 in ("全区域") or 年月 in ${yearMonths} and 汇总区分 in ("各区域") and 地区= "${region}"`,
          query: `年月 in ${yearMonths} and 客户= "${customerName}" or 年月 in ${yearMonths} and 汇总区分 in ("全区域") or 年月 in ${yearMonths} and 汇总区分 in ("各区域") and 地区= "${region}"`,
          fields: ['记录编号', '当月订单额', '当年订单累计', '当年退货累计', '年月', '汇总区分'],
        })
        .then((resp1) => {
          console.log(resp1)
          // const recordsOut = []
          // const recordsIn = []
          const { records } = resp1

          let recordCustomerPrev
          let recordSingleRegionPrev
          let recordAllRegionPrev
          if (month !== '01') {
            recordCustomerPrev = records.find((item) => {
              return item.年月.value === (Number(yearMonth) - 1).toString() && item.汇总区分.value === '客户'
            })
            recordSingleRegionPrev = records.find((item) => {
              return item.年月.value === (Number(yearMonth) - 1).toString() && item.汇总区分.value === '各区域'
            })
            recordAllRegionPrev = records.find((item) => {
              return item.年月.value === (Number(yearMonth) - 1).toString() && item.汇总区分.value === '全区域'
            })
          }
          const recordCustomer = records.find((item) => {
            return item.年月.value === yearMonth && item.汇总区分.value === '客户'
          })
          const recordSingleRegion = records.find((item) => {
            return item.年月.value === yearMonth && item.汇总区分.value === '各区域'
          })
          const recordAllRegion = records.find((item) => {
            return item.年月.value === yearMonth && item.汇总区分.value === '全区域'
          })
          const sumYearCustomerOut =
            month === '01' ? recordCustomer.当年订单累计.value : recordCustomerPrev.当年订单累计.value
          const sumYearSingleRegionOut =
            month === '01' ? recordSingleRegion.当年订单累计.value : recordSingleRegionPrev.当年订单累计.value
          const sumYearAllRegionOut =
            month === '01' ? recordAllRegion.当年订单累计.value : recordAllRegionPrev.当年订单累计.value
          const sumYearCustomerIn =
            month === '01' ? recordCustomer.当年退货累计.value : recordCustomerPrev.当年退货累计.value
          const sumYearSingleRegionIn =
            month === '01' ? recordSingleRegion.当年退货累计.value : recordSingleRegionPrev.当年退货累计.value
          const sumYearAllRegionIn =
            month === '01' ? recordAllRegion.当年退货累计.value : recordAllRegionPrev.当年退货累计.value
          const recordsIn = [
            {
              id: recordCustomer.记录编号.value,
              record: {
                当年退货累计: {
                  value: Number(sumYearCustomerIn) + amount,
                },
              },
            },
            {
              id: recordSingleRegion.记录编号.value,
              record: {
                当年退货累计: {
                  value: Number(sumYearSingleRegionIn) + amount,
                },
              },
            },
            {
              id: recordAllRegion.记录编号.value,
              record: {
                当年退货累计: {
                  value: Number(sumYearAllRegionIn) + amount,
                },
              },
            },
          ]
          const recordsOut = [
            {
              id: recordCustomer.记录编号.value,
              record: {
                当年订单累计: {
                  value: Number(sumYearCustomerOut) + Number(recordCustomer.当月订单额.value) + amount,
                },
                当月订单额: {
                  value: Number(recordCustomer.当月订单额.value) + amount,
                },
              },
            },
            {
              id: recordSingleRegion.记录编号.value,
              record: {
                当年订单累计: {
                  value: Number(sumYearSingleRegionOut) + Number(recordSingleRegion.当月订单额.value) + amount,
                },
                当月订单额: {
                  value: Number(recordSingleRegion.当月订单额.value) + amount,
                },
              },
            },
            {
              id: recordAllRegion.记录编号.value,
              record: {
                当年订单累计: {
                  value: Number(sumYearAllRegionOut) + Number(recordAllRegion.当月订单额.value) + amount,
                },
                当月订单额: {
                  value: Number(recordAllRegion.当月订单额.value) + amount,
                },
              },
            },
          ]
          const recordsUpdate = category === '销售订单' ? recordsOut : recordsIn
          console.log(recordsUpdate)
          // 第二次调用API
          return kintone.api('/k/v1/records', 'PUT', {
            app: ordersAppId,
            records: recordsUpdate,
          })
        })
        .then(() => {
          return kintone.api('/k/v1/record', 'PUT', {
            app: APP_ID,
            id: record.记录编号.value,
            record: {
              修改前实际金额: {
                value: Number(record.发货金额合计.value),
              },
            },
          })
        })
        .then(() => {
          button.style.display = 'none'
          return event
        })
        .catch((e) => {
          // 在执行API之前发送诸如参数错误等错误时
          button.disabled = false
          alert(e.message)

          return event
        })
        .finally(() => {
          // window.location.reload()
        })
    })
  }
  return event
})

kintone.events.on('app.record.create.show', (event) => {
  const { record } = event
  record.订货日期.disabled = true
  record.物流担当.disabled = false
  const el = kintone.app.record.getSpaceElement('rcvAddr')
  el.style.padding = '30px 0 0 0'
  const btnEl = document.createElement('select')
  btnEl.id = 'receivingAddress'
  btnEl.style.width = '200px'
  btnEl.style.height = '40px'
  el.appendChild(btnEl)
  $('#receivingAddress').append('<option value="-1">请选择收货地址</option>')
})

kintone.events.on('app.record.edit.show', (event) => {
  const { record } = event
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
  if (record.状态.value === '完成') {
    if (record.修改前实际金额.value.length === 0) {
      record.修改前实际金额.value = record.发货金额合计.value
    }
  }

  if (record.状态.value !== '未处理') {
    for (let i = 0; i < record.length; i += 1) {
      record[i].disabled = true
    }
    // record.订货编号.disabled = true
    // record.分类.disabled = true
    // record.申请人.disabled = true
    // record.物流担当.disabled = true
    // record.客户名称.disabled = true
    // record.其它客户.disabled = true
    // record.客户交货期.disabled = true
    // record.收货人.disabled = true
    // record.电话.disabled = true
    // record.订货员.disabled = true
    // record.送货地址.disabled = true
    // record.品牌.disabled = true
    // record.固定减折扣.disabled = true
    // record.调整折扣.disabled = true
    // record.附件.disabled = true
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
  if (record.状态.value === '未处理') {
    const el = kintone.app.record.getSpaceElement('rcvAddr')
    el.style.padding = '30px 0 0 0'
    const btnEl = document.createElement('select')
    btnEl.id = 'receivingAddress'
    btnEl.style.width = '200px'
    btnEl.style.height = '40px'
    el.appendChild(btnEl)
    $('#receivingAddress').append('<option value="-1">请选择收货地址</option>')

    let optionStr = ''

    const body = {
      app: 30, // 代理商应用appID
      id: record['代理商记录编号'].value,
    }

    kintone.api(
      kintone.api.url('/k/v1/record', true),
      'GET',
      body,
      function (resp) {
        const respRecord = resp.record
        console.log(respRecord)
        console.log(record)
        const table = respRecord['表格'].value
        for (let i = 0; i < table.length; i++) {
          optionStr += `<option value="${table[i].id}"`
          optionStr += "selected='selected'"
          optionStr += `>${table[i].value['单行文本框_7'].value}</option>`
        }
        $('#receivingAddress').append(optionStr)
        // 默认选择
        $('#receivingAddress').find("option:contains('record.送货地址.value')").attr('selected', true)
      },
      function (error) {
        // error
        console.log(error)
      },
    )
    // 如果客户名称发生变化了把相关联的收货地址值填进去
    $('#receivingAddress').change(function () {
      const record = kintone.app.record.get()

      const body = {
        app: 30, // 代理商应用appID
        id: record.record['代理商记录编号'].value,
      }

      kintone.api(
        kintone.api.url('/k/v1/record', true),
        'GET',
        body,
        function (resp) {
          // success
          const record = kintone.app.record.get()
          const respRecord = resp.record
          if ($('#receivingAddress option:selected').text() == '请选择收货地址') {
            record.record['收货人'].value = ''
            record.record['电话'].value = ''
            record.record['订货员'].value = ''
            record.record['送货地址'].value = ''
          } else {
            const table = respRecord['表格'].value
            for (let i = 0; i < table.length; i++) {
              if ($('#receivingAddress option:selected').text() == table[i].value['单行文本框_7'].value) {
                record.record['收货人'].value = table[i].value['单行文本框_8'].value
                record.record['电话'].value = table[i].value['单行文本框_9'].value
                record.record['订货员'].value = table[i].value['单行文本框_10'].value
                record.record['送货地址'].value = table[i].value['单行文本框_7'].value
                break
              }
            }
          }

          kintone.app.record.set(record)
        },
        function (error) {
          // error
          console.log(error)
        },
      )

      kintone.app.record.set(record)
    })
  }

  if (managers.length > 0 && managers.indexOf(manager) !== -1 && record.状态.value !== '未处理') {
    for (let i = 0; i < table.length; i += 1) {
      table[i].value.出货数量.disabled = false
    }
  }

  return event
})

kintone.events.on('app.record.edit.submit', (event) => {
  const { record } = event
  if (amountBefore !== record.发货金额合计.value) {
    record.修改前实际金额.value = record.发货金额合计.value
  }
})

kintone.events.on('app.record.detail.process.proceed', (event) => {
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
  console.log(yearMonths)
  if (event.nextStatus.value === '完成') {
    return kintone
      .api('/k/v1/records', 'GET', {
        app: ordersAppId,
        // query: `年月 in ${yearMonths} and 客户= "${customerName}" or 年月 in ${yearMonths} and 汇总区分 in ("全区域") or 年月 in ${yearMonths} and 汇总区分 in ("各区域") and 地区= "${region}"`,
        query: `年月 in ${yearMonths} and 客户= ${customerName} or 年月 in ${yearMonths} and 汇总区分 in ("全区域") or 年月 in ${yearMonths} and 汇总区分 in ("各区域") and 地区= ${region}`,
        fields: ['记录编号', '当月订单额', '当年订单累计', '当年退货累计', '年月', '汇总区分'],
      })
      .then((resp1) => {
        console.log(resp1)
        const { records } = resp1
        let recordCustomerPrev
        let recordSingleRegionPrev
        let recordAllRegionPrev
        if (month !== '01') {
          recordCustomerPrev = records.find((item) => {
            return item.年月.value === (Number(yearMonth) - 1).toString() && item.汇总区分.value === '客户'
          })
          recordSingleRegionPrev = records.find((item) => {
            return item.年月.value === (Number(yearMonth) - 1).toString() && item.汇总区分.value === '各区域'
          })
          recordAllRegionPrev = records.find((item) => {
            return item.年月.value === (Number(yearMonth) - 1).toString() && item.汇总区分.value === '全区域'
          })
        }
        const recordCustomer = records.find((item) => {
          return item.年月.value === yearMonth && item.汇总区分.value === '客户'
        })
        const recordSingleRegion = records.find((item) => {
          return item.年月.value === yearMonth && item.汇总区分.value === '各区域'
        })
        const recordAllRegion = records.find((item) => {
          return item.年月.value === yearMonth && item.汇总区分.value === '全区域'
        })
        const sumYearCustomerOut =
          month === '01' ? recordCustomer.当年订单累计.value : recordCustomerPrev.当年订单累计.value
        const sumYearSingleRegionOut =
          month === '01' ? recordSingleRegion.当年订单累计.value : recordSingleRegionPrev.当年订单累计.value
        const sumYearAllRegionOut =
          month === '01' ? recordAllRegion.当年订单累计.value : recordAllRegionPrev.当年订单累计.value
        const sumYearCustomerIn =
          month === '01' ? recordCustomer.当年退货累计.value : recordCustomerPrev.当年退货累计.value
        const sumYearSingleRegionIn =
          month === '01' ? recordSingleRegion.当年退货累计.value : recordSingleRegionPrev.当年退货累计.value
        const sumYearAllRegionIn =
          month === '01' ? recordAllRegion.当年退货累计.value : recordAllRegionPrev.当年退货累计.value
        const recordsIn = [
          {
            id: recordCustomer.记录编号.value,
            record: {
              当年退货累计: {
                value: Number(sumYearCustomerIn) + deliveryAmount,
              },
            },
          },
          {
            id: recordSingleRegion.记录编号.value,
            record: {
              当年退货累计: {
                value: Number(sumYearSingleRegionIn) + deliveryAmount,
              },
            },
          },
          {
            id: recordAllRegion.记录编号.value,
            record: {
              当年退货累计: {
                value: Number(sumYearAllRegionIn) + deliveryAmount,
              },
            },
          },
        ]
        const recordsOut = [
          {
            id: recordCustomer.记录编号.value,
            record: {
              当年订单累计: {
                value: Number(sumYearCustomerOut) + Number(recordCustomer.当月订单额.value) + deliveryAmount,
              },
              当月订单额: {
                value: Number(recordCustomer.当月订单额.value) + deliveryAmount,
              },
            },
          },
          {
            id: recordSingleRegion.记录编号.value,
            record: {
              当年订单累计: {
                value: Number(sumYearSingleRegionOut) + Number(recordSingleRegion.当月订单额.value) + deliveryAmount,
              },
              当月订单额: {
                value: Number(recordSingleRegion.当月订单额.value) + deliveryAmount,
              },
            },
          },
          {
            id: recordAllRegion.记录编号.value,
            record: {
              当年订单累计: {
                value: Number(sumYearAllRegionOut) + Number(recordAllRegion.当月订单额.value) + deliveryAmount,
              },
              当月订单额: {
                value: Number(recordAllRegion.当月订单额.value) + deliveryAmount,
              },
            },
          },
        ]
        const recordsUpdate = category === '销售订单' ? recordsOut : recordsIn

        // 第二次调用API
        return kintone.api('/k/v1/records', 'PUT', {
          app: ordersAppId,
          records: recordsUpdate,
        })
      })
      .then(() => {
        return event
      })
      .catch((e) => {
        alert(e.message)

        return event
      })
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

kintone.events.on(['app.record.create.change.代理商记录编号', 'app.record.edit.change.代理商记录编号'], (event) => {
  const { record } = event
  if (record['代理商记录编号'].value == undefined) {
    $('#receivingAddress').empty()
    $('#receivingAddress').append('<option value="-1">请选择收货地址</option>')

    record['收货人'].value = ''
    record['电话'].value = ''
    record['订货员'].value = ''
    record['送货地址'].value = ''

    return event
  }

  // 客户名称】包含其他，【其他客户】文本框自动显示否则隐藏
  const customer = record['客户名称'].value
  if (customer) {
    if (customer.search('其他') != -1) {
      kintone.app.record.setFieldShown('其它客户', true)
    } else {
      kintone.app.record.setFieldShown('其它客户', false)
    }
  } else {
    kintone.app.record.setFieldShown('其它客户', false)
  }

  let optionStr = ''

  const body = {
    app: 30, // 代理商应用appID
    id: record['代理商记录编号'].value,
  }

  kintone.api(
    kintone.api.url('/k/v1/record', true),
    'GET',
    body,
    function (resp) {
      // success
      const record = kintone.app.record.get()
      const respRecord = resp.record
      const table = respRecord['表格'].value
      for (let i = 0; i < table.length; i++) {
        optionStr += `<option value="${table[i].id}"`
        optionStr += "selected='selected'"
        optionStr += `>${table[i].value['单行文本框_7'].value}</option>`
      }
      $('#receivingAddress').append(optionStr)
      // 默认选择
      $('#receivingAddress').find("option:contains('请选择收货地址')").attr('selected', true)
    },
    function (error) {
      // error
      console.log(error)
    },
  )

  // 如果客户名称发生变化了把相关联的收货地址值填进去
  $('#receivingAddress').change(function () {
    const record = kintone.app.record.get()

    const body = {
      app: 30, // 代理商应用appID
      id: record.record['代理商记录编号'].value,
    }

    kintone.api(
      kintone.api.url('/k/v1/record', true),
      'GET',
      body,
      function (resp) {
        // success
        const record = kintone.app.record.get()
        const respRecord = resp.record
        if ($('#receivingAddress option:selected').text() === '请选择收货地址') {
          record.record['收货人'].value = ''
          record.record['电话'].value = ''
          record.record['订货员'].value = ''
          record.record['送货地址'].value = ''
        } else {
          const table = respRecord['表格'].value
          for (let i = 0; i < table.length; i++) {
            if ($('#receivingAddress option:selected').text() === table[i].value['单行文本框_7'].value) {
              record.record['收货人'].value = table[i].value['单行文本框_8'].value
              record.record['电话'].value = table[i].value['单行文本框_9'].value
              record.record['订货员'].value = table[i].value['单行文本框_10'].value
              record.record['送货地址'].value = table[i].value['单行文本框_7'].value
              break
            }
          }
        }
        kintone.app.record.set(record)
      },
      function (error) {
        // error
        console.log(error)
      },
    )

    kintone.app.record.set(record)
  })

  return event
})
