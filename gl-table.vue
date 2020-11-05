
<template>
  <ui-table 
    :type="type"
    v-loading="loading"
    :list="list"
    :detail="detail"
    :columns="actualColumns"
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
    <span v-if="$slots['header'] || filter" slot="header">
      <el-collapse-transition>
        <div v-show="showFilter" style="padding: 20px">
          <el-row :gutter="40">
            <el-col :xs="24" :md="12" align="left">
              <el-card>
                <div slot="header" class="card-header">
                  <b>{{$t('ui.list.filter')}}</b>
                </div>
                <ui-editor
                  :type="type" 
                  :item="filterQuery" 
                  :fields="filterFields.search" 
                  :hideDefaultButtons="true"
                  size="mini"
                />                
              </el-card>
            </el-col>
            <el-col :xs="24" :md="12" align="left">
              <el-card>
                <div slot="header" class="card-header">
                  <b>{{$t('ui.list.group')}}</b>
                </div>
                <ui-editor
                  :type="type" 
                  :item="grouping" 
                  :fields="filterFields.group" 
                  :hideDefaultButtons="true"
                  size="mini"
                />                
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-collapse-transition>

      <el-button v-if="!showFilter && filter" @click="showFilter = true">{{$t('ui.list.showFilter')}}</el-button>
      <el-button v-if="showFilter" @click="showFilter = false">{{$t('ui.list.close')}}</el-button>
      <el-button v-if="showFilter" type="primary" @click="onSearch">{{$t('ui.list.search')}}</el-button>

      <slot name="header"></slot>
    </span>
    <span slot="footer">
      <i @click="exportCSV()" class="el-icon-download"  :title="$t('ui.list.export')"/>
      <i @click="importCSV()" class="el-icon-upload2" :title="$t('ui.list.import')"/>
      <input ref="file" type="file" style="display:none" @change="importCSVData"/> 
    </span>
  </ui-table>
</template>


<script>
import uiTable from 'gluon-ui/gl-table'
import uiEditor from 'gluon-ui/gl-editor'
import api from 'gluon-api'

