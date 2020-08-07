<template>
  <div class="about">
    <el-card v-loading="loading">
      <h1>Register new organisation</h1>
        <el-form ref="form" :model="this" :rules="validation">
          <el-form-item prop="orgname" label="Name of organisation">
            <el-input v-model="orgname" />
          </el-form-item>
          <el-form-item prop="name" label="Name of admin user">
            <el-input v-model="name" />
          </el-form-item>
          <el-form-item prop="email" label="E-Mail">
            <el-input v-model="email" />
          </el-form-item>
          <el-form-item prop="password" label="Password">
            <el-input v-model="password" show-password />
          </el-form-item>
          <el-form-item prop="confirmation" label="Confirmation">
            <el-input v-model="confirmation" show-password />
          </el-form-item>
          <el-button type="primary" @click="register">Register</el-button>
        </el-form>
    </el-card>
  </div>
</template>

<script>

import api from 'gluon-api'

export default {
  name: 'Login',
  data() {
    return {
      orgname :null,
      name :null,
      email :null,
      password: null,
      confirmation: null,
      loading: false,
      validation: {
          orgname: [
            { required: true, trigger: 'blur' },
          ],
          name: [
            { required: true, trigger: 'blur' },
          ],
          email: [
            { required: true, trigger: 'blur' },
          ],
          password: [
            { required: true, trigger: 'blur' },
          ],
          confirmation: [
            { validator: (rule, value, callback) => {
              if (value !== this.password) {
                callback(new Error('Please confirm password!'));
              } else {
                callback()
              }
            }, trigger: 'blur' },
          ],
      }
    }
  },
  methods: {
    async register() {
      this.$refs.form.validate(async (valid) => {
        if (!valid) {
          this.$notify.error({
            title: 'Not valid',
            message: 'Please enter all required information'
          });
          return false;
        }
        try {
          this.loading = true
          const result = await api.register(this.orgname, this.name, this.email, this.password)
          this.$router.push("/login")
        } catch (error) {
          this.$notify.error({
            title: 'Could not register',
            message: error.message
          });
        }
        this.loading = false
      });
    }
  }
}
</script>