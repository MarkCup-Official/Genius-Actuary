import { useMutation, useQuery } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { getResourceDefinition } from '@/lib/registry/resource-registry'

export function ResourceFormPage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { resourceKey = '', recordId } = useParams()
  const adapter = useApiAdapter()
  const definition = getResourceDefinition(resourceKey)
  const isZh = i18n.language.startsWith('zh')
  const isHistoryPage = resourceKey === 'analyses'

  const recordQuery = useQuery({
    queryKey: ['resources', resourceKey, recordId, 'form'],
    queryFn: () => adapter.resources.getById(resourceKey, recordId!),
    enabled: Boolean(definition && recordId && !isHistoryPage),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      adapter.resources.save(resourceKey, {
        id: recordId,
        ...values,
      }),
    onSuccess: (record) => {
      void navigate(`/resources/${resourceKey}/${record.id}`)
    },
  })

  if (isHistoryPage) {
    return <Navigate to="/resources/analyses" replace />
  }

  if (!definition) {
    return null
  }

  const initialValues = definition.formFields.reduce<Record<string, string>>(
    (accumulator, field) => {
      accumulator[field.id] = String(recordQuery.data?.[field.id] ?? '')
      return accumulator
    },
    {},
  )

  const text = {
    eyebrow: isZh ? '通用表单' : 'Generated form',
    title: recordId
      ? isZh
        ? `编辑${definition.title}`
        : `Edit ${definition.title}`
      : isZh
        ? `新建${definition.title}`
        : `Create ${definition.title}`,
    description: isZh
      ? '资源表单来自注册表定义，因此未来新增后端资源时几乎不需要再写额外页面。'
      : 'Resource forms are generated from the registry so future backend resources can be added with minimal custom code.',
    selectOption: isZh ? '请选择一个选项' : 'Select an option',
    saveResource: isZh ? '保存资源' : 'Save resource',
    back: isZh ? '返回' : 'Back',
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />

      <Formik
        initialValues={initialValues}
        enableReinitialize
        onSubmit={async (values) => {
          await saveMutation.mutateAsync(values)
        }}
      >
        {({ values, handleChange, isSubmitting }) => (
          <Form>
            <Card className="space-y-4 p-6">
              {definition.formFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="text-text-secondary text-sm">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      name={field.id}
                      placeholder={field.placeholder}
                      value={values[field.id]}
                      onChange={handleChange}
                    />
                  ) : field.type === 'select' ? (
                    <Select
                      name={field.id}
                      value={values[field.id]}
                      onChange={handleChange}
                    >
                      <option value="">{text.selectOption}</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      name={field.id}
                      placeholder={field.placeholder}
                      value={values[field.id]}
                      onChange={handleChange}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || saveMutation.isPending}
                >
                  {text.saveResource}
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => void navigate(-1)}
                >
                  {text.back}
                </Button>
              </div>
            </Card>
          </Form>
        )}
      </Formik>
    </div>
  )
}
