<template>
  <div class="home">
    <!-- This is where login.vue should be -->
    <div class="login-container">
      <form @submit.prevent="handleLogin">
        <input v-model="username" placeholder="USERNAME" />
        <br>
        <input v-model="password" type="password" placeholder="PASSWORD" />
        <br>

        <label for="role">Role:</label>
        <select v-model="role" id="role">
          <option value="admin">Admin</option>
          <option value="resident">Resident</option>
          <option value="security">Security</option>
        </select>
        <br><br>

        <a href="#">Forgot password?</a>
        <br><br>

        <button @click="redirect">LOGIN</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data() {
    return {
      username: '',
      password: '',
      role: ''
    }
  },
  methods: {
    redirect() {
      if (this.username === 'admin' && 
      this.password === 'admin' && 
      this.role === 'admin') {
        this.$router.push({ name: 'dashboard' });
      } 
      else if (this.username === this.username && 
      this.password === this.password && 
      this.role === 'resident') {
        this.$router.push({ name: 'user-dashboard' });
      }
      else if (this.username === this.username && 
      this.password === this.password && 
      this.role === 'security') {
        this.$router.push({ name: 'security-dashboard' });
      }
      else {
        alert('Access denied');
      }
    }
  }
}
</script>

<style>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #00bfa5;
}

input {
  display: block;
  background: #00bfa5;
  margin-bottom: 10px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  font-size: large;
  border-radius: 5px;
  border: 1px solid white;
  padding: 10px;
  width: 100%;
}

a {
  text-decoration: none;
  color: gray;
}

button {
  width: 100%;
  background: rgb(252, 139, 97);
  padding: 10px;
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

button:hover {
  background-color: rgb(240, 120, 80);
}

label{
  font-weight: bold;
}

select {
  display: block;
  background: #00bfa5;
  color: white;
  border: 1px solid white;
  padding: 10px;
  border-radius: 5px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  width: 100%;
  margin-bottom: 10px;
  appearance: none; /* Removes default dropdown arrow */
  -webkit-appearance: none;
  -moz-appearance: none;
  text-align: center;
  font-size: large;
}

select:focus {
  outline: none;
  border-color: #fff;
}

option {
  color: #333;
  background-color: #fff;
  text-align: center;
}
</style>
