import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id:        string
    email:     string
    name?:     string | null
    role:      string
    vendorId?: string
    region?:   string
  }
  interface Session {
    user: DefaultSession['user'] & {
      id:        string
      role:      string
      vendorId?: string
      region?:   string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:        string
    role:      string
    vendorId?: string
    region?:   string
  }
}
