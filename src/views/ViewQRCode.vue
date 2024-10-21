<template>
    <div>
      <h2>QR Code Details</h2>
      <div v-if="qrCodeDetails">
        <!-- Display the guest's image -->
        <div v-if="qrCodeDetails.imageUrl" class="guest-image">
          <img :src="qrCodeDetails.imageUrl" alt="Guest Image" />
        </div>
        <p><strong>Guest Name:</strong> {{ qrCodeDetails.guestName }}</p>
        <p><strong>Category:</strong> {{ qrCodeDetails.category }}</p>
        <p><strong>Expiration Time:</strong> {{ new Date(qrCodeDetails.expirationTime.seconds * 1000).toLocaleString() }}</p>
        
        <p v-if="isExpired" class="expired-text">GUEST PASS EXPIRED</p>
        <p v-else class="valid-text">GUEST PASS VALID</p>
      </div>
    </div>
  </template>
  
  <script>
  import { doc, getDoc } from 'firebase/firestore';
  import { db } from '@/firebase';
  
  export default {
    data() {
      return {
        qrCodeDetails: null, // Store the fetched QR code details
        isExpired: false,
        expirationDate: ''
      };
    },
    async created() {
      const qrCodeDocumentId = this.$route.params.documentId; // Get document ID from URL
  
      try {
        const qrCodeDocRef = doc(db, 'guest_qrcodes', qrCodeDocumentId);
        const qrCodeDoc = await getDoc(qrCodeDocRef);
  
        if (qrCodeDoc.exists()) {
          const data = qrCodeDoc.data(); // Fetch and store the latest QR code details
          this.qrCodeDetails = data;

          // Check if the QR code has expired
          const now = new Date();
          const expirationTime = new Date(data.expirationTime.seconds * 1000);
          this.expirationDate = expirationTime.toLocaleString();
          this.isExpired = now > expirationTime;
        } else {
          console.error('No such QR code document exists.');
        }
      } catch (error) {
        console.error('Error fetching QR code details:', error);
      }
    },
  };
  </script>

  <style scoped>
  .guest-image {
    margin-top: 20px;
  }
  
  .guest-image img {
    max-width: 200px;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  .expired-text {
  color: red;
  font-size: 24px;
  font-weight: bold;
  margin-top: 20px;
}
.valid-text {
  color: green;
  font-size: 24px;
  font-weight: bold;
  margin-top: 20px;
}
  </style>
  