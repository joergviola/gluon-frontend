<template>
    <div class="grid">
        <div class="header">
            <app-header />
        </div>
            <div class="sidebar">
                <router-menu />
                <router-menu :bottom="true" />
                <div style="text-align: center; font-size: 70%; padding-bottom: 10px">
                    <router-link to="/version"><span>gluon 21.07.20</span></router-link>
                </div>
            </div>
            <div class="content">
                <transition name="content">
                    <router-view ></router-view>
                </transition>
            </div>
    </div>
</template>

<script>
import Header from './gl-header'
import RouterMenu from './gl-routerMenu'

export default {
  name: 'default-layout',
  components: {
    'app-header': Header,
    RouterMenu
  }
}
</script>

<style scoped>

.grid {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: grid;
  grid-template-columns: 150px 1fr;
  grid-template-rows: 60px 1fr;
  grid-template-areas: 
    "header header"
    "sidebar content";
}

.grid .header {
    grid-area: header;
    border-bottom: 1px solid #DDDDDD; 
    padding: 0;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
}

.grid .sidebar {
    grid-area: sidebar;
    background-color:#666666;
    display: flex; 
    flex-direction: column; 
    justify-content: space-between;
}

.grid .sidebar a {
   color: white;
}

.grid .content {
    grid-area: content;
    overflow: scroll;
    padding: 20px;
}

</style>