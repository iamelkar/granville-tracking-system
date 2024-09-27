<template>
  <div class="home">
    <div class="login-container">
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="EMAIL" />
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

        <button type="submit">LOGIN</button>
      </form>
      <p v-if="error" class="error"> {{ error }}</p>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref } from 'vue';
import { useRouter } from 'vue-router'; // Import useRouter

export default {
  name: 'LoginView',
  setup() {
    const email = ref('');
    const password = ref('');
    const role = ref('admin'); // Default role
    const error = ref('');

    const auth = getAuth();
    const router = useRouter(); // Get the router instance

    const handleLogin = async () => {
      try {
        // Sign in the user with Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
        const user = userCredential.user;

        console.log('Logged-in user UID:', user.uid);

        // Fetch the user's role from Firestore using the user UID
        const userDocRef = doc(db, 'users', user.uid); // DocumentReference
        const userDoc = await getDoc(userDocRef); // DocumentSnapshot

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('User data:', userData);

          if (userData.role === role.value) {
            console.log(`Successful "${role.value}" user login`);
            // Use router.push instead of this.$router.push
            if (role.value === 'admin') {
              router.push({ name: 'dashboard' });
            } else if (role.value === 'resident') {
              router.push({ name: 'user-dashboard' });
            } else if (role.value === 'security') {
              router.push({ name: 'security-dashboard' });
            }
          } else {
            error.value = `Role mismatch! You selected "${role.value}" but your role is "${userData.role}"`;
          }
        } else {
          console.error('No user data found in Firestore!');
          error.value = 'User data not found in Firestore!';
        }
      } catch (err) {
        console.error('Login failed:', err.message);
        error.value = `Login failed: ${err.message}`;
      }
    };

    return {
      email,
      password,
      role,
      error,
      handleLogin
    };
  }
};

</script>

<style scoped>
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

label {
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
