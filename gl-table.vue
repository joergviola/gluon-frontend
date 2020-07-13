
<template>
  <ui-table 
    :loading="loading"
    :list="list"
    :detail="detail"
    :columns="columns"
    :template="template"
    :i18n-key="`type.${type}.`"
    :create-by="createBy"
    :allowDelete="allowDelete"
    :sort="sort"
    :groupBy="groupBy"
    @change="save"
    @create="create"
    @remove="remove"
    @sort="updateSort"
  >
    <span v-if="$slots['header']" slot="header">
      <slot name="header"></slot>
    </span>
  </ui-table>
</template>


<script>
import uiTable from 'gluon-ui/gl-table'
import api from 'gluon-api'

export default {
  name: 'GluonAPITable',
  components: { uiTable },
  props: ['type', 'detail', 'columns', 'with', 'query', 'order', 'template', 'createBy', 'allowDelete', 'sort', 'groupBy'],
  data() {
    return {
      list:[],
      lists: [],
      loading: true,
    }
  },
  computed: {
    meta() {
      const result = Object.assign({}, this.with)
      for (var key in result) {
        result[key].ignore = true
      }
      return result
    },
    rights() {
      return api.user().role.rights
        .filter(right => right.tables=='*' || right.tables.search(this.type)!=-1)
    },
    readonly() {
      return !this.userCan('U')
    },
    firstFocusable() {
      if (!this.columns) return null
      for (let i=0; i<this.columns.length; i++) {
        const col = this.columns[i]
        if (col.editable && !col.type) return i // Does not support editable functions
      }
      return null
    }
  },
  watch: {
    query() {
      this.getList()
    },
    template() {
      this.getList()
    },
    columns() {
      this.getList()
    },
    groupBy() {
      this.getList()
    },
    list() {
      this.repairTextAreas()
    }
  },
  created() {
    this.getList()
    this.repairTextAreas()
  },
  methods: {
    async getList() {
      this.loading = true
      const query =  {
        and: this.query || this.template,
        with: this.with
      }
      if (this.with) query.with = this.with
      if (this.order) query.order = this.order
      if (this.sort) {
        query.order = {}
        query.order[this.sort] = 'ASC'
      }
      try {
        this.list = await api.find(this.type, query)
        //this.addNew()
        this.lists = this.doGroupBy(this.list)
        if (this.lists.length==0) this.addGroup()
        if (!this.groupBy && this.lists[0].list.length==0) this.addNew(0)
        this.$emit('loaded', this.lists)
      } catch (error) {
        this.$notify({
          title: 'Error',
          message: error.message,
          type: 'error',
          duration: 15000
        })
      }
      this.loading = false
    },
    doGroupBy(list) {
      if (this.groupBy) {
        const result = []
        const cache = {}
        list.forEach((item,i) => {
          const value = item[this.groupBy.field] || "None"
          if (cache[value]) {
            cache[value].push(item)
          } else {
            cache[value] = [item]
            result.push({group:value, list: cache[value], show: true, header: true, key:result.length})
          }
        })
        return result
      } else {
        return [{group:'default', list: list, show: true, header: false, key:0}]
      }
    },
    addGroup() {
      if (this.groupBy) {
        const groupName = 'New...'
        this.lists.splice(0, 0, {group:groupName, list: [], show: true, header: true, key:this.lists.length+1})
        const row = this.addNew(0)
        row[this.groupBy.field] = groupName
        this.save(row, this.groupBy)
        this.$nextTick(() => {
          let tables = this.$refs.theTable
          this.createGroupSortable(tables[tables.length-1])
        })
      }
    },
    groupChanged(group) {
      if (this.groupBy) {
        group.list.forEach(item => {
          item[this.groupBy.field] = group.group
        })        
        this.updateSort()
      }
    },
    createGroupSortable(table) {
      const tableEl = Array.isArray(table) ? table[0].$el : table.$el
      const group = tableEl.dataset.group
      const el = tableEl.querySelectorAll('.el-table__body-wrapper > table > tbody')[0]
      el.dataset.group = group
      return Sortable.create(el, {
        dataGroup: group,
        handle: ".handle",
        group: "group",
        ghostClass: 'sortable-ghost',
        setData: function (dataTransfer) {
          // to avoid Firefox bug
          // Detail see : https://github.com/RubaXa/Sortable/issues/1012
          dataTransfer.setData('Text', '')
        },
        onEnd: async (evt) => {
          const fromGroup = getGroup(evt.from)
          const toGroup = getGroup(evt.to)
          const from = this.lists.find(l => l.group == fromGroup)
          const to = this.lists.find(l => l.group == toGroup)
          const row = from.list.splice(evt.oldIndex, 1)[0]
          if (this.groupBy) {
            row[this.groupBy.field] = to.group
          }
          to.list.splice(evt.newIndex, 0, row)
          await this.updateSort()
        }
      })

      function getGroup(el) {
        while(el!=null) {
          if (el.dataset.list) return el.dataset.list
          el = el.parentElement
        }
      }
    },
    async updateSort() {
      if (!this.sort) return
      const data = {}
      let i=1
      this.list.forEach(item => {
        if (item.id) {
          data[item.id] = {}
          data[item.id][this.sort] = i
          if (this.groupBy) {
            data[item.id][this.groupBy.field] = item[this.groupBy.field]
          }
          item[this.sort] = i
          i++
        }
      })
      api.updateBulk(this.type, data)
    },
    async save(row, attr) {
      if (!row.id) {
        await this.create(row, false)
      } else {
        try {
          const data = {}
          data[attr] = row[attr]
          await api.update(this.type, row.id, data)
        } catch (error) {
          this.$notify({
            title: 'Error',
            message: error.message,
            type: 'error',
            duration: 15000
          })
        }
      }
    },
    async create(row, pos, showError=true) {
      try {
        const result = await api.create(this.type, row)
        row.id = result.id
        await this.updateSort()
        //this.addNew()
      } catch (error) {
        if (showError) {
          this.$notify({
            title: 'Error',
            message: error.message,
            type: 'error',
            duration: 15000
          })
        }
      }
    },
    async remove(row) {
      try {
        if (row.id) {
          await api.delete(this.type, row.id)
        }
      } catch (error) {
        this.$notify({
          title: 'Error',
          message: error.message,
          type: 'error',
          duration: 15000
        })
      }
    },
    userCan(action) {
      const rights = this.rights.filter(right => right.actions.indexOf(action)!=-1)
      return rights.length!=0
    },
    getTextAreaColumns() {
      return this.columns
        .map((c,i) => ({index:i, type:c.type}))
        .filter(o => o.type=='textarea')
        .map(o => o.index)
    },
    // Somehow - when using el-input with type='textarea' in an el-table, the height is not correctly calculated.
    // Repair it after loading the data.
    repairTextAreas() {
      this.lists.forEach((group,g) => {
        group.list.forEach((row, r) => {
          this.getTextAreaColumns().forEach(c => {
            const key=`field-${g}-${r}-${c}`
            this.$nextTick(() => {
              let comp = this.$refs[key]
              if (!comp) return
              if (Array.isArray(comp)) comp = comp[0]
              comp.resizeTextarea()
            })
          })
        })
      })
    },
    exportCSV(name, columns) {
      const data = []
      data.push(columns.join(','))
      this.list.forEach(row => {
        if (!row.id) return
        const line = columns.map(col => encode(_.get(row, col)))
        data.push(line.join(','))
      });

      const csv = data.join('\r\n')
   
      let anchor = document.createElement('a');
      anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      anchor.target = '_blank';
      anchor.download = name;
      anchor.click();      

      function encode(s) {
        if (!s) return ""
        s = ""+s
        return s
        .replace(',', ' ')
        .replace('\r', '\\r')
        .replace('\n', '\\n')
      }
    },
    // async importCSV(file) {
    //   const self = this
    //   const reader = new FileReader();
    //   reader.onload = async function(e) {
    //     const data = parse(e.target.result)
    //     const json = toData(data)
    //     const update = toUpdate(json)
    //     const create = toCreate(json)
    //     console.log(json)
    //     await api.updateBulk(self.type, update)
    //     await api.create(self.type, create)
    //     self.getList()
    //   };
    //   reader.readAsText(file.raw)

    //   function parse(text) {
    //     const data = []
    //     text.split("\n").forEach((line,i) => {
    //       if (line=="") return
    //       const item = line.split(',')
    //       data.push(line.split(','))
    //     })
    //     return data
    //   }

    //   function toData(data) {


    //     const columns = data[0]
    //     const json = []
    //     data.forEach((line,i) =>{
    //       if (i==0) return
    //       const item = Object.assign({}, self.template)
    //       columns.forEach((col,j) => {
    //         const path = col.split('.')
    //         let o = item
    //         let type = self.type
    //         path.forEach((name, n) => {
    //           if (n<path.length-1) {
    //             if (!o._meta) o._meta = {}
    //             if (!o[name]) {
    //               o[name] = { }
    //             } else {
    //               o[name] = Object.assign({}, o[name])
    //             }
    //             o._meta[name] = {
    //               one: name,
    //               that: type+"_id",
    //               ignore: false
    //             }
    //             type = name
    //             o = o[name]
    //           } else {
    //             o[name] = line[j]
    //           }
    //           console.log(i, name, item, o, line[j])
    //         })
    //       })
    //       if (item.id=="") item[self.sort] = self.list.length+i
    //       json.push(item)
    //     })
    //     return json
    //   }

    //   function toUpdate(json) {
    //     const data = {}
    //     json.forEach(row => {
    //       if (!row.id) return
    //       data[row.id] = row
    //     })
    //     return data
    //   }

    //   function toCreate(json) {
    //     return json.filter(row => !row.id)
    //   }
    // }
  },

}
</script>