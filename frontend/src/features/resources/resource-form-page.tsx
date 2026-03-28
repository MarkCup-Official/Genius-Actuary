import { useMutation, useQuery } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { getResourceDefinition } from '@/lib/registry/resource-registry'

export function ResourceFormPage() {
  const navigate = useNavigate()
  const { resourceKey = '', recordId } = useParams()
  const adapter = useApiAdapter()
  const definition = getResourceDefinition(resourceKey)

  const recordQuery = useQuery({
    queryKey: ['resources', resourceKey, recordId, 'form'],
    queryFn: () => adapter.resources.getById(resourceKey, recordId!),
    enabled: Boolean(definition && recordId),
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

  if (!definition) {
    return null
  }

  const initialValues = definition.formFields.reduce<Record<string, string>>((accumulator, field) => {
    accumulator[field.id] = String(recordQuery.data?.[field.id] ?? '')
    return accumulator
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Generated form"
        title={recordId ? `Edit ${definition.title}` : `Create ${definition.title}`}
        description="Resource forms are generated from the registry so future backend resources can be added with minimal custom code."
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
                  <label className="text-sm text-text-secondary">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      name={field.id}
                      placeholder={field.placeholder}
                      value={values[field.id]}
                      onChange={handleChange}
                    />
                  ) : field.type === 'select' ? (
                    <Select name={field.id} value={values[field.id]} onChange={handleChange}>
                      <option value="">Select an option</option>
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
                <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                  Save resource
                </Button>
                <Button variant="secondary" type="button" onClick={() => void navigate(-1)}>
                  Back
                </Button>
              </div>
            </Card>
          </Form>
        )}
      </Formik>
    </div>
  )
}
