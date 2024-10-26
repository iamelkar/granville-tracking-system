<template>
    <div>
      <!-- Fixed Sidebar on the left -->
      <UserSideNav/>
  
      <!-- Main content on the right -->
      <div class="main-content">
        <h1>VIEW USER AND GUEST LOGS</h1>

        <div v-if="logs.length === 0">
          <p>No scans found for your account</p>
        </div>

        <div v-else>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Scanned At</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td>{{ log.guestName || 'N/A'}}</td>
                <td>{{ log.category || 'N/A'}}</td>
                <td>{{ log.scanTime?.seconds ? new Date(log.scanTime.seconds * 1000).toLocaleString() : 'Unknown' }}</td>
                <td>
                  <span v-if="!isAccessDenied(log)" class="access-granted">Access Granted</span>
                  <span v-else class="access-failed">Access Failed</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import UserSideNav from '@/components/user/UserSideNav.vue';
  import { db, auth } from '@/firebase';
  import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';

  export default {
    components: { 
      UserSideNav
    },
    data(){
      return{
        logs: [],
        expirationTimes: {}
      }
    },
    methods:{
      // Function to fetch expiration time for each QR code
      async fetchExpirationTimes(logs) {
        const expirationTimes = {}

        for (const log of logs) {
          if (log.scanData) { // Ensure log has valid scanData
          try {
            const qrCodeDocRef = doc(db, 'guest_qrcodes', log.scanData)
            const qrCodeDoc = await getDoc(qrCodeDocRef)

            if (qrCodeDoc.exists()) {
              expirationTimes[log.scanData] = qrCodeDoc.data().expirationTime
            } else {
              console.error(`No QR code document found for ID: ${log.scanData}`)
            }
          } catch (error) {
              console.error('Error fetching expiration time:', error)
            }
          }
        }

        this.expirationTimes = expirationTimes;
      },

      // Compare scanTime and expirationTime
      isAccessDenied(log) {
        const expirationTime = this.expirationTimes[log.scanData] // Use log.scanData as the key
        if (!expirationTime || !log.scanTime?.seconds) {
          return true
        }

        const scanTimeMs = log.scanTime.seconds * 1000
        const expirationTimeMs = expirationTime.seconds * 1000

        // Return true if the scanTime is greater than the expirationTime (i.e., scan happened after expiration)
        return scanTimeMs > expirationTimeMs
      },
    },  
    async created(){
      // Get the current logged in user
      const currentUser = auth.currentUser

      if(currentUser){
        try{
          // Query Firestore for the logs where the current user created the QR code
          const logsQuery = query(
            collection(db, 'qr_scan_logs'),
            where('qrCodeCreator', '==', currentUser.email),
            orderBy('scanTime', 'desc')
          )

          const querySnapshot = await getDocs(logsQuery)
          const logs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

          this.logs = logs

          // Fetch expiration times for each QR code in the logs
          await this.fetchExpirationTimes(logs)
        }
        catch(error){
          console.error('Error fetching logs:', error);
        }
      }
      else {
        console.error('No user logged in')
      }
    }
  };
  </script>
  
  <style>

  .access-granted {
    color: green;
    font-weight: bold;
  }

  .access-failed {
    color: red;
    font-weight: bold;
  }

  /* General reset to avoid padding/margin issues */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  /* Style for the container */
  body {
    font-family: Arial, sans-serif;
  }
  
  /* Sidebar styles */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 300px; /* Fixed width of the sidebar */
    height: 100vh; /* Full viewport height */
    background-color: #2c3e50;
    color: white;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 1000; /* Keeps the sidebar above the main content */
  }
  
  /* Main content area */
  .main-content {
    margin-left: 250px; /* Make room for the fixed sidebar */
    padding: 20px;
    background-color: #00bfa5;
    height:100vh;
  }
  
  h1 {
    font-size: 36px;
    color: #333;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }

  th, td {
    border: 1px solid #ccc;
    padding: 10px;
    text-align: left;
  }

  th {
    background-color: #f4f4f4;
  }

  tr:nth-child(even) {
    background-color: #f9f9f9;
  }
  
  /* Additional styling for responsiveness */
  @media (max-width: 768px) {
    .sidebar {
      width: 200px; /* Adjust sidebar width on smaller screens */
    }
  
    .main-content {
      margin-left: 200px; /* Adjust content margin accordingly */
    }
  }
  </style>
  