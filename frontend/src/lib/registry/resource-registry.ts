import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  ChartColumnIncreasing,
  ClipboardList,
  FileStack,
  Shield,
  Users,
} from 'lucide-react'

import { i18n } from '@/lib/i18n'
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

function buildRegistry(isZh: boolean): ResourceDefinition[] {
  return [
    {
      key: 'analyses',
      title: isZh ? '分析会话' : 'Analysis Sessions',
      description: isZh ? '通过后端资源注册表暴露出的结构化分析会话。' : 'Structured analysis sessions exposed through the backend registry.',
      icon: ClipboardList,
      columns: [
        { id: 'title', label: isZh ? '问题' : 'Problem' },
        { id: 'subtitle', label: isZh ? '模式' : 'Mode' },
        { id: 'status', label: isZh ? '状态' : 'Status' },
        { id: 'updatedAt', label: isZh ? '更新时间' : 'Updated' },
      ],
      formFields: [
        { id: 'title', label: isZh ? '问题描述' : 'Problem statement', type: 'textarea', placeholder: isZh ? '请描述你的决策问题' : 'Describe the decision' },
        {
          id: 'status',
          label: isZh ? '状态' : 'Status',
          type: 'select',
          options: [
            { label: isZh ? '待补充信息' : 'Clarifying', value: 'CLARIFYING' },
            { label: isZh ? '分析中' : 'Analyzing', value: 'ANALYZING' },
            { label: isZh ? '已完成' : 'Completed', value: 'COMPLETED' },
          ],
        },
      ],
    },
    {
      key: 'users',
      title: isZh ? '用户' : 'Users',
      description: isZh ? '通过通用 CRUD 生成器接入的用户资源。' : 'Users routed through the generic CRUD generator.',
      icon: Users,
      columns: [
        { id: 'title', label: isZh ? '姓名' : 'Name' },
        { id: 'subtitle', label: 'Email' },
        { id: 'status', label: isZh ? '角色' : 'Roles' },
        { id: 'updatedAt', label: isZh ? '最近活跃' : 'Last active' },
      ],
      formFields: [
        { id: 'title', label: isZh ? '显示名称' : 'Display name', type: 'text' },
        { id: 'subtitle', label: 'Email', type: 'text' },
        { id: 'status', label: isZh ? '角色' : 'Roles', type: 'text' },
      ],
    },
    {
      key: 'roles',
      title: isZh ? '角色' : 'Roles',
      description: isZh ? '用于 RBAC 和管理映射的角色定义。' : 'Role definitions for RBAC and admin mapping.',
      icon: Shield,
      columns: [
        { id: 'title', label: isZh ? '角色' : 'Role' },
        { id: 'subtitle', label: isZh ? '说明' : 'Description' },
        { id: 'status', label: isZh ? '成员数' : 'Members' },
        { id: 'updatedAt', label: isZh ? '更新时间' : 'Updated' },
      ],
      formFields: [
        { id: 'title', label: isZh ? '角色名称' : 'Role name', type: 'text' },
        { id: 'subtitle', label: isZh ? '说明' : 'Description', type: 'textarea' },
        { id: 'status', label: isZh ? '状态' : 'Status', type: 'text', placeholder: isZh ? '例如：active' : 'e.g. active' },
      ],
    },
    {
      key: 'notifications',
      title: isZh ? '通知' : 'Notifications',
      description: isZh ? '运行提醒和面向用户的推送消息。' : 'Operational alerts and end-user push messages.',
      icon: Bell,
      columns: [
        { id: 'title', label: isZh ? '标题' : 'Title' },
        { id: 'subtitle', label: isZh ? '内容' : 'Message' },
        { id: 'status', label: isZh ? '已读状态' : 'Read state' },
        { id: 'updatedAt', label: isZh ? '创建时间' : 'Created' },
      ],
      formFields: [
        { id: 'title', label: isZh ? '标题' : 'Title', type: 'text' },
        { id: 'subtitle', label: isZh ? '内容' : 'Message', type: 'textarea' },
        {
          id: 'status',
          label: isZh ? '状态' : 'Status',
          type: 'select',
          options: [
            { label: isZh ? '未读' : 'Unread', value: 'unread' },
            { label: isZh ? '已读' : 'Read', value: 'read' },
          ],
        },
      ],
    },
    {
      key: 'files',
      title: isZh ? '文件' : 'Files',
      description: isZh ? '在文件中心中暴露的可上传产物。' : 'Uploadable artifacts surfaced through the file manager.',
      icon: FileStack,
      columns: [
        { id: 'title', label: isZh ? '文件名' : 'Filename' },
        { id: 'subtitle', label: 'MIME' },
        { id: 'status', label: isZh ? '状态' : 'Status' },
        { id: 'updatedAt', label: isZh ? '创建时间' : 'Created' },
      ],
      formFields: [
        { id: 'title', label: isZh ? '文件名' : 'Filename', type: 'text' },
        { id: 'subtitle', label: isZh ? 'MIME 类型' : 'MIME type', type: 'text' },
        { id: 'status', label: isZh ? '状态' : 'Status', type: 'text' },
      ],
    },
    {
      key: 'logs',
      title: isZh ? '审计日志' : 'Audit Logs',
      description: isZh ? '系统事件、操作行为和可追踪的审计数据。' : 'System events, actions, and operator-visible audit data.',
      icon: ChartColumnIncreasing,
      columns: [
        { id: 'title', label: isZh ? '动作' : 'Action' },
        { id: 'subtitle', label: isZh ? '摘要' : 'Summary' },
        { id: 'status', label: isZh ? '状态' : 'Status' },
        { id: 'updatedAt', label: isZh ? '创建时间' : 'Created' },
      ],
      formFields: [
        { id: 'title', label: isZh ? '动作' : 'Action', type: 'text' },
        { id: 'subtitle', label: isZh ? '摘要' : 'Summary', type: 'textarea' },
        { id: 'status', label: isZh ? '状态' : 'Status', type: 'text' },
      ],
    },
  ]
}

export function getResourceDefinition(resourceKey: string) {
  const isZh = i18n.language.startsWith('zh')
  return buildRegistry(isZh).find((resource) => resource.key === resourceKey)
}
