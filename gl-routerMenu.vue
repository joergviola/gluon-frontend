<template>
   <div v-if="user" :style="styles">
      <el-menu>
         <el-menu-item 
         v-for="(route, i) in $router.options.routes" 
         v-if="showItem(route)" 
         :key="i" 
         :index="'item-'+i">
            <router-link :to="route.path">
               <i v-if="route.meta.icon" :class="route.meta.icon"></i>
               <span>{{$t('route.'+route.name)}}</span>
               </router-link>
         </el-menu-item>
      </el-menu>
   </div>
</template>

<script>

import api from '@/api'

export default {
    name: "RouteMenu",
    props: ['bottom'],
    data: function() {
       return {
          user: api.user()
       }
    },
    computed: {
       styles() {
          const result = {
             display: 'flex'
          }
          if (!this.bottom) result['flex-grow'] = 1
          return result;
       }
    },
    methods: {
       showItem(route) {
          const meta = route.meta
          const role = this.user.role
          if (meta && meta.roles) {
             if (meta.roles.indexOf(role.name)==-1) return false
          }
          if (meta && meta.rights) {
             const right = role.rights.find(r => meta.rights.indexOf(r.actions)!=-1)
             if (!right) return false
          }
          return !meta.hidden && meta.bottom==this.bottom
       }
    }
}
</script>

<style scoped>
.el-menu {
   background-color: transparent;
   border: none;
   color: white;
   width: 100%;
}

.el-menu-item:hover {
   background-color: #777777;
}

.el-menu-item.is-active {
   font-weight: bold;
}

a {
   color: white;
}
</style>