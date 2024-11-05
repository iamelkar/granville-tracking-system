<template>
  <div>
    <SecuritySidebar />

    <div class="main-content">
      <h2>QR Code Scanner</h2>

      <div id="qr-reader" class="qr-reader"></div>

      <div v-if="scannedData" class="scanned-result">
        <h3>Scanned QR Code Data:</h3>
        <a :href="scannedData" target="_blank" rel="noopener noreferrer">{{
          scannedData
        }}</a>
      </div>

      <div v-if="showModal" class="modal">
        <p>{{ modalMessage }}</p>
        <button @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Html5QrcodeScanner } from "html5-qrcode";
import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
import { db } from "@/firebase";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export default {
  components: {
    SecuritySidebar,
  },
  setup() {
    const scannedData = ref("");
    const showModal = ref(false);
    const modalMessage = ref("");
    const isProcessingScan = ref(false);
    let qrScannerInstance = null;

    const closeModal = () => {
      showModal.value = false;
    };

    const extractDocumentId = (url) => {
      const parts = url.split("/");
      return parts[parts.length - 1];
    };

    const logScanToFirestore = async (decodedText) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        modalMessage.value = "User not authenticated!";
        showModal.value = true;
        return;
      }

      try {
        const documentId = extractDocumentId(decodedText);
        const qrCodeDocRef = doc(db, "guest_qrcodes", documentId);
        const qrCodeDoc = await getDoc(qrCodeDocRef);

        if (qrCodeDoc.exists()) {
          const qrCodeData = qrCodeDoc.data();
          const scanTime = new Date();
          const expirationTime = new Date(
            qrCodeData.expirationTime.seconds * 1000
          );
          const startTime = qrCodeData.startDate
            ? new Date(qrCodeData.startDate.seconds * 1000)
            : new Date(qrCodeData.createdAt.seconds * 1000);

          let message = "successful entry";
          let additionalDetails = null;

          if (scanTime < startTime) {
            message = "invalid";
            additionalDetails = "Scan attempted before the allowed start time.";
          } else if (scanTime > expirationTime) {
            message = "invalid";
            additionalDetails = "QR code has expired.";
          }

          await addDoc(collection(db, "qr_scan_logs"), {
            scannedBy: currentUser.email,
            qrCodeCreator: qrCodeData.createdBy,
            guestName: qrCodeData.guestName,
            category: qrCodeData.category,
            scanData: decodedText,
            scanTime: serverTimestamp(),
            message,
            additionalDetails,
          });

          if (message === "successful entry") {
            modalMessage.value = "Access Granted: Entry Successful!";
          } else {
            modalMessage.value = `Access Denied: ${additionalDetails}`;
          }
          showModal.value = true;
          console.log("QR scan logged successfully");
        } else {
          modalMessage.value = "QR code not found in the system.";
          showModal.value = true;
        }
      } catch (error) {
        console.error("Error logging QR scan:", error);
        modalMessage.value = "Error logging QR scan";
        showModal.value = true;
      }
    };

    const initializeQrScanner = () => {
      qrScannerInstance = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: 250,
      });

      qrScannerInstance.render(
        async (decodedText) => {
          if (isProcessingScan.value) return;
          isProcessingScan.value = true;
          scannedData.value = decodedText;

          await logScanToFirestore(decodedText);

          qrScannerInstance.clear();

          setTimeout(() => {
            isProcessingScan.value = false;
          }, 2000);
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
      if (qrScannerInstance) {
        qrScannerInstance
          .clear()
          .then(() => {
            console.log("QR Code scanner cleared successfully.");
          })
          .catch((error) => {
            console.error("Error clearing QR Code scanner:", error);
          });
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
