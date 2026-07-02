import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean()
})

export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

export type SignupInput = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address')
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const recruiterSignupSchema = z.object({
  email: z.string().min(1, 'Company email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  hrName: z.string().min(1, 'HR Contact Name is required'),
  companyName: z.string().min(1, 'Company Name is required'),
  website: z.string().min(1, 'Website is required'),
  industry: z.string().min(1, 'Industry is required'),
  companySize: z.string().min(1, 'Company Size selection is required'),
  linkedin: z.string().min(1, 'LinkedIn URL is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

export type RecruiterSignupInput = z.infer<typeof recruiterSignupSchema>
