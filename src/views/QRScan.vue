<template>
    <div>
      <SecuritySidebar />
  
      <div class="main-content">
        <h2>QR Code Scanner</h2>
  
        <!-- Camera view for QR Code scanning -->
        <div id="qr-reader" class="qr-reader"></div>
  
        <!-- Scanning result -->
        <div v-if="scannedData" class="scanned-result">
          <h3>Scanned QR Code Data:</h3>
          <p>{{ scannedData }}</p>
        </div>
  
        <!-- Error Modal -->
        <div v-if="showModal" class="modal">
          <p>{{ modalMessage }}</p>
          <button @click="closeModal">Close</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import { Html5QrcodeScanner } from 'html5-qrcode'
  import SecuritySidebar from '@/components/securityComp/SecuritySidebar.vue'
  import { db } from '@/firebase'
  import { getAuth } from 'firebase/auth'
  import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'  

  export default {
    components: {
      SecuritySidebar,
    },
    setup() {
      const scannedData = ref('')
      const showModal = ref(false)
      const modalMessage = ref('')
      let qrScannerInstance = null
  
      // Function to close the modal
      const closeModal = () => {
        showModal.value = false
      }

      // Helper function to extract the document ID from the scanned URL
      const extractDocumentId = (url) => {
        const parts = url.split('/')
        return parts[parts.length - 1]
      }

      // Function to log the scanned QR code details in firestore
      const logScanToFirestore = async (decodedText) => {
        const auth = getAuth()
        const currentUser = auth.currentUser

        if(!currentUser){
          modalMessage.value = 'User not authenticated!'
          showModal.value = true
          return
        }

        try{

          const documentId = extractDocumentId(decodedText)

          // Fetch the QR code document from firestore to get the creator details
          const qrCodeDocRef = doc(db, 'guest_qrcodes', documentId)
          const qrCodeDoc = await getDoc(qrCodeDocRef)

          if(qrCodeDoc.exists()){
            const qrCodeData = qrCodeDoc.data()
            const qrCodeCreator = qrCodeData.createdBy

            // Log the scan details to the qr_scan_logs collection
            await addDoc(collection(db, 'qr_scan_logs'), {
              scannedBy: currentUser.email,
              qrCodeCreator: qrCodeCreator,
              scanData: decodedText,
              scanTime: serverTimestamp()
          })
          console.log('QR scan logged successfully')
          }

        } catch (error){
          console.error('Error logging QR scan:', error)
          modalMessage.value = 'Error logging QR scan'
          showModal.value = true
        }
      }
  
      // Initialize QR Code scanner
      const initializeQrScanner = () => {
        qrScannerInstance = new Html5QrcodeScanner(
          'qr-reader', // HTML element ID where the scanner should appear
          {
            fps: 10, // Frames per second
            qrbox: 250, // QR code scanning box size
          }
        );
  
        qrScannerInstance.render(
          async (decodedText) => {
            // This function gets called when a QR code is successfully scanned
            console.log(`QR Code scanned: ${decodedText}`);
            scannedData.value = decodedText;
            await logScanToFirestore(decodedText)
            qrScannerInstance.clear(); // Stop scanning after successful scan
          },
          (errorMessage) => {
            console.error(`QR Code scanning failed: ${errorMessage}`);
          }
        );
      };
  
      onMounted(() => {
        initializeQrScanner();
      });
  
      onBeforeUnmount(() => {
        // Clean up scanner if the component is destroyed
        if(qrScannerInstance){
          qrScannerInstance.clear()
          .then(() => {
            console.log("QR Code scanner cleared successfully.")
          })
          .catch((error) => {
            console.error("Error clearing QR Code scanner:", error)
          })
        }
      });
  
      return {
        scannedData,
        showModal,
        modalMessage,
        closeModal,
      };
    },
  };
  </script>
  
  <style>
  .qr-reader {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    border: 2px solid #ccc;
    border-radius: 10px;
    background-color: #f8f8f8;
  }
  
  .scanned-result {
    margin-top: 20px;
    padding: 10px;
    background-color: #dff0d8;
    border: 1px solid #3c763d;
    color: #3c763d;
    border-radius: 5px;
  }
  
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
  }
  </style>
  