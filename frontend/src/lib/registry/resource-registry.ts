import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  ChartColumnIncreasing,
  ClipboardList,
  FileStack,
  Shield,
  Users,
} from 'lucide-react'

import type { ResourceRecord } from '@/types'

export interface ResourceFieldDefinition {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select'
  placeholder?: string
  options?: Array<{ label: string; value: string }>
}

export interface ResourceColumnDefinition {
  id: keyof ResourceRecord | string
  label: string
}

export interface ResourceDefinition {
  key: string
  title: string
  description: string
  icon: LucideIcon
  columns: ResourceColumnDefinition[]
  formFields: ResourceFieldDefinition[]
}

export const resourceRegistry: ResourceDefinition[] = [
  {
    key: 'analyses',
    title: 'Analysis Sessions',
    description: 'Structured analysis sessions exposed through the backend registry.',
    icon: ClipboardList,
    columns: [
      { id: 'title', label: 'Problem' },
      { id: 'subtitle', label: 'Mode' },
      { id: 'status', label: 'Status' },
      { id: 'updatedAt', label: 'Updated' },
    ],
    formFields: [
      { id: 'title', label: 'Problem statement', type: 'textarea', placeholder: 'Describe the decision' },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Clarifying', value: 'CLARIFYING' },
          { label: 'Analyzing', value: 'ANALYZING' },
          { label: 'Completed', value: 'COMPLETED' },
        ],
      },
    ],
  },
  {
    key: 'users',
    title: 'Users',
    description: 'Users routed through the generic CRUD generator.',
    icon: Users,
    columns: [
      { id: 'title', label: 'Name' },
      { id: 'subtitle', label: 'Email' },
      { id: 'status', label: 'Roles' },
      { id: 'updatedAt', label: 'Last active' },
    ],
    formFields: [
      { id: 'title', label: 'Display name', type: 'text' },
      { id: 'subtitle', label: 'Email', type: 'text' },
      { id: 'status', label: 'Roles', type: 'text' },
    ],
  },
  {
    key: 'roles',
    title: 'Roles',
    description: 'Role definitions for RBAC and admin mapping.',
    icon: Shield,
    columns: [
      { id: 'title', label: 'Role' },
      { id: 'subtitle', label: 'Description' },
      { id: 'status', label: 'Members' },
      { id: 'updatedAt', label: 'Updated' },
    ],
    formFields: [
      { id: 'title', label: 'Role name', type: 'text' },
      { id: 'subtitle', label: 'Description', type: 'textarea' },
      { id: 'status', label: 'Status', type: 'text', placeholder: 'e.g. active' },
    ],
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Operational alerts and end-user push messages.',
    icon: Bell,
    columns: [
      { id: 'title', label: 'Title' },
      { id: 'subtitle', label: 'Message' },
      { id: 'status', label: 'Read state' },
      { id: 'updatedAt', label: 'Created' },
    ],
    formFields: [
      { id: 'title', label: 'Title', type: 'text' },
      { id: 'subtitle', label: 'Message', type: 'textarea' },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Unread', value: 'unread' },
          { label: 'Read', value: 'read' },
        ],
      },
    ],
  },
  {
    key: 'files',
    title: 'Files',
    description: 'Uploadable artifacts surfaced through the file manager.',
    icon: FileStack,
    columns: [
      { id: 'title', label: 'Filename' },
      { id: 'subtitle', label: 'MIME' },
      { id: 'status', label: 'Status' },
      { id: 'updatedAt', label: 'Created' },
    ],
    formFields: [
      { id: 'title', label: 'Filename', type: 'text' },
      { id: 'subtitle', label: 'MIME type', type: 'text' },
      { id: 'status', label: 'Status', type: 'text' },
    ],
  },
  {
    key: 'logs',
    title: 'Audit Logs',
    description: 'System events, actions, and operator-visible audit data.',
    icon: ChartColumnIncreasing,
    columns: [
      { id: 'title', label: 'Action' },
      { id: 'subtitle', label: 'Summary' },
      { id: 'status', label: 'Status' },
      { id: 'updatedAt', label: 'Created' },
    ],
    formFields: [
      { id: 'title', label: 'Action', type: 'text' },
      { id: 'subtitle', label: 'Summary', type: 'textarea' },
      { id: 'status', label: 'Status', type: 'text' },
    ],
  },
]

export function getResourceDefinition(resourceKey: string) {
  return resourceRegistry.find((resource) => resource.key === resourceKey)
}
