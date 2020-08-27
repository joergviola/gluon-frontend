<template>
  <ui-editor
  v-loading="loading"
  :type="type" 
  :item="item" 
  :fields="uiFields" 
  :buttons="buttons" 
  :image="image" 
  :readonly="readonly" 
  :hideCancel="hideCancel"
  @save="save"
  @cancel="$router.go(-1)"
  @docs-added="docsAdded" 
  @docs-removed="docsRemoved"
  @click="click"
  @change="onChange"
  />
</template>

<script>
import uiEditor from 'gluon-ui/gl-editor'
import api from 'gluon-api'

export default {
  name: "GlApiEditor",
  components: { uiEditor },
  props: ['type', 'id', 'fields', 'buttons', 'with', 'template', 'image', 'reload', 'hideCancel'],
  data() {
    return {
      item: this.template || {},
      toOnes: this.initToOnes(),
      uploadDocs: {},
      loading: false
    }
  },
  watch: {
    async id() {
      await this.load()
      this.$emit('update', Object.assign({}, this.item))
    }
  },
  computed: {
    uiFields() {
      return this.fields.map(field => {
        if (field.type!='to-one') return field;
        return { 
          name: field.name, 
          type: 'select', 
          options: this.toOnes[field.name],
          display: field.display,
          id: 'id'
        }
      })
    },
    readonly() {
      const rights = api.user().role.rights
        .filter(right => right.tables=='*' || right.tables.search(this.type)!=-1)
        .filter(right => right.actions.indexOf('U')!=-1)
      return rights.length==0
    }
  },
  async mounted() {
    if (this.id !== 'new') {
      await this.load()
      this.$emit('update', Object.assign({}, this.item))
    }
  },
  methods: {
    initToOnes() {
      const result = {}
      this.fields
        .filter(field => field.type=='to-one')
        .forEach(field => result[field.name] = [])
      return result
    },
    async load() {
      this.loading = true
      const items = await api.find(this.type, {
        and: [{ id: this.id }],
        with: this.with
      })
      this.item = items[0]
      
      this.fields
        .filter(field => field.type=='to-one')
        .forEach(async field => this.toOnes[field.name] = await api.find(field.ref, { and: field.query || {} }))

      this.loading = false
    },
    async click(button) {
      button.action(this.item)
      if (button.andSave) this.save()
    },
    async createNewToOnes() {
      const newToOnes = this.fields
        .filter(f => f.type === 'to-one' && typeof this.item[f.name] === 'string')
      // Don't use foreach here - async!
      for (let i = 0; i < newToOnes.length; i++) {
        const f = newToOnes[i]
        const data = f.create ? f.create(this.item[f.name]) : { name: this.item[f.name] }
        const { id } = await api.create(f.ref, data)
        if (f.input) f.input(id)
        this.item[f.name] = id
      }
    },
    docsAdded(docs) {
      this.uploadDocs[docs.path] = {add:true, docs:docs.files}
    },
    docsRemoved(docs) {
      this.uploadDocs[docs.path] = {remove:true, docs:docs.files}
    },
    onChange(field) {
    },
    async save() {
      this.loading = true
      try {
        await this.createNewToOnes()
        if (this.item.id) {
          await api.update(this.type, this.item.id, this.item)
        } else {
          const result = await api.create(this.type, this.item)
          this.item.id = result.id
          const params = {}
          for (var key in this.$route.params) {
            const value = this.$route.params[key]
            if (value=='new') params[key] = result.id
            else params[key] = value
          }
          this.$router.push({
            name: this.$route.name,
            params: params
          })
        }
        const upload = Object.keys(this.uploadDocs)
          .filter(key => this.uploadDocs[key].add)
        if (upload.length>0) {
          const data = {}
          upload.forEach(key => data[key] = this.uploadDocs[key].docs)
          await api.createDocs(this.type, this.item.id, data)
        }
        const remove = Object.keys(this.uploadDocs)
          .filter(key => this.uploadDocs[key].remove)
          .map(key => this.uploadDocs[key].docs)
          .flat()
          .map(doc => doc.id)
        if (remove.length>0) {
          await api.removeDocs(this.type, this.item.id, remove.join(','))
        }
        if (this.reload) {
          this.load()
        }
      } catch (error) {
        this.$notify({
          title: 'Error',
          message: error.message,
          type: 'error',
          duration: 5000
        })
      }
      this.loading = false
      this.$emit('update', Object.assign({}, this.item))
      this.$emit('change', Object.assign({}, this.item))
    },
  }
}
</script>

<style lang="scss" scoped>
</style>
