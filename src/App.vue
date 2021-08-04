<template>
  <div>
    <el-button v-if="buttonShow" type="primary" @click="dataSearch()">数据搜选</el-button>
    <el-dialog title="产品明细" :visible.sync="dialogFormVisible" width="40%" top="30vh">
      <el-col :span="8">
        <el-input v-model="search" placeholder="输入产品编号搜索" />
      </el-col>
      <el-col :span="8" style="margin-left: 20px">
        <el-button @click="toggleSelection()">清空选择</el-button>
      </el-col>

      <el-table
        ref="multipleTable"
        height="300"
        row-key="产品编号.value"
        :data="tableData.filter((data) => !search || data.产品编号.value.includes(search))"
        tooltip-effect="dark"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" :reserve-selection="true" width="55"> </el-table-column>
        <el-table-column prop="产品编号.value" label="产品编号" width="120"> </el-table-column>
        <el-table-column prop="品名.value" label="品名" width="120"> </el-table-column>
        <el-table-column prop="线下零售价.value" label="线下零售价" show-overflow-tooltip> </el-table-column>
      </el-table>

      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormVisible = false"> 取消 </el-button>
        <el-button type="primary" @click="dataUpdate()"> 提交 </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      buttonShow: false,
      dialogFormVisible: false,
      tableData: [],
      multipleSelection: [],
      search: '',
      changeStatus: true,
    }
  },

  created() {
    this.$kintone.events.on(
      [
        'app.record.create.change.品牌',
        'app.record.create.change.代理商记录编号',
        'app.record.edit.change.品牌',
        'app.record.edit.change.代理商记录编号',
      ],
      (event) => {
        const { record } = event
        if (record.品牌.value && record.客户名称.value) {
          this.buttonShow = true
          this.$record.品牌.value = record.品牌.value
          this.$record.客户名称.value = record.客户名称.value
        } else this.buttonShow = false
      },
    )
  },
  methods: {
    dataSearch() {
      this.dialogFormVisible = true
      this.$client.record
        .getRecords({
          app: 33,
          query: `价格类别="${this.$record.客户名称.value}" and 品牌 in ("${this.$record.品牌.value}")`,
        })
        .then((resp) => {
          const { records } = resp
          this.tableData = records
        })
    },
    dataUpdate() {
      const productNames = []
      for (let i = 0; i < this.$record.订单明细.value.length; i += 1) {
        productNames.push(this.$record.订单明细.value[i].value.品名搜选.value)
        if (!this.$record.订单明细.value[i].value.品名搜选.value) {
          this.$record.订单明细.value.splice(i, 1)
        }
      }
      for (let i = 0; i < this.multipleSelection.length; i += 1) {
        if (!productNames.includes(this.multipleSelection[i].品名.value)) {
          this.$record.订单明细.value.push({
            value: {
              产品编码: {
                value: this.multipleSelection[i].产品编号.value,
                type: 'SINGLE_LINE_TEXT',
              },
              减折合计: {
                value: '',
                type: 'CALC',
              },
              减折扣额: {
                value: '',
                type: 'NUMBER',
              },
              出货单价: {
                value: 0,
                type: 'CALC',
              },
              出货数量: {
                value: '',
                type: 'NUMBER',
                disabled: true,
              },
              包装: {
                value: this.multipleSelection[i].数值.value,
                type: 'NUMBER',
              },
              单价: {
                value: this.multipleSelection[i].线下批发价.value,
                type: 'NUMBER',
              },
              发货金额: {
                value: 0,
                type: 'CALC',
              },
              含税金额: {
                value: 0,
                type: 'CALC',
              },
              品名: {
                value: this.multipleSelection[i].单行文本框_1.value,
                type: 'SINGLE_LINE_TEXT',
              },
              品名搜选: {
                value: this.multipleSelection[i].品名.value,
                type: 'SINGLE_LINE_TEXT',
              },
              品类: {
                value: this.multipleSelection[i].单行文本框_0.value,
                type: 'SINGLE_LINE_TEXT',
              },
              固定减折金额: {
                value: 0,
                type: 'CALC',
              },
              差异数量: {
                value: 0,
                type: 'CALC',
              },
              扣减合计: {
                value: 0,
                type: 'CALC',
              },
              未税金额: {
                value: 0,
                type: 'CALC',
              },
              条码: {
                value: this.multipleSelection[i].单行文本框_2.value,
                type: 'SINGLE_LINE_TEXT',
              },
              箱数: {
                value: 0,
                type: 'CALC',
              },
              订单数量: {
                value: '',
                type: 'NUMBER',
              },
              零售价: {
                value: this.multipleSelection[i].线下零售价.value,
                type: 'SINGLE_LINE_TEXT',
              },
            },
          })
          setTimeout(() => {
            document.getElementsByClassName('input-lookup-gaia')[i + 1].click()
          }, 1000)
        }
      }
      this.$kintone.app.record.set({ record: this.$record })
      this.dialogFormVisible = false
    },
    toggleSelection(rows) {
      if (rows) {
        rows.forEach((row) => {
          this.$refs.multipleTable.toggleRowSelection(row)
        })
      } else {
        this.$refs.multipleTable.clearSelection()
      }
    },
    handleSelectionChange(val) {
      this.multipleSelection = val
    },
  },
}
</script>

<style>
@import 'normalize.css';
@import 'app.css';
</style>