export default {
  name: 'GluonAPITable',
  components: { uiTable, uiEditor },
  props: ['type', 'detail', 'columns', 'with', 'query', 'join', 'order', 'template', 'createBy', 'allowDelete', 'sort', 'groupBy', 'filter', 'onImport', 'onExport'],
  data() {
    return {
      list:[],
      lists: [],
      loading: true,
      showFilter: false,
      filterQuery: {},
      grouping: {},
      filterFields: [],
      filterLoaded: false,
      actualColumns: [],
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
    },
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
    },
    showFilter() {
      if (this.filterLoaded) return
      this.filterLoaded = true

      this.filterFields = {
        search: map(this.filter.search),
        group: this.filter.group.map(field => ({
            name: field.name, 
            type: 'checkbox', 
        })),
      }

      function map(fields, type) {
        return fields.map(field => {
          if (field.type!='to-one') return field;
          const mapped = { 
            name: field.name, 
            type: 'select', 
            options: [],
            display: field.display,
            id: 'id'
          }
          setOption()
          return mapped

          async function setOption() {
            const items = await api.find(field.ref, { and: field.query || {} })
            mapped.options = items
            const select = {}
            select[field.id] = null
            select[field.display] = "Wählen"
            mapped.options.splice(0, 0, select)
          }
        })
      }

    }
  },
  created() {
    this.getList()
    this.repairTextAreas()
  },
  methods: {
    getFilterQuery() {
      const result = {}
      if (!this.filter) return result
      this.filter.search.forEach(field => {
        switch (field.type) {
          case 'daterange':
            result[field.name] = {'>=': this.filterQuery[field.name]}
            result[field.to] = {'<=': this.filterQuery[field.to]}
            break;
          default:
            result[field.name] = this.filterQuery[field.name]
        }
      })
      return result
    },
    setActualColumns() {
      let columns = this.columns
      if (this.filter && this.filter.group) {
        const groupCols = []
        this.filter.group.forEach(group => {
          if (this.grouping[group.name]) {
            groupCols.push(...group.columns)
          }
        })
        if (groupCols.length>0) {
          groupCols.push(...this.filter.reducedColumns)
          columns = groupCols
        }
      }
      this.actualColumns = columns
    },
    async getList() {
      this.loading = true

      const query =  {
        and: Object.assign({}, this.getFilterQuery(), this.query || this.template),
      }
      if (this.with) query.with = this.with
      if (this.order) query.order = this.order
      if (this.sort) {
        query.order = {}
        query.order[this.sort] = 'ASC'
      }
      if (this.join) {
        query.join = this.join
      }
      this.group(query)
      this.setActualColumns()
      try {
        this.list = await api.find(this.type, query)
        //this.addNew()
        // this.lists = this.doGroupBy(this.list)
        // if (this.lists.length==0) this.addGroup()
        // if (!this.groupBy && this.lists[0].list.length==0) this.addNew(0)
        this.$emit('loaded', this.list)
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
    group(query) {
      const groupBy = []
      const select = []
      const withs = {}
      if (!this.filter || !this.filter.group) return
      this.filter.group.forEach(group => {
        if (this.grouping[group.name]) {
          groupBy.push(group.name)
          select.push(group.name)
          Object.assign(withs, group.with)
        }
      })
      this.filter.reducedColumns.forEach(col => {
        col.select.as = col.name
        select.push(col.select)
      })
      if (groupBy.length>0) {
        query.group = groupBy
        query.select = select
        query.with = withs
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
      if (typeof this.allowDelete == 'function') {
        if (!this.allowDelete(row)) return
      } 
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
    onSearch() {
      this.showFilter = false
      this.getList()
    },
    exportCSV(name=this.type + '.csv', columns) {
      const data = []
      if (!columns) {
        if (this.onExport) {
          columns = this.onExport(null)
        } else {
          columns = this.columns.map(c => c.name)
        }
      }
      data.push(columns.join(','))
      this.list.forEach(row => {
        if (!row.id) return
        let line = null
        if (this.onExport) {
          line = this.onExport(row)
        } else {
          line = columns.map(col => encode(_.get(row, col)))
        }
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
    importCSV() {
      this.$refs.file.click()
    },
    async importCSVData(event) {
      const file = event.target.files[0]
      const self = this
      const reader = new FileReader();
      reader.onload = async function(e) {
        const data = parse(e.target.result)
        const json = toData(data)
        const update = toUpdate(json)
        const create = toCreate(json)
        if (Object.keys(update).length>0) {
          await api.updateBulk(self.type, update)
        }
        if (create.length>0) {
          await api.create(self.type, create)
        }
        self.getList()
      };
      reader.readAsText(file)

      function parse(text) {
        const data = []
        text.split("\n").forEach((line,i) => {
          if (line=="") return
          const item = line.split(',')
          data.push(line.split(','))
        })
        return data
      }

      function toData(data) {
        const columns = data[0]
        const json = []
        data.forEach((line,i) =>{
          if (i==0) return
          const item = self.onImport 
            ? self.onImport(line)
            : parseLine(line, columns)
          if (item.id=="") item[self.sort] = self.list.length+i
          json.push(item)
        })
        return json
      }

      function parseLine(line, columns) {
          const item = Object.assign({}, self.template)
          columns.forEach((col,j) => {
            const path = col.split('.')
            let o = item
            let type = self.type
            path.forEach((name, n) => {
              if (n<path.length-1) {
                if (!o._meta) o._meta = {}
                if (!o[name]) {
                  o[name] = { }
                } else {
                  o[name] = Object.assign({}, o[name])
                }
                o._meta[name] = {
                  one: name,
                  that: type+"_id",
                  ignore: false
                }
                type = name
                o = o[name]
              } else {
                o[name] = line[j]
              }
            })
          })
          return item
      }

      function toUpdate(json) {
        const data = {}
        json.forEach(row => {
          if (!row.id) return
          data[row.id] = row
        })
        return data
      }

      function toCreate(json) {
        return json.filter(row => !row.id)
      }
    }
  },

}
</script>