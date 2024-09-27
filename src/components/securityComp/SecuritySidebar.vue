<template>
    <div class="sidebar" @click.self="closeSidebar">
      <!-- Welcome message -->
      <div class="welcome">
        <h2>Welcome, Security!</h2>
      </div>
  
      <!-- Navigation buttons -->
      <nav class="nav">
        <ul>
          <li>
            <router-link to="/security-dashboard">Dashboard</router-link>
          </li>
          <li>
            <router-link to="/secu-qrcode-generator">QR Code Generate</router-link>
          </li>
          <li>
            <router-link to="/user-logs">Logs</router-link>
          </li>
        </ul>
      </nav>
  
      <div class="log-out">
        <button @click="redirect">Log Out</button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    // props: ['showSidebar'],
    data(){
        return{
            firstName: '',
        }
    },
    methods: {
        redirect() {
            this.$router.push({name: 'home'})
        }
    }
  };
  </script>

  <style>

  .sidebar {
    width: 300px;
    height: 100vh;
    background-color: #2c3e50;
    color: white;
    display: flex;
    flex-direction: column;
    padding: 20px;
  }
  
  .welcome {
    margin-bottom: 30px;
    text-align: center;
    font-size: 30px;
  }

  .nav{
    margin: 0;
    padding: 0;
  }
  
  .nav ul {
    list-style-type: none;
    padding: 0;
  }
  
  .nav li {
    margin: 15px 0;
    padding-top: 15px;
    width: 100%;
  }
  
  .nav li a {
    color: white;
    text-decoration: none;
    font-size: 16px;
    padding: 20px;
  }
  
  .nav li a:hover {
    text-decoration: underline;
  }

  .nav a.router-link-exact-active {
    background-color: skyblue; /* Active background color */
    color: white; /* Active text color */
    width: 100%; /* Ensure the link fills the entire li */
    display: block; /* Block ensures the link takes full width */
    padding: 10px; /* Keep padding consistent */
    box-sizing: border-box; /* Include padding in width calculation */
    border-radius: 20px; 
}
  
  .log-out {
    margin-top: auto;
    text-align: center;
    padding: 0;
  }
  
  .log-out button {
    padding: 10px 20px;
    font-size: 16px;
    background-color: #e74c3c;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 5px;
  }
  
  .log-out button:hover {
    background-color: #c0392b;
  }
  </style>
  