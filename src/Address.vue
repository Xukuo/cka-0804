<template>
  <div class="recVaddress">
    <el-select v-if="buttonShow" v-model="address" placeholder="请选择收货地址">
      <el-option
        v-for="item in options"
        :key="item.id"
        :label="item.value.单行文本框_7.value"
        :value="item.value.单行文本框_7.value"
      >
      </el-option>
    </el-select>
  </div>
</template>

<script>
export default {
  name: '',

  components: {},
  data() {
    return {
      buttonShow: false,
      options: [
        {
          value: '选项1',
          label: '黄金糕',
        },
        {
          value: '选项2',
          label: '双皮奶',
        },
        {
          value: '选项3',
          label: '蚵仔煎',
        },
        {
          value: '选项4',
          label: '龙须面',
        },
        {
          value: '选项5',
          label: '北京烤鸭',
        },
      ],
      address: '',
      record: undefined,
    }
  },
  watch: {
    address(val) {
      const { record } = this.$kintone.app.record.get()
      const i = this.options.findIndex((item) => item.value.单行文本框_7.value === val)
      if (val) {
        record.收货人.value = this.options[i].value.单行文本框_8.value
        record.电话.value = this.options[i].value.单行文本框_9.value
        record.订货员.value = this.options[i].value.单行文本框_10.value
        record.送货地址.value = this.options[i].value.单行文本框_7.value
        this.$kintone.app.record.set({ record })
      }
    },
  },

  created() {
    if (this.$type === 'app.record.edit.show' && this.$record.状态.value === '未处理') {
      this.$client.record
        .getRecord({
          app: 30,
          id: this.$record.代理商记录编号.value,
        })
        .then((resp) => {
          this.options = resp.record.表格.value
          this.address = this.$record.送货地址.value
          this.buttonShow = true
        })
    }
    this.$kintone.events.on(
      ['app.record.create.change.代理商记录编号', 'app.record.edit.change.代理商记录编号'],
      (event) => {
        const { record } = event
        if (record.客户名称.value) {
          if (record.客户名称.value.includes('其他')) {
            kintone.app.record.setFieldShown('其它客户', true)
          }
          this.$client.record
            .getRecord({
              app: 30,
              id: record.代理商记录编号.value,
            })
            .then((resp) => {
              this.options = resp.record.表格.value
              this.buttonShow = true
            })
        } else {
          kintone.app.record.setFieldShown('其它客户', false)
          this.buttonShow = false
          this.options = []
          this.address = ''
          record.收货人.value = ''
          record.电话.value = ''
          record.订货员.value = ''
          record.送货地址.value = ''
        }
        return event
      },
    )
  },

  mounted() {},

  methods: {},
}
</script>

<style lang="scss" scoped>
.recVaddress {
  margin-top: 37px;
}
</style>
