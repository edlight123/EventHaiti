// Helper functions to convert between Supabase-style queries and Firestore
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  WhereFilterOp,
  QueryConstraint,
  Timestamp,
  DocumentData
} from 'firebase/firestore'
import { db } from './client'
import { adminDb } from './admin'

export class FirestoreQueryBuilder {
  private collectionName: string
  private constraints: QueryConstraint[] = []
  private selectFields: string[] = []
  private singleResult = false
  private useAdminDb = false

  constructor(collectionName: string, useAdmin = false) {
    this.collectionName = collectionName
    this.useAdminDb = useAdmin
  }

  select(fields: string) {
    // Firestore doesn't support field selection like SQL
    // We'll fetch all fields and filter after
    this.selectFields = fields === '*' ? [] : fields.split(',').map(f => f.trim())
    return this
  }

  eq(field: string, value: any) {
    this.constraints.push(where(field, '==', value))
    return this
  }

  neq(field: string, value: any) {
    this.constraints.push(where(field, '!=', value))
    return this
  }

  gt(field: string, value: any) {
    this.constraints.push(where(field, '>', value))
    return this
  }

  gte(field: string, value: any) {
    this.constraints.push(where(field, '>=', value))
    return this
  }

  lt(field: string, value: any) {
    this.constraints.push(where(field, '<', value))
    return this
  }

  lte(field: string, value: any) {
    this.constraints.push(where(field, '<=', value))
    return this
  }

  in(field: string, values: any[]) {
    this.constraints.push(where(field, 'in', values))
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc'
    this.constraints.push(orderBy(field, direction))
    return this
  }

  limitTo(count: number) {
    this.constraints.push(limit(count))
    return this
  }

  single() {
    this.singleResult = true
    return this
  }

  async execute() {
    const database = this.useAdminDb ? adminDb : db
    const collectionRef = this.useAdminDb 
      ? database.collection(this.collectionName)
      : collection(database, this.collectionName)

    if (this.singleResult && this.constraints.length === 0) {
      // If single result and no constraints, we need an ID
      throw new Error('Single result requires constraints or document ID')
    }

    if (this.constraints.length === 0) {
      // Get all documents
      const snapshot = this.useAdminDb
        ? await (collectionRef as any).get()
        : await getDocs(collectionRef as any)
      
      const data = this.useAdminDb
        ? snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
        : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      return { data, error: null }
    }

    // Build query with constraints
    const q = this.useAdminDb
      ? (collectionRef as any).where(this.constraints[0] as any)
      : query(collectionRef as any, ...this.constraints)

    try {
      const snapshot = this.useAdminDb
        ? await this.executeAdminQuery(collectionRef as any, this.constraints)
        : await getDocs(q)
      
      const data = this.useAdminDb
        ? snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
        : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      if (this.singleResult) {
        return { data: data[0] || null, error: null }
      }

      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  private async executeAdminQuery(collectionRef: any, constraints: QueryConstraint[]) {
    let q = collectionRef
    
    for (const constraint of constraints) {
      const c = constraint as any
      if (c.type === 'where') {
        q = q.where(c.fieldPath, c.op, c.value)
      } else if (c.type === 'orderBy') {
        q = q.orderBy(c.fieldPath, c.direction)
      } else if (c.type === 'limit') {
        q = q.limit(c.limit)
      }
    }
    
    return await q.get()
  }
}

// Supabase-style API wrapper for Firestore
export function from(collectionName: string, useAdmin = false) {
  return new FirestoreQueryBuilder(collectionName, useAdmin)
}

// Helper to insert document
export async function insert(collectionName: string, data: any, useAdmin = false) {
  try {
    const database = useAdmin ? adminDb : db
    const id = generateId()
    const docData = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (useAdmin) {
      await database.collection(collectionName).doc(id).set(docData)
    } else {
      await setDoc(doc(database, collectionName, id), docData)
    }

    return { data: docData, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

// Helper to update document
export async function update(collectionName: string, id: string, data: any, useAdmin = false) {
  try {
    const database = useAdmin ? adminDb : db
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    if (useAdmin) {
      await database.collection(collectionName).doc(id).update(updateData)
    } else {
      await updateDoc(doc(database, collectionName, id), updateData)
    }

    return { data: updateData, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

// Helper to delete document
export async function remove(collectionName: string, id: string, useAdmin = false) {
  try {
    const database = useAdmin ? adminDb : db

    if (useAdmin) {
      await database.collection(collectionName).doc(id).delete()
    } else {
      await deleteDoc(doc(database, collectionName, id))
    }

    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

// Helper to get single document by ID
export async function getById(collectionName: string, id: string, useAdmin = false) {
  try {
    const database = useAdmin ? adminDb : db

    if (useAdmin) {
      const docSnap = await database.collection(collectionName).doc(id).get()
      if (!docSnap.exists) {
        return { data: null, error: 'Document not found' }
      }
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null }
    } else {
      const docSnap = await getDoc(doc(database, collectionName, id))
      if (!docSnap.exists()) {
        return { data: null, error: 'Document not found' }
      }
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null }
    }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

// Generate unique ID (similar to UUID)
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
