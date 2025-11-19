// Compatibility layer: Supabase client → Firebase
// This allows existing code to work with minimal changes

import { db, auth } from '../firebase/client'
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
  limit as firestoreLimit,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'

class SupabaseQueryBuilder {
  private collectionName: string
  private constraints: QueryConstraint[] = []
  private selectFields: string = '*'
  private singleDoc = false

  constructor(tableName: string) {
    this.collectionName = tableName
  }

  select(fields: string = '*') {
    this.selectFields = fields
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

  is(field: string, value: null) {
    this.constraints.push(where(field, '==', null))
    return this
  }

  in(field: string, values: any[]) {
    this.constraints.push(where(field, 'in', values))
    return this
  }

  contains(field: string, value: any) {
    this.constraints.push(where(field, 'array-contains', value))
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc'
    this.constraints.push(orderBy(field, direction))
    return this
  }

  limit(count: number) {
    this.constraints.push(firestoreLimit(count))
    return this
  }

  single() {
    this.singleDoc = true
    return this
  }

  async insert(data: any | any[]) {
    try {
      const dataArray = Array.isArray(data) ? data : [data]
      const results = []

      for (const item of dataArray) {
        const id = this.generateId()
        const docData = {
          ...item,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        await setDoc(doc(db, this.collectionName, id), docData)
        results.push(docData)
      }

      return { 
        data: Array.isArray(data) ? results : results[0], 
        error: null 
      }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  async update(data: any) {
    try {
      // Firestore update requires document ID from constraints
      // This is a limitation - we'll need to fetch first
      const { data: docs, error } = await this.execute()
      if (error || !docs) throw error

      const docsArray = Array.isArray(docs) ? docs : [docs]
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      }

      for (const document of docsArray) {
        await updateDoc(doc(db, this.collectionName, document.id), updateData)
      }

      return { data: docsArray, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  async delete() {
    try {
      const { data: docs, error } = await this.execute()
      if (error || !docs) throw error

      const docsArray = Array.isArray(docs) ? docs : [docs]

      for (const document of docsArray) {
        await deleteDoc(doc(db, this.collectionName, document.id))
      }

      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  private async execute() {
    try {
      const collectionRef = collection(db, this.collectionName)

      if (this.constraints.length === 0) {
        const snapshot = await getDocs(collectionRef)
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        if (this.singleDoc) {
          return { data: data[0] || null, error: null }
        }
        return { data, error: null }
      }

      const q = query(collectionRef, ...this.constraints)
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      if (this.singleDoc) {
        return { data: data[0] || null, error: null }
      }

      return { data, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  // Make thenable to support await
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected)
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<any | TResult> {
    return this.execute().then(undefined, onrejected)
  }

  finally(onfinally?: (() => void) | null): Promise<any> {
    return this.execute().then(
      value => {
        if (onfinally) onfinally()
        return value
      },
      reason => {
        if (onfinally) onfinally()
        throw reason
      }
    )
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const supabase = {
  from: (table: string) => new SupabaseQueryBuilder(table),
  
  auth: {
    getUser: async () => {
      const user = auth.currentUser
      if (!user) {
        return { data: { user: null }, error: null }
      }
      
      return {
        data: {
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: {
              full_name: user.displayName,
            }
          }
        },
        error: null
      }
    },
    
    signOut: async () => {
      try {
        await signOut(auth)
        // Clear session cookie
        await fetch('/api/auth/session', { method: 'DELETE' })
        return { error: null }
      } catch (error: any) {
        return { error }
      }
    }
  },

  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        // TODO: Implement Firebase Storage
        return { data: null, error: new Error('Storage not implemented') }
      },
      getPublicUrl: (path: string) => {
        return { data: { publicUrl: path } }
      },
      remove: async (paths: string[]) => {
        return { data: null, error: null }
      }
    })
  }
}
