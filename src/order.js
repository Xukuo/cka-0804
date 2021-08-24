;(function () {
  'use strict'
  var ordersAppId = 34
  var APP_ID = kintone.app.getId()
  var manager = kintone.getLoginUser().code
  var month
  var yearMonth
  var yearMonths
  var amountBefore

  function disableRecords(record) {
    var i
    var table = record.订单明细.value
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
    for (i = 0; i < table.length; i += 1) {
      table[i].value.品名搜选.disabled = true
      table[i].value.订单数量.disabled = true
      table[i].value.减折扣额.disabled = true
    }
  }

  function getSumOut(record, records, type) {
    return month === '01' || record.当年订单累计.value
      ? Number(record.当年订单累计.value)
      : Number(
          records.find(function (item) {
            return item.年月.value === (Number(yearMonth) - 1).toString() && item.汇总区分.value === type
          }).当年订单累计.value,
        ) + Number(record.当月订单额.value)
  }

  function getSumIn(record, records, type) {
    return month === '01' || record.当年退货累计.value
      ? Number(record.当年退货累计.value)
      : Number(
          records.find(function (item) {
            return item.年月.value === (Number(yearMonth) - 1).toString() && item.汇总区分.value === type
          }).当年退货累计.value,
        )
  }

  kintone.events.on('app.record.detail.show', function (event) {
    var record = event.record
    var customerName = record.客户名称.value
    var region = record.区域.value
    var category = record.分类.value
    var managers = []
    var i
    var myContainer = document.querySelector('.gaia-app-statusbar-actionmenu-wrapper')
    var amount = Number(record.发货金额合计.value) - Number(record.修改前实际金额.value)
    if (record.客户名称.value) {
      if (record.客户名称.value.search('其他') !== -1) {
        kintone.app.record.setFieldShown('其它客户', true)
      } else {
        kintone.app.record.setFieldShown('其它客户', false)
      }
    } else {
      kintone.app.record.setFieldShown('其它客户', false)
    }
    if (record.物流担当.value.length > 0) {
      for (i = 0; i < record.物流担当.value.length; i += 1) {
        managers.push(record.物流担当.value[i].code)
      }
    }
    yearMonths = []
    if (record.订货日期.value) {
      month = record.订货日期.value.split('-')[1]
      yearMonth = record.订货日期.value.split('-', 2).join('')
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
      myContainer.innerHTML = '<button id="update">更新</button>'
      $('#update').click(function () {
        $('#update').attr('disabled', 'true')
        return kintone
          .api('/k/v1/records', 'GET', {
            app: ordersAppId,
            query:
              '年月 in ' +
              yearMonths +
              ' and 客户= "' +
              customerName +
              '" or 年月 in ' +
              yearMonths +
              ' and 汇总区分 in ("全区域") or 年月 in ' +
              yearMonths +
              ' and 汇总区分 in ("各区域") and 地区= "' +
              region +
              '"',
            fields: ['记录编号', '当月订单额', '当年订单累计', '当年退货累计', '年月', '汇总区分'],
          })
          .then(function (resp1) {
            var records = resp1.records
            var recordCustomer = records.find(function (item) {
              return item.年月.value === yearMonth && item.汇总区分.value === '客户'
            })
            var recordSingleRegion = records.find(function (item) {
              return item.年月.value === yearMonth && item.汇总区分.value === '各区域'
            })
            var recordAllRegion = records.find(function (item) {
              return item.年月.value === yearMonth && item.汇总区分.value === '全区域'
            })

            var sumYearCustomerOut = getSumOut(recordCustomer, records, '客户')
            var sumYearSingleRegionOut = getSumOut(recordSingleRegion, records, '各区域')
            var sumYearAllRegionOut = getSumOut(recordAllRegion, records, '全区域')
            var sumYearCustomerIn = getSumIn(recordCustomer, records, '客户')
            var sumYearSingleRegionIn = getSumIn(recordSingleRegion, records, '各区域')
            var sumYearAllRegionIn = getSumIn(recordAllRegion, records, '全区域')
            var recordsIn = [
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
            var recordsOut = [
              {
                id: recordCustomer.记录编号.value,
                record: {
                  当年订单累计: {
                    value: sumYearCustomerOut + amount,
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
                    value: sumYearSingleRegionOut + amount,
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
                    value: sumYearAllRegionOut + amount,
                  },
                  当月订单额: {
                    value: Number(recordAllRegion.当月订单额.value) + amount,
                  },
                },
              },
            ]
            var recordsUpdate = category === '销售订单' ? recordsOut : recordsIn

            return kintone.api('/k/v1/records', 'PUT', {
              app: ordersAppId,
              records: recordsUpdate,
            })
          })
          .then(function () {
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
          .then(function () {
            location.reload()
          })
          .catch(function (e) {
            $('#update').removeAttr('disabled')
            alert(e.message)

            return false
          })
      })
    }
    return event
  })

  kintone.events.on('app.record.create.show', function (event) {
    var record = event.record
    var el = kintone.app.record.getSpaceElement('rcvAddr')
    var btnEl = document.createElement('select')
    record.订单明细.value[0].value.出货数量.disabled = true
    record.订货日期.disabled = true
    record.物流担当.disabled = false
    kintone.app.record.setFieldShown('其它客户', false)
    el.style.padding = '30px 0 0 0'
    btnEl.id = 'receivingAddress'
    btnEl.style.width = '200px'
    btnEl.style.height = '40px'
    el.appendChild(btnEl)
    $('#receivingAddress').append('<option value="-1">请选择收货地址</option>')
  })

  kintone.events.on('app.record.edit.show', function (event) {
    var record = event.record
    var table = record.订单明细.value
    var managers = []
    var el = kintone.app.record.getSpaceElement('rcvAddr')
    var btnEl = document.createElement('select')
    var optionStr = ''
    var i, j, k
    amountBefore = record.发货金额合计.value
    record.订货日期.disabled = true
    record.物流担当.disabled = false

    kintone.app.record.setFieldShown('其它客户', false)
    if (record.客户名称.value) {
      if (record.客户名称.value.search('其他') !== -1) {
        kintone.app.record.setFieldShown('其它客户', true)
      }
    }

    if (record.物流担当.value.length > 0) {
      for (i = 0; i < record.物流担当.value.length; i += 1) {
        managers.push(record.物流担当.value[i].code)
      }
    }
    for (j = 0; j < table.length; j += 1) {
      table[j].value.出货数量.disabled = true
    }
    if (record.状态.value === '完成') {
      if (record.修改前实际金额.value.length === 0) {
        record.修改前实际金额.value = record.发货金额合计.value
      }
    }

    if (record.状态.value !== '未处理') {
      disableRecords(record)
      setTimeout(function () {
        $('table:eq(0)')
          .find('.add-row-image-gaia')
          .each(function (m, v) {
            $(v).css('display', 'none')
          })
        $('table:eq(0)')
          .find('.remove-row-image-gaia')
          .each(function (m, v) {
            $(v).css('display', 'none')
          })
      }, 100)
    }
    if (record.状态.value === '未处理') {
      el.style.padding = '30px 0 0 0'
      btnEl.id = 'receivingAddress'
      btnEl.style.width = '200px'
      btnEl.style.height = '40px'
      el.appendChild(btnEl)
      $('#receivingAddress').append('<option value="-1">请选择收货地址</option>')
      if (record['代理商记录编号'].value) {
        kintone.api(
          kintone.api.url('/k/v1/record', true),
          'GET',
          {
            app: 30, // 代理商应用appID
            id: record['代理商记录编号'].value,
          },
          function (resp) {
            var record1 = kintone.app.record.get()
            var respRecord = resp.record
            var tables = respRecord.表格.value
            var m
            for (m = 0; m < tables.length; m++) {
              optionStr += '<option value="' + tables[m].id + '"'
              optionStr += '>' + tables[m].value.单行文本框_7.value + '</option>'
            }
            $('#receivingAddress').append(optionStr)

            $('#receivingAddress')
              .find("option:contains('" + record1.record.送货地址.value + "')")
              .attr('selected', true)
          },
          function (error) {
            // error
            console.log(error)
          },
        )
        // 如果客户名称发生变化了把相关联的收货地址值填进去
        $('#receivingAddress').change(function () {
          var record1 = kintone.app.record.get()

          kintone.api(
            kintone.api.url('/k/v1/record', true),
            'GET',
            {
              app: 30, // 代理商应用appID
              id: record1.record['代理商记录编号'].value,
            },
            function (resp) {
              // success
              var record2 = kintone.app.record.get()
              var respRecord = resp.record
              var table2 = respRecord['表格'].value
              var n
              if ($('#receivingAddress option:selected').text() === '请选择收货地址') {
                record2.record['收货人'].value = ''
                record2.record['电话'].value = ''
                record2.record['订货员'].value = ''
                record2.record['送货地址'].value = ''
              } else {
                for (n = 0; n < table2.length; n++) {
                  if ($('#receivingAddress option:selected').text() === table2[n].value['单行文本框_7'].value) {
                    record2.record['收货人'].value = table2[n].value['单行文本框_8'].value
                    record2.record['电话'].value = table2[n].value['单行文本框_9'].value
                    record2.record['订货员'].value = table2[n].value['单行文本框_10'].value
                    record2.record['送货地址'].value = table2[n].value['单行文本框_7'].value
                    break
                  }
                }
              }

              kintone.app.record.set(record2)
            },
          )

          kintone.app.record.set(record1)
        })
      }
    }

    if (managers.length > 0 && managers.indexOf(manager) !== -1 && record.状态.value !== '未处理') {
      for (k = 0; k < table.length; k += 1) {
        table[k].value.出货数量.disabled = false
      }
    }

    return event
  })

  kintone.events.on('app.record.edit.submit', function (event) {
    var record = event.record
    if (amountBefore !== record.发货金额合计.value) {
      record.修改前实际金额.value = record.发货金额合计.value
    }
  })

  kintone.events.on('app.record.detail.process.proceed', function (event) {
    var record = event.record
    var customerName = record.客户名称.value
    var region = record.区域.value
    var category = record.分类.value
    var time = new Date()
    var currentTime = time.getFullYear() + '-' + (time.getMonth() + 1) + '-' + time.getDate()
    var deliveryAmount = Number(record.发货金额合计.value)
    if (event.action.value === '提交') {
      record.订货日期.value = currentTime
    }
    if (event.nextStatus.value === '完成') {
      var spinner = new kintoneUIComponent.Spinner()
      kintone.app.record.getSpaceElement('component-UI').appendChild(spinner.render())
      spinner.show()
      return kintone
        .api('/k/v1/records', 'GET', {
          app: ordersAppId,
          query:
            '年月 in ' +
            yearMonths +
            ' and 客户= "' +
            customerName +
            '" or 年月 in ' +
            yearMonths +
            ' and 汇总区分 in ("全区域") or 年月 in ' +
            yearMonths +
            ' and 汇总区分 in ("各区域") and 地区= "' +
            region +
            '"',
          fields: ['记录编号', '当月订单额', '当年订单累计', '当年退货累计', '年月', '汇总区分'],
        })
        .then(function (resp1) {
          var records = resp1.records
          var recordCustomer = records.find(function (item) {
            return item.年月.value === yearMonth && item.汇总区分.value === '客户'
          })
          var recordSingleRegion = records.find(function (item) {
            return item.年月.value === yearMonth && item.汇总区分.value === '各区域'
          })
          var recordAllRegion = records.find(function (item) {
            return item.年月.value === yearMonth && item.汇总区分.value === '全区域'
          })
          var sumYearCustomerOut = getSumOut(recordCustomer, records, '客户')
          var sumYearSingleRegionOut = getSumOut(recordSingleRegion, records, '各区域')
          var sumYearAllRegionOut = getSumOut(recordAllRegion, records, '全区域')
          var sumYearCustomerIn = getSumIn(recordCustomer, records, '客户')
          var sumYearSingleRegionIn = getSumIn(recordSingleRegion, records, '各区域')
          var sumYearAllRegionIn = getSumIn(recordAllRegion, records, '全区域')
          var recordsIn = [
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
          var recordsOut = [
            {
              id: recordCustomer.记录编号.value,
              record: {
                当年订单累计: {
                  value: sumYearCustomerOut + deliveryAmount,
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
                  value: sumYearSingleRegionOut + deliveryAmount,
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
                  value: sumYearAllRegionOut + deliveryAmount,
                },
                当月订单额: {
                  value: Number(recordAllRegion.当月订单额.value) + deliveryAmount,
                },
              },
            },
          ]
          var recordsUpdate = category === '销售订单' ? recordsOut : recordsIn

          return kintone.api('/k/v1/records', 'PUT', {
            app: ordersAppId,
            records: recordsUpdate,
          })
        })
        .then(function () {
          spinner.hide()
          return event
        })
        .catch(function (e) {
          spinner.hide()
          alert(e.message)
          return false
        })
    }
    return event
  })

  kintone.events.on('app.record.print.show', function (event) {
    if (manager === 'Administrator') {
      kintone.app.record.setFieldShown('其它客户', false)
      kintone.app.record.setFieldShown('固定减折扣', false)
      kintone.app.record.setFieldShown('零售价', false)
    }
    return event
  })

  kintone.events.on(['app.record.create.change.订单数量', 'app.record.edit.change.订单数量'], function (event) {
    var row = event.changes.row
    if (row.value.订单数量.value < 0) {
      window.alert('订单数量不能为负数')
      return false
    }
    row.value.出货数量.value = row.value.订单数量.value

    return event
  })

  kintone.events.on(['app.record.create.change.订单明细', 'app.record.edit.change.订单明细'], function (event) {
    var type = event.type
    var record = event.record
    var table = record.订单明细.value
    var i
    for (i = 0; i < table.length; i += 1) {
      if (
        type === 'app.record.create.change.订单明细' ||
        (type === 'app.record.edit.change.订单明细' && record.状态.value === '未处理')
      ) {
        table[i].value.出货数量.disabled = true
      }
    }

    return event
  })

  kintone.events.on(
    ['app.record.create.change.代理商记录编号', 'app.record.edit.change.代理商记录编号'],
    function (event) {
      var record = event.record
      var customer = record['客户名称'].value
      var optionStr = ''
      if (record['代理商记录编号'].value === undefined) {
        $('#receivingAddress').empty()
        $('#receivingAddress').append('<option value="-1">请选择收货地址</option>')

        record['收货人'].value = ''
        record['电话'].value = ''
        record['订货员'].value = ''
        record['送货地址'].value = ''
      }
      if (customer) {
        if (customer.search('其他') !== -1) {
          kintone.app.record.setFieldShown('其它客户', true)
        } else {
          kintone.app.record.setFieldShown('其它客户', false)
        }
      } else {
        kintone.app.record.setFieldShown('其它客户', false)
      }
      if (record['代理商记录编号'].value) {
        kintone.api(
          kintone.api.url('/k/v1/record', true),
          'GET',
          {
            app: 30, // 代理商应用appID
            id: record['代理商记录编号'].value,
          },
          function (resp) {
            // success
            var respRecord = resp.record
            var table = respRecord['表格'].value
            var i
            for (i = 0; i < table.length; i++) {
              optionStr += '<option value="' + table[i].id + '"'
              optionStr += '>' + table[i].value['单行文本框_7'].value + '</option>'
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
          var record1 = kintone.app.record.get()
          kintone.api(
            kintone.api.url('/k/v1/record', true),
            'GET',
            {
              app: 30, // 代理商应用appID
              id: record1.record['代理商记录编号'].value,
            },
            function (resp) {
              var record2 = kintone.app.record.get()
              var respRecord = resp.record
              var table = respRecord['表格'].value
              var i
              if ($('#receivingAddress option:selected').text() === '请选择收货地址') {
                record2.record['收货人'].value = ''
                record2.record['电话'].value = ''
                record2.record['订货员'].value = ''
                record2.record['送货地址'].value = ''
              } else {
                for (i = 0; i < table.length; i++) {
                  if ($('#receivingAddress option:selected').text() === table[i].value['单行文本框_7'].value) {
                    record2.record['收货人'].value = table[i].value['单行文本框_8'].value
                    record2.record['电话'].value = table[i].value['单行文本框_9'].value
                    record2.record['订货员'].value = table[i].value['单行文本框_10'].value
                    record2.record['送货地址'].value = table[i].value['单行文本框_7'].value
                    break
                  }
                }
              }
              kintone.app.record.set(record2)
            },
          )
          kintone.app.record.set(record1)
        })
      }

      return event
    },
  )
})()
