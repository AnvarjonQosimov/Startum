# Stratum Developer SDK

Next-Generation Backend-as-a-Service Client Library for JavaScript and TypeScript.

## Installation

```bash
# npm
npm install stratum-sdk

# or direct script tag in HTML:
<script src="http://localhost:5000/sdk/stratum-sdk.js"></script>
```

## Quick Start

```javascript
import { initializeApp } from "stratum-sdk";
import { getDatabase, collection, addDoc, getDocs, onSnapshot } from "stratum-sdk";
import { getStorage, ref, uploadFile, getDownloadURL } from "stratum-sdk";
import { getAuth, signIn, signUp, onAuthStateChanged } from "stratum-sdk";

// 1. Initialize your project
const app = initializeApp({
  projectId: "apex-commerce-cloud-xxxxxx",
  apiKey: "st_live_xxxxxxxxxxxxxxxx",
  endpoint: "http://localhost:5000"
});

// 2. Database (NoSQL Document Store)
const db = getDatabase(app);
const productsCol = collection(db, "products");

// Add a document
const newProduct = await addDoc(productsCol, {
  title: "Wireless ANC Headphones",
  price: 299.99,
  inStock: true
});

// Query documents
const allProducts = await getDocs(productsCol, {
  filters: [{ field: "inStock", op: "==", value: true }],
  sortBy: "price",
  sortOrder: "asc"
});

// Live Real-Time Subscriptions (WebSocket)
const unsubscribe = onSnapshot(productsCol, (docs) => {
  console.log("Realtime products update:", docs);
});

// 3. Cloud Storage
const storage = getStorage(app);
const avatarRef = ref(storage, "/avatars/profile.png");
const fileRecord = await uploadFile(avatarRef, fileBlob);
const publicUrl = await getDownloadURL(fileRecord);

// 4. Authentication
const auth = getAuth(app);
const userSession = await signIn(auth, "developer@stratum.dev", "secret123");
onAuthStateChanged(auth, (user) => {
  console.log("Current user:", user);
});
```

