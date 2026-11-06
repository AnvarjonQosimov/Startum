import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Database,
  HardDrive,
  Users,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Radio
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export function DocumentationPage() {
  const { currentProject } = useProject();
  const [activeDocSection, setActiveDocSection] = useState('getting-started');
  const [copiedKey, setCopiedKey] = useState(null);

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sections = [
    { id: 'getting-started', label: '1. Getting Started', icon: Zap },
    { id: 'sdk-setup', label: '2. SDK Installation', icon: Terminal },
    { id: 'database', label: '3. Database Operations', icon: Database },
    { id: 'realtime', label: '4. Real-time Subscriptions', icon: Radio },
    { id: 'storage', label: '5. Cloud File Storage', icon: HardDrive },
    { id: 'auth', label: '6. User Authentication', icon: Users },
    { id: 'security', label: '7. Security Rules', icon: ShieldCheck }
  ];

  const projectId = currentProject?.id || 'your-project-id';
  const apiKey = currentProject?.apiKey || 'st_live_xxxxxxxxxxxxxxxx';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Developer Documentation & SDK Reference</h1>
            <p className="text-xs text-slate-400">
              Interactive guides, copyable code samples, and architectural references for integrating Stratum BaaS.
            </p>
          </div>
        </div>

        <a
          href="/sdk/stratum-sdk.js"
          download
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stratum-800 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white hover:bg-stratum-750 transition-colors"
        >
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span>Download stratum-sdk.js</span>
        </a>
      </div>

      {/* 2-Column: Nav Sidebar & Content Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[600px]">
        {/* Navigation index */}
        <div className="md:col-span-3 space-y-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isCurrent = activeDocSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveDocSection(sec.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Documentation Content Pane */}
        <Card className="md:col-span-9 p-6 space-y-6">
          {/* Section 1: Getting Started */}
          {activeDocSection === 'getting-started' && (
            <div className="space-y-4 text-xs leading-relaxed">
              <div className="space-y-1">
                <Badge variant="cyan">OVERVIEW</Badge>
                <h2 className="text-lg font-bold text-white">Next-Gen Backend-as-a-Service Platform</h2>
                <p className="text-slate-300">
                  Stratum Cloud is a modular, high-throughput cloud platform designed to replace legacy BaaS systems.
                  It packages a document-oriented JSON database engine, multi-part encrypted cloud file storage, two-tier
                  JWT identity services, low-latency WebSocket real-time subscriptions, and a server-evaluated security rules engine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-stratum-950 border border-white/5 space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" /> Schemaless NoSQL Store
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Atomic ACID writes, subcollections, dot-path indexing, and multi-operator query engine.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-stratum-950 border border-white/5 space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-indigo-400" /> Real-time WebSocket Mesh
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Sub-20ms multiplexed socket channels push collection delta modifications directly to client apps.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: SDK Installation */}
          {activeDocSection === 'sdk-setup' && (
            <div className="space-y-4 text-xs">
              <Badge variant="cyan">INITIALIZATION</Badge>
              <h2 className="text-lg font-bold text-white">Client SDK Integration</h2>
              <p className="text-slate-300">
                You can import the Stratum SDK into your modern React, Vue, Next.js, or Node.js project, or include it directly
                via HTML script tag:
              </p>

              {/* Install instructions */}
              <div className="space-y-2">
                <span className="font-mono text-[11px] text-slate-400 font-bold">A. Direct Import (ESM)</span>
                <div className="relative group">
                  <pre className="p-3.5 rounded-xl bg-stratum-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto">
{`import { initializeApp } from "stratum-sdk";
import { getDatabase, collection, getDocs } from "stratum-sdk";

// Initialize your project connection
const app = initializeApp({
  projectId: "${projectId}",
  apiKey: "${apiKey}",
  endpoint: "${window.location.origin}"
});`}
                  </pre>
                  <button
                    onClick={() => copyCode(`import { initializeApp } from "stratum-sdk";\n\nconst app = initializeApp({\n  projectId: "${projectId}",\n  apiKey: "${apiKey}",\n  endpoint: "${window.location.origin}"\n});`, 'init')}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-stratum-800 border border-white/10 text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'init' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="font-mono text-[11px] text-slate-400 font-bold">B. HTML Script Tag</span>
                <pre className="p-3.5 rounded-xl bg-stratum-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto">
{`<script src="${window.location.origin}/sdk/stratum-sdk.js"></script>
<script>
  const { initializeApp, getDatabase } = window.Stratum;
  const app = initializeApp({ projectId: "${projectId}", apiKey: "${apiKey}" });
</script>`}
                </pre>
              </div>
            </div>
          )}

          {/* Section 3: Database */}
          {activeDocSection === 'database' && (
            <div className="space-y-4 text-xs">
              <Badge variant="cyan">DATABASE</Badge>
              <h2 className="text-lg font-bold text-white">Database Operations (CRUD & Queries)</h2>
              <p className="text-slate-300">
                Perform atomic queries, document creations, and updates against isolated NoSQL collections:
              </p>

              <div className="relative group">
                <pre className="p-3.5 rounded-xl bg-stratum-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`import { getDatabase, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "stratum-sdk";

const db = getDatabase(app);
const productsCol = collection(db, "products");

// 1. Create a Document
const newProduct = await addDoc(productsCol, {
  title: "Precision Ergonomic Mouse",
  price: 89.99,
  inventory: 45,
  inStock: true,
  tags: ["hardware", "ergonomic"]
});
console.log("Created doc with ID:", newProduct._id);

// 2. Query Documents with Filters & Sorting
const inStockProducts = await getDocs(productsCol, {
  filters: [{ field: "inStock", op: "==", value: true }],
  sortBy: "price",
  sortOrder: "asc",
  limit: 20
});

// 3. Update Existing Document
const itemRef = doc(productsCol, newProduct._id);
await updateDoc(itemRef, { price: 79.99 });

// 4. Delete Document
await deleteDoc(itemRef);`}
                </pre>
              </div>
            </div>
          )}

          {/* Section 4: Real-time */}
          {activeDocSection === 'realtime' && (
            <div className="space-y-4 text-xs">
              <Badge variant="indigo">REALTIME</Badge>
              <h2 className="text-lg font-bold text-white">Live WebSocket Subscriptions</h2>
              <p className="text-slate-300">
                Listen for live mutations on any collection or document. Whenever another client adds, modifies, or deletes
                a record, your callback fires immediately with the fresh state:
              </p>

              <pre className="p-3.5 rounded-xl bg-stratum-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`import { getDatabase, collection, onSnapshot } from "stratum-sdk";

const db = getDatabase(app);
const ordersCol = collection(db, "orders");

// Listen for all real-time changes
const unsubscribe = onSnapshot(ordersCol, (snapshot, event) => {
  console.log("Fresh real-time snapshot:", snapshot);
  if (event) {
    console.log(\`Action \${event.action} happened on \${event.docId}\`);
  }
});

// To stop listening:
// unsubscribe();`}
              </pre>
            </div>
          )}

          {/* Section 5: Storage */}
          {activeDocSection === 'storage' && (
            <div className="space-y-4 text-xs">
              <Badge variant="cyan">STORAGE</Badge>
              <h2 className="text-lg font-bold text-white">Cloud File Uploads & CDN Serving</h2>
              <p className="text-slate-300">
                Upload images, PDFs, videos, and arbitrary binaries with automatic MIME detection and public/private access tokens:
              </p>

              <pre className="p-3.5 rounded-xl bg-stratum-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`import { getStorage, ref, uploadFile, getDownloadURL } from "stratum-sdk";

const storage = getStorage(app);
const avatarRef = ref(storage, "/avatars/profile-user-1.png");

// Upload from HTML File input or Blob
const file = document.getElementById("fileInput").files[0];
const fileRecord = await uploadFile(avatarRef, file, {
  isPublic: true,
  metadata: { uploadedBy: "developer@stratum.dev" }
});

// Retrieve public CDN URL
const downloadUrl = await getDownloadURL(fileRecord);
console.log("Ready to embed in <img src='...'>:", downloadUrl);`}
              </pre>
            </div>
          )}

          {/* Section 6: Auth */}
          {activeDocSection === 'auth' && (
            <div className="space-y-4 text-xs">
              <Badge variant="emerald">AUTHENTICATION</Badge>
              <h2 className="text-lg font-bold text-white">End-User Identity & Claims</h2>
              <p className="text-slate-300">
                Register, authenticate, and manage users in your application with custom roles and JWT session tokens:
              </p>

              <pre className="p-3.5 rounded-xl bg-stratum-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`import { getAuth, signUp, signIn, onAuthStateChanged, signOut } from "stratum-sdk";

const auth = getAuth(app);

// 1. Sign Up New User
const session = await signUp(auth, "customer@example.com", "SecretPass123!", "Alex Customer");
console.log("JWT Token:", session.token);

// 2. Sign In
await signIn(auth, "customer@example.com", "SecretPass123!");

// 3. Listen to auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Signed in as:", user.displayName, user.customClaims?.role);
  } else {
    console.log("Signed out");
  }
});`}
              </pre>
            </div>
          )}

          {/* Section 7: Security Rules */}
          {activeDocSection === 'security' && (
            <div className="space-y-4 text-xs">
              <Badge variant="indigo">SECURITY</Badge>
              <h2 className="text-lg font-bold text-white">Declarative Security Rules Syntax</h2>
              <p className="text-slate-300">
                Rules are evaluated strictly server-side on every REST or SDK call. Context variables include:
                <code className="text-cyan-300 mx-1">auth</code> (user token or null),
                <code className="text-cyan-300 mx-1">resource</code> (target document or file), and
                <code className="text-cyan-300 mx-1">request</code>.
              </p>

              <pre className="p-3.5 rounded-xl bg-stratum-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`{
  "version": "2",
  "rules": {
    "database": {
      "products": {
        "read": "true",
        "write": "auth != null && auth.role == 'admin'"
      },
      "orders": {
        "read": "auth != null && (auth.uid == resource.userId || auth.role == 'admin')",
        "create": "auth != null",
        "update": "auth != null && auth.role == 'admin'"
      }
    },
    "storage": {
      "users/{userId}/*": {
        "read": "true",
        "write": "auth != null && auth.uid == userId"
      }
    }
  }
}`}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

