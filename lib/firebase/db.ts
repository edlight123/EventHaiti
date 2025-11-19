// Database client that mimics Supabase API but uses Firestore
import { from, insert, update, remove, getById } from './helpers'

export function createClient() {
  return {
    from: (table: string) => from(table, false),
    
    auth: {
      getUser: async () => {
        // This should be handled by Firebase Auth on client
        return { data: { user: null }, error: 'Use Firebase Auth directly' }
      },
      signOut: async () => {
        // Handled by Firebase Auth
        return { error: null }
      }
    },

    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File) => {
          // Firebase Storage implementation needed
          return { data: null, error: 'Use Firebase Storage directly' }
        },
        getPublicUrl: (path: string) => {
          return { data: { publicUrl: '' } }
        }
      })
    }
  }
}

// Server-side client (uses admin SDK)
export function createServerClient() {
  return {
    from: (table: string) => from(table, true),
    
    insert: (table: string, data: any) => insert(table, data, true),
    update: (table: string, id: string, data: any) => update(table, id, data, true),
    delete: (table: string, id: string) => remove(table, id, true),
    getById: (table: string, id: string) => getById(table, id, true),
  }
}
